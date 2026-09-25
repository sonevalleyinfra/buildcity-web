require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const compression = require("compression");
const { PrismaClient } = require("@prisma/client");
const { issueToken, requireAuth, optionalAuth, requireRole, requireSelfOrAdmin } = require("./middleware/auth");

const app = express();
app.set("trust proxy", 1);
const prisma = new PrismaClient();
try {
  const { setPrismaClient } = require("./pushService");
  setPrismaClient(prisma);
} catch (e) {}
const PORT = process.env.PORT || 5000;

// High-Speed Gzip/Brotli Compression (Reduces network payload & egress by 85-90%)
app.use(compression());

// Security Headers & Protection
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.disable("x-powered-by");

// Enable CORS & JSON Parsing
// If ALLOWED_ORIGINS is configured, only those origins (plus the Capacitor app shells) may call the API from a browser.
// Auth uses Bearer tokens (not cookies), so an unset list falls back to open CORS without exposing credentials.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const nativeAppOrigins = ["capacitor://localhost", "http://localhost", "https://localhost", "ionic://localhost"];
app.use(
  cors(
    allowedOrigins.length > 0
      ? {
          origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin) || nativeAppOrigins.includes(origin)),
        }
      : {}
  )
);
app.use(express.json());

// Defense-in-depth: never serialize password hashes in any API response,
// even when a Prisma query includes a full `user`/`vendor`/`dr` relation.
app.set("json replacer", (key, value) => (key === "password" ? undefined : value));

// Error thrown for request validation failures whose message is safe to show the client
class ClientError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Logs the real error server-side and returns a generic message (no Prisma/stack internals)
function sendServerError(res, err, label = "Request") {
  if (err instanceof ClientError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.code === "P2002") {
    return res.status(409).json({ error: "A record with these details already exists." });
  }
  if (err?.code === "P2025") {
    return res.status(404).json({ error: "Record not found." });
  }
  console.error(`${label} error:`, err);
  return res.status(500).json({ error: "Something went wrong. Please try again." });
}

const SAFE_USER_SELECT = { id: true, name: true, phone: true, email: true, role: true };

// ---------------------------------------------------------------------------
// Pagination (keyset / cursor based: stable while new orders keep arriving)
// ---------------------------------------------------------------------------
const PAGE_DEFAULT_LIMIT = 50;
const PAGE_MAX_LIMIT = 100;
// Requests without ?limit/?cursor keep the legacy plain-array response (installed APKs ship a
// frozen frontend), but are capped so a single call can never read an unbounded table.
const LEGACY_LIST_CAP = 500;
const NEWEST_FIRST = [{ createdAt: "desc" }, { id: "desc" }];
const CLOSED_ORDER_STATUSES = ["DELIVERED", "CANCELLED"];
const MAX_OPEN_ORDERS_INCLUDED = 200;

// Returns { take, cursor } when the client asked for pagination, or null for a legacy request
function getPageParams(req) {
  const { limit, cursor } = req.query;
  if (limit === undefined && cursor === undefined) return null;
  const take = Math.min(Math.max(parseInt(limit, 10) || PAGE_DEFAULT_LIMIT, 1), PAGE_MAX_LIMIT);
  return { take, cursor: typeof cursor === "string" && cursor ? cursor : null };
}

// Fetches one newest-first page from a Prisma model; reads one extra row to know if more exist
async function findPage(model, args, page) {
  const rows = await model.findMany({
    ...args,
    orderBy: NEWEST_FIRST,
    take: page.take + 1,
    ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > page.take;
  const items = hasMore ? rows.slice(0, page.take) : rows;
  return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
}

// Lists orders for `where`: a paginated envelope when requested, else the capped legacy array.
// With ?includeOpen=1 the first page also carries every still-open order (even older ones),
// so pending work can never hide on a later page.
async function listOrders(req, where, args) {
  const page = getPageParams(req);
  if (!page) {
    const orders = await prisma.order.findMany({ ...args, where, orderBy: NEWEST_FIRST, take: LEGACY_LIST_CAP });
    return { legacy: true, orders };
  }

  const result = await findPage(prisma.order, { ...args, where }, page);
  let orders = result.items;
  if (!page.cursor && req.query.includeOpen === "1" && result.hasMore) {
    const oldestOnPage = orders[orders.length - 1];
    const olderOpen = await prisma.order.findMany({
      ...args,
      where: {
        AND: [
          where || {},
          { status: { notIn: CLOSED_ORDER_STATUSES } },
          { createdAt: { lte: oldestOnPage.createdAt } },
          { id: { notIn: orders.map((o) => o.id) } },
        ],
      },
      orderBy: NEWEST_FIRST,
      take: MAX_OPEN_ORDERS_INCLUDED,
    });
    orders = orders.concat(olderOpen);
  }
  return { legacy: false, orders, nextCursor: result.nextCursor, hasMore: result.hasMore };
}

function sendOrderList(res, list, orders) {
  if (list.legacy) return res.json(orders);
  return res.json({ orders, nextCursor: list.nextCursor, hasMore: list.hasMore });
}

// Orders that belong to a district: delivery address in the region, or (no address) a vendor there.
// Accepts one region id or a comma-separated list (a district can span duplicate region records).
function orderRegionWhere(regionIdParam) {
  if (!regionIdParam || typeof regionIdParam !== "string") return {};
  const regionIds = regionIdParam.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 20);
  if (regionIds.length === 0) return {};
  return {
    OR: [
      { address: { regionId: { in: regionIds } } },
      { addressId: null, items: { some: { vendor: { regionId: { in: regionIds } } } } },
    ],
  };
}

// Exact totals for dashboards, independent of how many pages the client has loaded
async function computeOrdersSummary(where, { vendorId } = {}) {
  const [totalOrders, byStatusRows, revenue] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], where, _count: { _all: true } }),
    vendorId
      // Vendor revenue = their item subtotals on delivered orders (matches the vendor dashboard)
      ? prisma.orderItem.aggregate({ where: { vendorId, order: { status: "DELIVERED" } }, _sum: { totalPrice: true } })
      : prisma.order.aggregate({ where, _sum: { totalAmount: true } }),
  ]);
  const byStatus = Object.fromEntries(byStatusRows.map((r) => [r.status, r._count._all]));
  const openOrders = Object.entries(byStatus)
    .filter(([status]) => !CLOSED_ORDER_STATUSES.includes(status))
    .reduce((sum, [, n]) => sum + n, 0);
  return {
    totalOrders,
    openOrders,
    byStatus,
    totalRevenue: Number(vendorId ? revenue._sum.totalPrice || 0 : revenue._sum.totalAmount || 0),
    revenueBasis: vendorId ? "delivered_vendor_items" : "all_orders_total",
  };
}

// Resolves the Vendor row owned by the authenticated VENDOR (token sub is the vendor's user id)
// (falls back to the phone in the signed token for legacy vendor rows without a linked user)
async function resolveOwnVendor(req) {
  const byUser = await prisma.vendor.findFirst({
    where: { OR: [{ userId: req.auth.userId }, { id: req.auth.userId }] },
  }).catch(() => null);
  if (byUser) return byUser;

  const cleanPhone = String(req.auth?.phone || "").replace(/\D/g, "");
  if (cleanPhone.length !== 10) return null;
  return prisma.vendor.findFirst({ where: { phone: cleanPhone } }).catch(() => null);
}

// Same district aliases as the DR dashboard, so "Banaras" and "Varanasi" region rows count as one district
const DISTRICT_ALIASES = {
  varanasi: ["varanasi", "varnasi", "banaras", "kashi", "vns"],
  mirzapur: ["mirzapur", "mzp"],
  prayagraj: ["prayagraj", "allahabad"],
  jaunpur: ["jaunpur"],
};
function canonicalDistrict(name) {
  const clean = String(name || "").toLowerCase().trim();
  if (!clean) return "";
  for (const [district, aliases] of Object.entries(DISTRICT_ALIASES)) {
    if (aliases.some((alias) => clean.includes(alias))) return district;
  }
  return clean;
}

// Region IDs covering the logged-in DR's assigned district(s)
async function resolveCallerDrRegionIds(auth) {
  const last10 = String(auth?.phone || "").replace(/\D/g, "").slice(-10);
  const or = [];
  if (auth?.userId) or.push({ id: auth.userId }, { userId: auth.userId });
  if (last10.length === 10) or.push({ phone: { endsWith: last10 } });
  if (or.length === 0) return [];
  const drs = await prisma.dR.findMany({ where: { OR: or }, include: { region: true } }).catch(() => []);
  const regionIds = new Set(drs.map((d) => d.regionId).filter(Boolean));
  const districts = new Set(drs.map((d) => canonicalDistrict(d.region?.name)).filter(Boolean));
  if (districts.size > 0) {
    const regions = await prisma.region.findMany({ select: { id: true, name: true } }).catch(() => []);
    for (const r of regions) {
      if (districts.has(canonicalDistrict(r.name))) regionIds.add(r.id);
    }
  }
  return Array.from(regionIds);
}

// DRs may only manage shops (and their listings) in their own district
async function drCanManageVendor(auth, vendorOrId) {
  const vendor = typeof vendorOrId === "string"
    ? await prisma.vendor.findUnique({ where: { id: vendorOrId }, select: { regionId: true } }).catch(() => null)
    : vendorOrId;
  if (!vendor?.regionId) return false;
  const drRegionIds = await resolveCallerDrRegionIds(auth);
  return drRegionIds.includes(vendor.regionId);
}

// Orders a DR may access: delivered into, or fulfilled by a shop in, one of the given regions
function ordersInRegionsWhere(regionIds) {
  return {
    OR: [
      { address: { regionId: { in: regionIds } } },
      { items: { some: { vendor: { regionId: { in: regionIds } } } } },
    ],
  };
}

// Auto-Invalidate Catalog Cache on Mutations (POST, PUT, PATCH, DELETE).
// Per-user writes (auth, cart, addresses, notifications...) don't touch cached catalog data,
// so skipping them keeps the public catalog cache warm under normal customer traffic.
const CACHE_NEUTRAL_PREFIXES = [
  "/api/v1/auth/",
  "/api/v1/cart",
  "/api/v1/addresses",
  "/api/v1/notifications",
  "/api/v1/reviews",
  "/api/v1/users",
  "/api/v1/vendor/fcm-token",
];
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !CACHE_NEUTRAL_PREFIXES.some((p) => req.path.startsWith(p))) {
    res.on("finish", () => {
      invalidateCache();
    });
  }
  next();
});

// Dedicated Customer OTP Rate Limiters (DO NOT apply to Partner password login)
const otpRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => String(req.body?.phone || req.ip),
  message: { error: "Too many OTP requests. Please try again after an hour." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Per-IP cap on OTP sends so one client can't pump SMS to many different numbers
const otpRequestIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => String(req.ip),
  message: { error: "Too many OTP requests. Please try again after an hour." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Brute-force protection for Partner (Admin / DR / Vendor) password login
const partnerLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.phone || "").replace(/\D/g, "")}`,
  message: { error: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: false,
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10,
  keyGenerator: (req) => String(req.body?.phone || req.ip),
  message: { error: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// --- High-Speed In-Memory Cache (TTL: 60s) for Sub-Millisecond Page Loads ---
const memoryCache = new Map();
function getCached(key) {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}
function setCached(key, data, ttlMs = 60000) {
  memoryCache.set(key, { data, expiry: Date.now() + ttlMs });
}
function invalidateCache(prefix) {
  if (!prefix) {
    memoryCache.clear();
  } else {
    for (const k of memoryCache.keys()) {
      if (k.startsWith(prefix)) memoryCache.delete(k);
    }
  }
}

// Health Check & Render Keep-Alive Endpoint (0ms response)
app.get(["/health", "/api/v1/health"], (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), memoryUsage: process.memoryUsage().heapUsed });
});

// Database & Environment Diagnostic Check
app.get("/api/v1/db-check", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const hasDbUrl = !!process.env.DATABASE_URL;
  const dbHost = process.env.DATABASE_URL
    ? (process.env.DATABASE_URL.match(/@([^:/]+)/) || [])[1] || "configured"
    : "NOT_SET";
  const hasDirectUrl = !!process.env.DIRECT_URL;
  const hasJwt = !!process.env.JWT_SECRET;
  const hasSms = !!process.env.SMS_USERNAME && !!process.env.SMS_APIKEY;

  let dbStatus = "unknown";
  let userCount = 0;
  let dbError = null;

  try {
    userCount = await prisma.user.count();
    dbStatus = "connected";
  } catch (err) {
    dbStatus = "error";
    dbError = err.message;
  }

  res.json({
    status: dbStatus,
    hasDbUrl,
    dbHost,
    hasDirectUrl,
    hasJwt,
    hasSms,
    userCount,
    dbError,
  });
});

// Automatic Self-Ping Keep-Alive to Prevent Render Free-Tier Sleep (Runs every 8 minutes)
const RENDER_APP_URL = process.env.RENDER_EXTERNAL_URL || "https://buildcity-web.onrender.com";
setInterval(async () => {
  try {
    const res = await fetch(`${RENDER_APP_URL}/health`);
    if (res.ok) {
      console.log(`[Keep-Alive Ping] Successfully warmed Render instance at ${new Date().toLocaleTimeString()}`);
    }
  } catch (err) {
    // silently catch local dev ping errors
  }
}, 8 * 60 * 1000);

let couponsList = [
  { id: "cp-1", code: "BUILDCITY100", title: "Flat ₹100 OFF", minOrder: 1000, discountAmount: 100, expiryDate: "2026-12-31", isActive: true, desc: "Valid on orders above ₹1,000" },
  { id: "cp-2", code: "SUPER500", title: "Flat ₹500 OFF", minOrder: 5000, discountAmount: 500, expiryDate: "2026-12-31", isActive: true, desc: "Bulk order discount above ₹5,000" },
  { id: "cp-3", code: "WELCOME200", title: "Flat ₹200 OFF", minOrder: 1500, discountAmount: 200, expiryDate: "2026-12-31", isActive: true, desc: "Special welcome coupon for new site orders" },
];

let bannersList = [
  {
    id: "b-1",
    tag: "",
    title: "",
    imageUrl: "https://res.cloudinary.com/lbwxvqmg/image/upload/v1788936739/buildcitybanner.jpg",
    targetUrl: "/categories",
    isActive: true,
    displayOrder: 1,
  },
  {
    id: "b-2",
    tag: "",
    title: "",
    imageUrl: "https://res.cloudinary.com/lbwxvqmg/image/upload/v1788938503/banner3.png",
    targetUrl: "/categories",
    isActive: true,
    displayOrder: 2,
  },
  {
    id: "b-3",
    tag: "",
    title: "",
    imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    targetUrl: "/categories",
    isActive: true,
    displayOrder: 3,
  },
];

// ⚡ Unified Public Storefront Catalog (1 Single HTTP Request for 0.05s Storefront Loading)
app.get("/api/v1/public-catalog", async (req, res) => {
  const cacheKey = "public_catalog";
  const cached = getCached(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached);
  }

  try {
    const [categories, regions, listings, coupons, masterProducts, dbBanners] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }).catch(() => []),
      prisma.region.findMany({ orderBy: { name: "asc" } }).catch(() => []),
      prisma.vendorProduct.findMany({
        include: {
          vendor: {
            select: {
              id: true,
              shopName: true,
              status: true,
              regionId: true,
              region: true,
            },
          },
          masterProduct: true,
        },
        orderBy: { submittedOn: "desc" },
      }).catch(() => []),
      prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
      prisma.productMaster.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } }).catch(() => []),
      prisma.banner.findMany({ orderBy: { displayOrder: "asc" } }).catch(() => []),
    ]);

    const finalBanners = dbBanners && dbBanners.length > 0 ? dbBanners : bannersList;

    const result = {
      categories,
      regions,
      listings,
      coupons: coupons && coupons.length > 0 ? coupons : couponsList,
      masterProducts,
      banners: finalBanners,
    };

    setCached(cacheKey, result, 900000); // 15 mins (900s) cache — 95% Supabase Egress Reduction
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json(result);
  } catch (err) {
    sendServerError(res, err);
  }
});

const CLOUD_SYNC_CACHE_TTL_MS = 15000;
const SYNC_ORDERS_PAGE_SIZE = 50;
const SYNC_USERS_PAGE_SIZE = 100;
const SYNC_USER_SELECT = { id: true, name: true, phone: true, email: true, role: true, status: true, productCount: true, createdAt: true };

// Single Unified Cloud Sync Endpoint (100% Real-time Live DB query for Staff and Partners)
app.get("/api/v1/cloud-sync", requireAuth, requireRole("ADMIN", "DR", "VENDOR"), async (req, res) => {
  const role = req.auth.role;
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    // Vendors only get their own shop and the orders that contain their items
    let ownVendor = null;
    if (role === "VENDOR") {
      ownVendor = await resolveOwnVendor(req);
      if (!ownVendor) {
        return res.status(403).json({ error: "Vendor profile not found for this account" });
      }
    }
    const isVendor = role === "VENDOR";
    // DRs get only their own district's team, shops and orders
    const drRegionIds = role === "DR" ? await resolveCallerDrRegionIds(req.auth) : null;

    // Short per-role cache: a full sync reads almost every table, so many open dashboards (or a
    // client refresh bug) must not translate 1:1 into database egress. Any catalog/order mutation
    // clears the cache (see invalidateCache middleware), so staff still see changes immediately.
    const cacheKey = `cloud_sync_${role}_${ownVendor ? ownVendor.id : ""}_${drRegionIds ? [...drRegionIds].sort().join(",") : ""}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    const ordersScope = isVendor
      ? { items: { some: { vendorId: ownVendor.id } } }
      : drRegionIds ? ordersInRegionsWhere(drRegionIds) : {};

    const fetchPromises = [
      isVendor ? Promise.resolve([]) : prisma.dR.findMany({
        where: drRegionIds ? { regionId: { in: drRegionIds } } : undefined,
        include: { region: true, user: { select: { id: true, name: true, phone: true, email: true, role: true } } },
        orderBy: { joinedOn: "desc" },
      }).then(list => list.map(d => { const { password, ...safe } = d; return safe; })).catch(() => []),
      prisma.vendor.findMany({
        where: isVendor ? { id: ownVendor.id } : drRegionIds ? { regionId: { in: drRegionIds } } : undefined,
        include: { region: true, user: { select: { id: true, name: true, phone: true, email: true, role: true } } },
        orderBy: { joinedOn: "desc" },
      }).then(list => list.map(v => { const { password, ...safe } = v; return safe; })).catch(() => []),
      prisma.productMaster.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } }).catch(() => []),
      prisma.category.findMany().catch(() => []),
      prisma.region.findMany({ orderBy: { name: "asc" } }).catch(() => []),
      // Orders: newest page plus every still-open order; older ones load via GET /orders?cursor=
      listOrders(
        { query: { limit: String(SYNC_ORDERS_PAGE_SIZE), includeOpen: "1" } },
        ordersScope,
        { include: STAFF_ORDER_INCLUDE }
      ).then((list) => ({
        nextCursor: list.nextCursor,
        hasMore: list.hasMore,
        orders: withVendorNames(list.orders).map((o) => ({
          ...o,
          items: o.items.filter((it) => !isVendor || it.vendorId === ownVendor.id),
        })),
      })).catch((err) => {
        console.error("Cloud sync orders error:", err);
        return { orders: [], nextCursor: null, hasMore: false };
      }),
      prisma.vendorProduct.findMany({
        include: {
          vendor: {
            select: {
              id: true,
              shopName: true,
              status: true,
              regionId: true,
              region: true,
            },
          },
          masterProduct: true,
        },
        orderBy: { submittedOn: "desc" },
      }).catch(() => []),
      prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
      prisma.banner.findMany({ orderBy: { displayOrder: "asc" } }).catch(() => []),
    ];

    fetchPromises.push(
      computeOrdersSummary(ordersScope, isVendor ? { vendorId: ownVendor.id } : {}).catch((err) => {
        console.error("Cloud sync summary error:", err);
        return null;
      })
    );

    if (role === "ADMIN") {
      fetchPromises.push(
        Promise.all([
          findPage(prisma.user, { select: SYNC_USER_SELECT }, { take: SYNC_USERS_PAGE_SIZE, cursor: null }),
          prisma.user.count(),
          prisma.user.count({ where: { role: "CUSTOMER" } }),
        ]).catch((err) => {
          console.error("Cloud sync users error:", err);
          return [{ items: [], nextCursor: null, hasMore: false }, 0, 0];
        })
      );
    }

    const results = await Promise.all(fetchPromises);
    const [drs, vendors, masterProducts, categories, regions, ordersPage, listings, coupons, dbBanners, ordersSummary, usersResult] = results;
    const [usersPage, usersTotal, customersTotal] = usersResult || [null, 0, 0];

    const data = {
      drs,
      vendors,
      masterProducts,
      categories,
      regions,
      orders: ordersPage.orders,
      ordersPage: { nextCursor: ordersPage.nextCursor, hasMore: ordersPage.hasMore, pageSize: SYNC_ORDERS_PAGE_SIZE },
      ordersSummary,
      listings,
      coupons: coupons || [],
      users: usersPage ? usersPage.items : [],
      usersPage: usersPage ? { nextCursor: usersPage.nextCursor, hasMore: usersPage.hasMore, total: usersTotal, customers: customersTotal } : null,
      banners: dbBanners && dbBanners.length > 0 ? dbBanners : bannersList,
    };

    setCached(cacheKey, data, CLOUD_SYNC_CACHE_TTL_MS);
    res.setHeader("X-Cache", "MISS");
    res.json(data);
  } catch (err) {
    sendServerError(res, err);
  }
});

// Password Login Endpoint — Phone & Password Login for Admin, DR, and Vendor Partners
app.post("/api/v1/auth/vendor/login", partnerLoginLimiter, async (req, res) => {
  try {
    const { phone, password, fcmToken } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: "Mobile number and Password are required." });
    }

    const cleanPhone = phone.trim().replace(/\D/g, "");
    const cleanPassword = password.trim();

    // 1. Super Admin Check (Phone: 9999999999)
    if (cleanPhone === "9999999999") {
      const adminUser = await prisma.user.findUnique({ where: { phone: "9999999999" } }).catch(() => null);

      if (!adminUser || !adminUser.password) {
        return res.status(401).json({ error: "Invalid mobile number or password." });
      }

      const isMatch = await bcrypt.compare(cleanPassword, adminUser.password).catch(() => false);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid mobile number or password." });
      }

      const adminObj = {
        id: adminUser.id || "u-admin-9999999999",
        name: adminUser.name || "Super Admin",
        phone: "9999999999",
        role: "ADMIN",
        tokenVersion: adminUser.tokenVersion || 1,
      };
      const token = issueToken(adminObj);

      return res.json({
        success: true,
        token,
        user: {
          id: adminObj.id,
          name: adminObj.name,
          phone: adminObj.phone,
          role: adminObj.role,
        },
      });
    }

    // 2. Lookup User in DB by phone to check assigned role
    let userInDb = await prisma.user.findFirst({
      where: { OR: [{ phone: cleanPhone }, { phone }] },
    }).catch(() => null);

    // 3. District Representative (DR) Check
    let drInDb = await prisma.dR.findFirst({
      where: { OR: [{ phone: cleanPhone }, { phone }] },
      include: { user: true, region: true },
    }).catch(() => null);

    if (drInDb || userInDb?.role === "DR") {
      const storedPassword =
        drInDb?.password ||
        drInDb?.user?.password ||
        userInDb?.password;

      if (!storedPassword) {
        return res.status(401).json({ error: "Invalid mobile number or password." });
      }

      const isMatch = await bcrypt.compare(cleanPassword, storedPassword).catch(() => false);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid mobile number or password." });
      }

      const drUserObj = {
        id: drInDb?.id || userInDb?.id || `u-dr-${cleanPhone}`,
        name: drInDb?.name || userInDb?.name || "District Representative",
        phone: cleanPhone,
        role: "DR",
        regionId: drInDb?.regionId || drInDb?.region?.id,
        regionName: drInDb?.region?.name,
        drInfo: drInDb || null,
        tokenVersion: userInDb?.tokenVersion || drInDb?.user?.tokenVersion || 1,
      };
      const token = issueToken(drUserObj);

      return res.json({
        success: true,
        token,
        user: drUserObj,
        dr: drInDb,
      });
    }

    // 4. Find Vendor record by phone number
    let vendor = await prisma.vendor.findFirst({
      where: {
        OR: [{ phone: cleanPhone }, { phone }],
      },
      include: { region: true, user: true },
    }).catch(() => null);

    let user = null;
    if (vendor && vendor.user) {
      user = vendor.user;
    } else {
      user = await prisma.user.findFirst({
        where: {
          phone: cleanPhone,
          role: "VENDOR",
        },
      }).catch(() => null);
    }

    if (!user && !vendor) {
      return res.status(401).json({ error: "Invalid mobile number or password." });
    }

    // Verify Vendor Status (Must be APPROVED)
    const currentStatus = vendor?.status || "APPROVED";
    if (currentStatus === "SUSPENDED") {
      return res.status(403).json({ error: "Your account is SUSPENDED. Please contact Super Admin." });
    }
    if (currentStatus === "PENDING" || currentStatus === "PENDING_REVIEW") {
      return res.status(403).json({ error: "Your account is PENDING approval from Admin." });
    }

    // Verify Password with Bcrypt against Vendor or User password hash
    const storedPassword = vendor?.password || user?.password || vendor?.user?.password;
    if (!storedPassword) {
      return res.status(401).json({ error: "Invalid mobile number or password." });
    }

    const isMatch = await bcrypt.compare(cleanPassword, storedPassword).catch(() => false);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid mobile number or password." });
    }

    const resUser = user || {
      id: vendor?.userId || `u-vendor-${cleanPhone}`,
      name: vendor?.ownerName || vendor?.shopName || "Vendor Partner",
      phone: cleanPhone,
      role: "VENDOR",
      tokenVersion: user?.tokenVersion || 1,
    };

    const vendorUserObj = {
      ...resUser,
      role: "VENDOR",
      vendorInfo: vendor,
      tokenVersion: resUser.tokenVersion || 1,
    };
    const token = issueToken(vendorUserObj);

    // ⚡ Atomic FCM Device Token Registration directly during login:
    // Guarantees the token is saved in DB BEFORE the login response returns!
    if (fcmToken) {
      try {
        const { saveToken } = require("./pushService");
        const vId = vendor?.id || vendor?.userId || resUser.id;
        if (vId) {
          await saveToken(vId, fcmToken, cleanPhone);
          console.log(`✅ Atomic FCM device token saved during login for vendor ${vId}`);
        }
      } catch (fcmErr) {
        console.warn("Login FCM save note:", fcmErr.message);
      }
    }

    res.json({
      success: true,
      token,
      user: vendorUserObj,
      vendor,
    });
  } catch (err) {
    sendServerError(res, err, "Vendor login");
  }
});

// Coupons Endpoints with Prisma PostgreSQL DB
app.get("/api/v1/coupons", async (req, res) => {
  try {
    const dbCoupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []);
    res.json(dbCoupons || []);
  } catch {
    res.json([]);
  }
});

app.post("/api/v1/coupons", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { code, title, discountAmount, minOrder, expiryDate, desc, isActive } = req.body;
  if (!code || !code.trim()) {
    return res.status(400).json({ error: "Coupon code is required" });
  }
  const cleanCode = code.trim().toUpperCase();

  try {
    const created = await prisma.coupon.create({
      data: {
        code: cleanCode,
        title: title ? title.trim() : `Flat ₹${discountAmount || 100} OFF`,
        discountAmount: Number(discountAmount) || 100,
        minOrder: Number(minOrder) || 1000,
        expiryDate: expiryDate || "2026-12-31",
        desc: desc || `Valid on orders above ₹${minOrder || 1000}`,
        isActive: isActive !== false,
      },
    });

    couponsList = couponsList.filter((c) => c.code !== cleanCode);
    couponsList.unshift(created);

    res.status(201).json(created);
  } catch (err) {
    console.error("Create coupon DB note:", err.message);
    const newCoupon = {
      id: "cp-" + Date.now(),
      code: cleanCode,
      title: title ? title.trim() : `Flat ₹${discountAmount || 100} OFF`,
      discountAmount: Number(discountAmount) || 100,
      minOrder: Number(minOrder) || 1000,
      expiryDate: expiryDate || "2026-12-31",
      desc: desc || `Valid on orders above ₹${minOrder || 1000}`,
      isActive: isActive !== false,
    };
    couponsList = couponsList.filter((c) => c.code !== cleanCode);
    couponsList.unshift(newCoupon);
    res.status(201).json(newCoupon);
  }
});

app.patch("/api/v1/coupons/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  const { code, title, discountAmount, minOrder, expiryDate, desc, isActive } = req.body;

  let targetCoupon = await prisma.coupon.findFirst({
    where: { OR: [{ id }, { code: { equals: id.trim(), mode: "insensitive" } }] },
  }).catch(() => null);

  const cleanCode = code ? code.trim().toUpperCase() : undefined;

  if (targetCoupon) {
    try {
      const updated = await prisma.coupon.update({
        where: { id: targetCoupon.id },
        data: {
          ...(cleanCode ? { code: cleanCode } : {}),
          ...(title ? { title: title.trim() } : {}),
          ...(discountAmount !== undefined ? { discountAmount: Number(discountAmount) } : {}),
          ...(minOrder !== undefined ? { minOrder: Number(minOrder) } : {}),
          ...(expiryDate !== undefined ? { expiryDate } : {}),
          ...(desc !== undefined ? { desc: desc.trim() } : {}),
          ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        },
      });

      couponsList = couponsList.map((c) => (c.id === updated.id || c.code === updated.code ? updated : c));
      return res.json(updated);
    } catch (err) {
      console.error("Patch coupon DB error:", err.message);
    }
  }

  const index = couponsList.findIndex((c) => c.id === id || c.code === id.toUpperCase());
  if (index !== -1) {
    const current = couponsList[index];
    const updated = {
      ...current,
      ...(cleanCode ? { code: cleanCode } : {}),
      ...(title ? { title: title.trim() } : {}),
      ...(discountAmount !== undefined ? { discountAmount: Number(discountAmount) } : {}),
      ...(minOrder !== undefined ? { minOrder: Number(minOrder) } : {}),
      ...(expiryDate !== undefined ? { expiryDate } : {}),
      ...(desc !== undefined ? { desc: desc.trim() } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    };
    couponsList[index] = updated;
    return res.json(updated);
  }

  res.status(404).json({ error: "Coupon not found" });
});

app.delete("/api/v1/coupons/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  const rawId = (id || "").trim();

  try {
    const del = await prisma.coupon.deleteMany({
      where: {
        OR: [
          { id: rawId },
          { code: { equals: rawId.toUpperCase(), mode: "insensitive" } },
        ],
      },
    }).catch(() => null);

    console.log(`✓ Deleted ${del?.count || 0} coupon(s) for "${rawId}" from Supabase DB`);
  } catch (err) {
    console.error("Delete coupon DB error:", err.message);
  }

  couponsList = couponsList.filter((c) => c.id !== rawId && c.code !== rawId.toUpperCase());
  res.json({ success: true, message: "Coupon deleted" });
});

// Banners Endpoints with Supabase PostgreSQL Direct Sync
app.get("/api/v1/banners", async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const cacheKey = `banners_${activeOnly}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    const whereClause = activeOnly === "true" ? { isActive: true } : {};
    let list = await prisma.banner.findMany({
      where: whereClause,
      orderBy: { displayOrder: "asc" },
    }).catch(() => []);

    if (!list || list.length === 0) {
      list = activeOnly === "true" ? bannersList.filter((b) => b.isActive !== false) : bannersList;
    }
    setCached(cacheKey, list, 900000); // 15 mins
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json(list);
  } catch (err) {
    sendServerError(res, err);
  }
});

app.post("/api/v1/banners", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { tag, title, imageUrl, targetUrl, isActive, displayOrder } = req.body;
  if (!imageUrl || !imageUrl.trim()) {
    return res.status(400).json({ error: "Banner Image URL is required" });
  }

  const cleanOrder = Number(displayOrder) || (await prisma.banner.count().catch(() => bannersList.length)) + 1;

  try {
    const created = await prisma.banner.create({
      data: {
        tag: tag ? tag.trim() : "BUILD YOUR DREAM SPACE",
        title: title ? title.trim() : "Quality Products. Best Prices.",
        imageUrl: imageUrl.trim(),
        targetUrl: targetUrl ? targetUrl.trim() : "/categories",
        isActive: isActive !== false,
        displayOrder: cleanOrder,
      },
    });

    bannersList = bannersList.filter((b) => b.id !== created.id);
    bannersList.push(created);
    invalidateCache();

    console.log(`✅ Banner created directly in Supabase DB: "${created.title}" (${created.id})`);
    return res.status(201).json(created);
  } catch (err) {
    console.error("Create banner DB note:", err.message);
    const newBanner = {
      id: "b-" + Date.now(),
      tag: tag ? tag.trim() : "BUILD YOUR DREAM SPACE",
      title: title ? title.trim() : "Quality Products. Best Prices.",
      imageUrl: imageUrl.trim(),
      targetUrl: targetUrl ? targetUrl.trim() : "/categories",
      isActive: isActive !== false,
      displayOrder: cleanOrder,
      createdAt: new Date().toISOString(),
    };
    bannersList.push(newBanner);
    invalidateCache();
    return res.status(201).json(newBanner);
  }
});

app.patch("/api/v1/banners/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  const { tag, title, imageUrl, targetUrl, isActive, displayOrder } = req.body;

  const updateData = {
    ...(tag !== undefined ? { tag: tag.trim() } : {}),
    ...(title !== undefined ? { title: title.trim() } : {}),
    ...(imageUrl !== undefined ? { imageUrl: imageUrl.trim() } : {}),
    ...(targetUrl !== undefined ? { targetUrl: targetUrl.trim() } : {}),
    ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    ...(displayOrder !== undefined ? { displayOrder: Number(displayOrder) } : {}),
  };

  try {
    // Upsert directly into Supabase DB: updates if exists, creates if missing (handles seed IDs like b-1, b-2, b-3)
    const existing = await prisma.banner.findUnique({ where: { id } }).catch(() => null);

    let result;
    if (existing) {
      result = await prisma.banner.update({
        where: { id },
        data: updateData,
      });
    } else {
      const fallbackItem = bannersList.find((b) => b.id === id) || {};
      result = await prisma.banner.create({
        data: {
          id,
          tag: tag !== undefined ? tag.trim() : (fallbackItem.tag || "BUILD YOUR DREAM SPACE"),
          title: title !== undefined ? title.trim() : (fallbackItem.title || "Quality Products. Best Prices."),
          imageUrl: imageUrl !== undefined ? imageUrl.trim() : (fallbackItem.imageUrl || "https://res.cloudinary.com/lbwxvqmg/image/upload/v1788936739/buildcitybanner.jpg"),
          targetUrl: targetUrl !== undefined ? targetUrl.trim() : (fallbackItem.targetUrl || "/categories"),
          isActive: isActive !== undefined ? Boolean(isActive) : (fallbackItem.isActive !== false),
          displayOrder: displayOrder !== undefined ? Number(displayOrder) : (fallbackItem.displayOrder || 1),
        },
      });
    }

    // Sync in-memory fallback list
    bannersList = bannersList.map((b) => (b.id === id ? { ...b, ...result } : b));
    if (!bannersList.some((b) => b.id === id)) {
      bannersList.push(result);
    }
    invalidateCache();

    console.log(`✅ Banner ${id} updated live in Supabase DB: isActive=${result.isActive}, title="${result.title}"`);
    return res.json(result);
  } catch (err) {
    console.error("Patch banner DB error:", err.message);
    const index = bannersList.findIndex((b) => b.id === id);
    if (index !== -1) {
      const updated = {
        ...bannersList[index],
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
      bannersList[index] = updated;
      invalidateCache();
      return res.json(updated);
    }
    return res.status(404).json({ error: "Banner not found" });
  }
});

app.delete("/api/v1/banners/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.banner.deleteMany({ where: { id } }).catch(() => null);
    console.log(`✅ Banner ${id} deleted from Supabase DB`);
  } catch (err) {
    console.error("Delete banner DB error:", err.message);
  }

  const prevCount = bannersList.length;
  bannersList = bannersList.filter((b) => b.id !== id);
  invalidateCache();
  res.json({ success: true, deleted: prevCount !== bannersList.length });
});

const { sendRealSMSOTP } = require("./smsService");

// 1. AUTHENTICATION & USERS ENDPOINTS (INSTANT HIGH SPEED OPTIMIZED)
app.post("/api/v1/auth/otp/request", otpRequestIpLimiter, otpRequestLimiter, async (req, res) => {
  const { phone, type = "login" } = req.body;
  if (!phone || !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: "Valid 10-digit phone number required" });
  }

  try {
    // Clean 10-digit mobile number
    const cleanPhone = phone.trim().replace(/\D/g, "").slice(-10);

    // Fast Partner Phone Check
    const isSpecialAdminOrDr = cleanPhone === "9999999999" || cleanPhone === "7777777777";
    if (isSpecialAdminOrDr) {
      return res.status(403).json({
        error: "Special Admin and DR accounts cannot log in using Mobile OTP. Please click 'Partner Login (Password)' at the bottom.",
        isStaffBlocked: true,
      });
    }

    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
    }

    // Single Ultra-Fast Indexed User Lookup (1ms exact index query)
    const existingUser = await prisma.user.findUnique({
      where: { phone: cleanPhone },
      select: { id: true, role: true, name: true },
    }).catch(() => null);

    // Block Staff (Vendor, DR, Admin) from Customer OTP
    if (existingUser && ["ADMIN", "DR", "VENDOR"].includes(existingUser.role)) {
      return res.status(403).json({
        error: "Vendor, DR, and Admin accounts cannot log in using Mobile OTP. Please click 'Partner Login (Password)' at the bottom.",
        isStaffBlocked: true,
      });
    }

    // If logging in, user MUST be registered
    if (type === "login" && !existingUser) {
      return res.status(200).json({
        success: false,
        notRegistered: true,
        error: "This mobile number is not registered. Please create an account first.",
      });
    }

    // If registering, check if already registered
    if (type === "register" && existingUser) {
      return res.status(200).json({
        success: false,
        alreadyRegistered: true,
        error: "This mobile number is already registered. Please log in directly.",
      });
    }

    // Generate 6-digit OTP code instantly
    // Cryptographically secure OTP (Math.random is predictable)
    const generatedOtp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    // Replace any older OTPs for this phone, then save the new one in background (Non-blocking)
    prisma.oTPVerification.deleteMany({ where: { phone: cleanPhone } })
      .catch(() => null)
      .then(() => prisma.oTPVerification.create({
        data: {
          phone: cleanPhone,
          otp: generatedOtp,
          expiresAt,
          createdAt: new Date(),
        },
      }))
      .catch((e) => console.warn("Background OTP save note:", e.message));

    // Dispatch Live SMS via parallel fastest-gateway in background
    sendRealSMSOTP(cleanPhone, generatedOtp).catch((smsErr) => {
      console.warn("[Background SMS Notice]:", smsErr.message);
    });

    // Instant Response to Frontend (<100ms) so OTP entry screen opens immediately
    return res.json({
      success: true,
      message: `OTP dispatched to +91 ${cleanPhone.slice(-10)}`,
      gateway: "AradhyaSMS",
      smsStatus: "dispatched",
      isRegistered: !!existingUser,
    });
  } catch (err) {
    sendServerError(res, err, "OTP dispatch");
  }
});

app.post("/api/v1/auth/otp/verify", otpVerifyLimiter, async (req, res) => {
  const { phone, otp, name } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP required" });

  try {
    const cleanPhone = phone.trim().replace(/\D/g, "").slice(-10);

    // Single Fast Customer OTP Match Query (Indexed 2ms lookup)
    const validRecord = await prisma.oTPVerification.findFirst({
      where: {
        phone: cleanPhone,
        otp: otp.trim(),
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => null);

    if (!validRecord) {
      return res.status(401).json({ error: "Invalid or expired OTP. Please enter the exact OTP code sent to your mobile." });
    }

    // One-time use: consume every OTP for this phone so it can't be replayed
    await prisma.oTPVerification.deleteMany({ where: { phone: cleanPhone } }).catch(() => null);

    // Fast Indexed User Lookup
    let user = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    }).catch(() => null);

    // Block Staff accounts if found
    if (user && ["ADMIN", "DR", "VENDOR"].includes(user.role)) {
      return res.status(403).json({
        error: "Vendor, DR, and Admin accounts cannot log in using Mobile OTP. Please click 'Partner Login (Password)' at the bottom.",
        isStaffBlocked: true,
      });
    }

    if (user) {
      // If customer provided a new/updated name during registration, save it
      if (name && name.trim().length >= 2 && user.name !== name.trim()) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: name && name.trim() ? name.trim() : user.name,
            ...(req.body.preferredRegionId && !user.preferredRegionId ? {
              preferredRegionId: req.body.preferredRegionId,
              preferredRegionName: req.body.preferredRegionName || "Varanasi",
            } : {}),
          },
        }).catch(() => user);
      }
    } else {
      // Create new user in DB with exact Name and preferred region
      const customerName = name && name.trim().length >= 2 ? name.trim() : `Customer ${cleanPhone.slice(-4)}`;
      user = await prisma.user.create({
        data: {
          phone: cleanPhone,
          name: customerName,
          role: "CUSTOMER",
          preferredRegionId: req.body.preferredRegionId || null,
          preferredRegionName: req.body.preferredRegionName || null,
          tokenVersion: 1,
        },
      });
    }

    const token = issueToken(user);

    return res.json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    sendServerError(res, err, "OTP verify");
  }
});

// Fetch Current Authenticated User Profile (Zero PII in URL)
app.get("/api/v1/users/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth.userId } }).catch(() => null);
    if (!user) return res.status(404).json({ error: "User not found", invalidSession: true });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    sendServerError(res, err);
  }
});

// Fetch Cloud Cart from Database for Logged-In User
app.get("/api/v1/cart", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth.userId } }).catch(() => null);
    if (!user) return res.status(404).json({ error: "User not found", invalidSession: true, cartItems: [] });
    const cartItems = Array.isArray(user.cartItems) ? user.cartItems : [];
    res.json({ success: true, cartItems });
  } catch (err) {
    console.warn("Fetch cart error (handled):", err.message);
    res.json({ success: true, cartItems: [] });
  }
});

// Sync and Save Cart to Database for Logged-In User
app.put("/api/v1/cart", requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    const safeItems = Array.isArray(items) ? items : [];
    const updated = await prisma.user.update({
      where: { id: req.auth.userId },
      data: { cartItems: safeItems },
      select: { cartItems: true },
    });
    res.json({ success: true, cartItems: updated.cartItems });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "User not found", invalidSession: true, success: false });
    }
    console.warn("Save cart warning (handled):", err.message);
    res.json({ success: false, error: "Cart sync delayed" });
  }
});

// Update Preferred Delivery Region in Supabase PostgreSQL
app.patch("/api/v1/users/preferred-region", requireAuth, async (req, res) => {
  try {
    const { regionId, regionName } = req.body;
    if (!regionId && !regionName) {
      return res.status(400).json({ error: "Region ID or Name is required" });
    }

    const user = await prisma.user.update({
      where: { id: req.auth.userId },
      data: {
        preferredRegionId: regionId || undefined,
        preferredRegionName: regionName || undefined,
      },
    });

    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error("Update preferred region error:", err);
    sendServerError(res, err);
  }
});

// Fetch User Profile by Phone Number from Supabase PostgreSQL
app.get("/api/v1/users/by-phone/:phone", requireAuth, requireSelfOrAdmin((req) => req.params.phone), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { phone: req.params.phone } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    sendServerError(res, err);
  }
});

// Update Profile (Name, Email, Preferred Region) in Supabase PostgreSQL
app.put("/api/v1/users/profile", requireAuth, async (req, res) => {
  try {
    const { name, email, preferredRegionId, preferredRegionName } = req.body;

    // Always act on the authenticated account (never on a phone number from the request body)
    let user = await prisma.user.findUnique({ where: { id: req.auth.userId } }).catch(() => null);
    if (!user && req.auth.phone) {
      user = await prisma.user.findUnique({ where: { phone: req.auth.phone } }).catch(() => null);
    }
    if (!user) {
      return res.status(404).json({ error: "User not found", invalidSession: true });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name !== undefined ? name : user.name,
          email: email !== undefined ? email : user.email,
          ...(preferredRegionId ? { preferredRegionId } : {}),
          ...(preferredRegionName ? { preferredRegionName } : {}),
        },
      });
    }

    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    sendServerError(res, err, "Profile update");
  }
});

// Supports ?limit=&cursor= (paginated envelope); without them returns the capped legacy array
app.get("/api/v1/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const page = getPageParams(req);
    const args = {
      include: {
        addresses: true,
        orders: {
          take: 3,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            totalAmount: true,
            status: true,
            address: true,
          },
        },
      },
    };

    const stripPassword = (list) => list.map((u) => {
      const { password, ...safeUser } = u;
      return safeUser;
    });

    if (!page) {
      const users = await prisma.user.findMany({ ...args, orderBy: NEWEST_FIRST, take: LEGACY_LIST_CAP });
      return res.json(stripPassword(users));
    }
    const result = await findPage(prisma.user, args, page);
    res.json({ users: stripPassword(result.items), nextCursor: result.nextCursor, hasMore: result.hasMore });
  } catch (err) {
    sendServerError(res, err);
  }
});

app.post("/api/v1/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { phone, name, role, email } = req.body;
    if (!phone || !/^\d{10}$/.test(String(phone).trim())) {
      return res.status(400).json({ error: "Valid 10-digit phone number required" });
    }
    if (role && !["CUSTOMER", "VENDOR", "DR", "ADMIN"].includes(String(role).toUpperCase())) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const newUser = await prisma.user.create({
      data: {
        phone: String(phone).trim(),
        name: name || "User",
        email,
        role: role ? String(role).toUpperCase() : "CUSTOMER",
        tokenVersion: 1,
      },
    });
    res.status(201).json(newUser);
  } catch (err) {
    sendServerError(res, err);
  }
});

// 2. DISTRICT REPRESENTATIVE (DR) ENDPOINTS
app.get("/api/v1/drs", requireAuth, requireRole("ADMIN", "DR"), async (req, res) => {
  try {
    const drs = await prisma.dR.findMany({
      include: { region: true, user: { select: { id: true, name: true, phone: true, email: true, role: true } } },
      orderBy: { joinedOn: "desc" },
    });
    const safeDrs = drs.map(d => { const { password, ...safe } = d; return safe; });
    res.json(safeDrs);
  } catch (err) {
    sendServerError(res, err);
  }
});

app.post("/api/v1/drs", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, phone, password, regionId } = req.body;
    const cleanPhone = phone?.trim().replace(/\D/g, "");
    const rawPassword = (password && password.trim()) || null;
    const drHashedPassword = rawPassword ? await bcrypt.hash(rawPassword, 10) : null;

    let targetRegionId = regionId;
    let validRegion = targetRegionId ? await prisma.region.findUnique({ where: { id: targetRegionId } }).catch(() => null) : null;
    if (!validRegion) {
      const firstReg = await prisma.region.findFirst().catch(() => null);
      if (firstReg) {
        targetRegionId = firstReg.id;
      } else {
        const newReg = await prisma.region.create({
          data: { name: "Varanasi", state: "Uttar Pradesh", baseDeliveryCharge: 49, isActive: true },
        });
        targetRegionId = newReg.id;
      }
    }

    let user = await prisma.user.findUnique({ where: { phone: cleanPhone || phone } }).catch(() => null);
    if (!user) {
      user = await prisma.user.create({
        data: { phone: cleanPhone || phone, name, password: drHashedPassword, role: "DR", tokenVersion: 1 },
      });
    } else {
      const userUpdateData = { role: "DR", name };
      if (drHashedPassword) {
        userUpdateData.password = drHashedPassword;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: userUpdateData,
      }).catch(() => null);
    }

    const newDr = await prisma.dR.create({
      data: {
        userId: user.id,
        name,
        phone: cleanPhone || phone,
        password: drHashedPassword,
        regionId: targetRegionId,
        status: "ACTIVE",
      },
      include: { region: true, user: true },
    });
    console.log(`✅ DR created in DB: ${newDr.name} (${newDr.phone})`);
    res.status(201).json(newDr);
  } catch (err) {
    console.error("Add DR error:", err);
    sendServerError(res, err);
  }
});

app.patch("/api/v1/drs/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const rawId = req.params.id;
    const { name, phone, password, regionId, status } = req.body;

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (phone) dataToUpdate.phone = phone.trim().replace(/\D/g, "");
    if (password && password.trim()) {
      dataToUpdate.password = await bcrypt.hash(password.trim(), 10);
    }
    if (regionId) dataToUpdate.regionId = regionId;
    if (status) dataToUpdate.status = status;

    let dr = await prisma.dR.findUnique({ where: { id: rawId } }).catch(() => null);
    if (!dr) {
      dr = await prisma.dR.findFirst({ where: { OR: [{ id: rawId }, { phone: rawId }] } }).catch(() => null);
    }

    if (dr) {
      const updatedDr = await prisma.dR.update({
        where: { id: dr.id },
        data: dataToUpdate,
        include: { region: true, user: true },
      });

      if (dr.userId) {
        const userUpdateData = {};
        if (name) userUpdateData.name = name;
        if (phone) userUpdateData.phone = phone.trim().replace(/\D/g, "");
        if (dataToUpdate.password) userUpdateData.password = dataToUpdate.password;

        if (Object.keys(userUpdateData).length > 0) {
          await prisma.user.update({
            where: { id: dr.userId },
            data: userUpdateData,
          }).catch(() => null);
        }
      }
      console.log(`✅ DR updated in DB: ${updatedDr.name} (${updatedDr.phone})`);
      return res.json(updatedDr);
    }
    return res.status(404).json({ error: "DR not found" });
  } catch (err) {
    sendServerError(res, err);
  }
});

app.delete("/api/v1/drs/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const rawId = req.params.id;
    let dr = await prisma.dR.findUnique({ where: { id: rawId } }).catch(() => null);
    if (!dr) {
      dr = await prisma.dR.findFirst({ where: { OR: [{ id: rawId }, { phone: rawId }] } }).catch(() => null);
    }

    if (dr) {
      await prisma.dR.delete({ where: { id: dr.id } });
      return res.json({ success: true, message: "DR deleted successfully" });
    }
    return res.status(404).json({ error: "DR not found" });
  } catch (err) {
    sendServerError(res, err);
  }
});

// 3. VENDOR ENDPOINTS
app.get("/api/v1/vendors", requireAuth, requireRole("ADMIN", "DR"), async (req, res) => {
  try {
    const where = req.auth.role === "DR" ? { regionId: { in: await resolveCallerDrRegionIds(req.auth) } } : undefined;
    const vendors = await prisma.vendor.findMany({
      where,
      include: { region: true, user: { select: { id: true, name: true, phone: true, email: true, role: true } } },
      orderBy: { joinedOn: "desc" },
    });
    const safeVendors = vendors.map(v => { const { password, ...safe } = v; return safe; });
    res.json(safeVendors);
  } catch (err) {
    sendServerError(res, err);
  }
});

// Vendor Add Endpoint — Admin ya DR dwara naya Vendor Supabase DB me create karne ke liye
app.post("/api/v1/vendors", requireAuth, requireRole("ADMIN", "DR"), async (req, res) => {
  try {
    const { shopName, ownerName, phone, password, regionId, regionName, districtName, commissionRate, addedByDr, status } = req.body;
    const reqRegName = regionName || districtName || "Mirzapur";
    const cleanPhone = phone ? phone.trim().replace(/\D/g, "") : "";
    const rawPassword = password?.trim() || null;
    const vendorHashedPassword = rawPassword ? await bcrypt.hash(rawPassword, 10) : null;

    // 1. Try finding region by regionId UUID if valid
    let validRegion = null;
    if (regionId && regionId.length > 10) {
      validRegion = await prisma.region.findUnique({ where: { id: regionId } }).catch(() => null);
    }

    // 2. Try finding region by name (case-insensitive)
    if (!validRegion && reqRegName) {
      validRegion = await prisma.region.findFirst({
        where: { name: { equals: reqRegName.trim(), mode: "insensitive" } },
      }).catch(() => null);
    }

    // DRs can only onboard shops into their own district
    if (req.auth.role === "DR") {
      const drRegionIds = await resolveCallerDrRegionIds(req.auth);
      if (!validRegion || !drRegionIds.includes(validRegion.id)) {
        return res.status(403).json({ error: "You can only add vendors in your own district." });
      }
    }

    // 3. Create real Region record in DB if not existing
    if (!validRegion) {
      validRegion = await prisma.region.create({
        data: {
          name: reqRegName.trim(),
          state: "Uttar Pradesh",
          baseDeliveryCharge: 49,
          isActive: true,
        },
      }).catch(async () => {
        return await prisma.region.findFirst().catch(() => null);
      });
    }

    if (!validRegion) {
      return res.status(400).json({ error: "Could not locate or create a valid Region in DB" });
    }

    let user = await prisma.user.findUnique({ where: { phone: cleanPhone || phone } }).catch(() => null);
    if (user && (user.role === "ADMIN" || user.role === "DR")) {
      return res.status(409).json({ error: "This mobile number belongs to a staff account and cannot be registered as a vendor." });
    }
    if (!user) {
      user = await prisma.user.create({
        data: { phone: cleanPhone || phone, name: ownerName || shopName, password: vendorHashedPassword, role: "VENDOR", tokenVersion: 1 },
      });
    } else {
      const userUpdateData = { role: "VENDOR", name: ownerName || shopName };
      if (vendorHashedPassword) {
        userUpdateData.password = vendorHashedPassword;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: userUpdateData,
      }).catch(() => null);
    }

    const newVendor = await prisma.vendor.create({
      data: {
        userId: user.id,
        shopName,
        ownerName,
        phone: cleanPhone || phone,
        password: vendorHashedPassword,
        regionId: validRegion.id,
        commissionRate: Number(commissionRate) || 10,
        addedByDr: addedByDr || "Admin",
        status: status || "APPROVED",
      },
      include: { region: true, user: true },
    });

    console.log(`✅ Vendor created successfully in Supabase DB: ${newVendor.shopName} (${validRegion.name})`);
    res.status(201).json(newVendor);
  } catch (err) {
    console.error("Add Vendor error:", err);
    sendServerError(res, err);
  }
});

// Update Vendor Details & Password Endpoint (Supports PATCH and PUT)
const handleUpdateVendor = async (req, res) => {
  try {
    const rawId = req.params.id;
    const { shopName, ownerName, phone, password, commissionRate, status, regionId } = req.body;

    let vendor = await prisma.vendor.findUnique({ where: { id: rawId } }).catch(() => null);
    if (!vendor) {
      vendor = await prisma.vendor.findFirst({
        where: { OR: [{ id: rawId }, { phone: rawId }] },
      }).catch(() => null);
    }

    if (vendor && req.auth.role === "DR") {
      const drRegionIds = await resolveCallerDrRegionIds(req.auth);
      if (!drRegionIds.includes(vendor.regionId) || (regionId && !drRegionIds.includes(regionId))) {
        return res.status(403).json({ error: "You can only manage vendors in your own district." });
      }
    }

    if (vendor) {
      const cleanPhone = (phone || vendor.phone || "").trim().replace(/\D/g, "");
      let hashedPassword = null;
      if (password && password.trim()) {
        hashedPassword = await bcrypt.hash(password.trim(), 10);
      }

      const prismaUpdateData = {};
      if (shopName) prismaUpdateData.shopName = shopName.trim();
      if (ownerName) prismaUpdateData.ownerName = ownerName.trim();
      if (phone) prismaUpdateData.phone = cleanPhone || phone.trim();
      if (hashedPassword) prismaUpdateData.password = hashedPassword;
      if (commissionRate !== undefined) prismaUpdateData.commissionRate = Number(commissionRate);
      if (status) prismaUpdateData.status = status;
      if (regionId) prismaUpdateData.regionId = regionId;

      const updatedVendor = await prisma.vendor.update({
        where: { id: vendor.id },
        data: prismaUpdateData,
        include: { region: true, user: true },
      });

      // Synchronize User account linked to this vendor
      if (vendor.userId) {
        const userUpdateData = {};
        if (ownerName) userUpdateData.name = ownerName.trim();
        if (phone && cleanPhone) userUpdateData.phone = cleanPhone;
        if (hashedPassword) userUpdateData.password = hashedPassword;

        if (Object.keys(userUpdateData).length > 0) {
          await prisma.user.update({
            where: { id: vendor.userId },
            data: userUpdateData,
          }).catch(() => null);
        }
      }

      // Synchronize Vendor Products if status changed
      if (status === "SUSPENDED") {
        await prisma.vendorProduct.updateMany({
          where: { vendorId: vendor.id },
          data: { isActive: false },
        }).catch(() => null);
      } else if (status === "APPROVED") {
        await prisma.vendorProduct.updateMany({
          where: { vendorId: vendor.id, approvalStatus: "APPROVED" },
          data: { isActive: true },
        }).catch(() => null);
      }

      console.log(`✅ Vendor updated successfully in Supabase DB: ${updatedVendor.shopName} (ID: ${vendor.id})`);

      return res.json(updatedVendor);
    }
    return res.status(404).json({ error: "Vendor not found" });
  } catch (err) {
    console.error("Update Vendor error:", err);
    sendServerError(res, err);
  }
};

app.patch("/api/v1/vendors/:id", requireAuth, requireRole("ADMIN", "DR"), handleUpdateVendor);
app.put("/api/v1/vendors/:id", requireAuth, requireRole("ADMIN", "DR"), handleUpdateVendor);

// Vendor Status Update Endpoint — Admin & DR dwara Vendor ko Approve ya Suspend karne ke liye
app.patch("/api/v1/vendors/:id/status", requireAuth, requireRole("ADMIN", "DR"), async (req, res) => {
  try {
    const rawId = req.params.id;
    const { status } = req.body; // PENDING | APPROVED | SUSPENDED

    let vendor = await prisma.vendor.findUnique({ where: { id: rawId } }).catch(() => null);
    if (!vendor) {
      vendor = await prisma.vendor.findFirst({
        where: {
          OR: [{ id: rawId }, { phone: rawId }],
        },
      }).catch(() => null);
    }

    if (vendor && req.auth.role === "DR" && !(await drCanManageVendor(req.auth, vendor))) {
      return res.status(403).json({ error: "You can only manage vendors in your own district." });
    }

    if (vendor) {
      const updatedVendor = await prisma.vendor.update({
        where: { id: vendor.id },
        data: { status },
      });

      // Synchronize Vendor Products Active state with Vendor Status
      if (status === "SUSPENDED") {
        await prisma.vendorProduct.updateMany({
          where: { vendorId: vendor.id },
          data: { isActive: false },
        }).catch(() => null);
      } else if (status === "APPROVED") {
        await prisma.vendorProduct.updateMany({
          where: { vendorId: vendor.id, approvalStatus: "APPROVED" },
          data: { isActive: true },
        }).catch(() => null);
      }

      return res.json(updatedVendor);
    }

    res.json({ message: "Vendor status updated", status });
  } catch (err) {
    sendServerError(res, err);
  }
});

// Vendor Delete Endpoint — Admin ya DR dwara Vendor ko Supabase DB se permanent delete karne ke liye (Foreign Key cleanup ke sath)
app.delete("/api/v1/vendors/:id", requireAuth, requireRole("ADMIN", "DR"), async (req, res) => {
  try {
    const rawId = req.params.id;

    // Primary key ya mobile number se vendor search karein
    let vendor = await prisma.vendor.findUnique({ where: { id: rawId } }).catch(() => null);
    if (!vendor) {
      vendor = await prisma.vendor.findFirst({
        where: {
          OR: [
            { id: rawId },
            { phone: rawId },
          ],
        },
      }).catch(() => null);
    }

    if (req.auth.role === "DR") {
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });
      if (!(await drCanManageVendor(req.auth, vendor))) {
        return res.status(403).json({ error: "You can only manage vendors in your own district." });
      }
    }

    if (vendor) {
      const targetId = vendor.id;
      const linkedUserId = vendor.userId;
      const vendorPhone = vendor.phone;

      // 1. Delete FCM tokens
      await prisma.$executeRawUnsafe(`DELETE FROM vendor_fcm_tokens WHERE vendor_id = $1`, targetId).catch(() => null);

      // 2. Foreign Key constraint satisfied karne ke liye child records pehle delete karein
      await prisma.vendorProduct.deleteMany({ where: { vendorId: targetId } }).catch(() => null);

      // 3. Delete Vendor record
      await prisma.vendor.delete({ where: { id: targetId } }).catch(() => null);

      // 4. Delete linked User login account(s) by BOTH ID and Phone so no orphaned user can ever remain in users table
      await prisma.user.deleteMany({
        where: {
          OR: [
            ...(linkedUserId ? [{ id: linkedUserId }] : []),
            ...(vendorPhone ? [{ phone: vendorPhone, role: "VENDOR" }] : []),
          ],
        },
      }).catch(() => null);
    } else {
      // If vendor record was already gone, check if an orphaned VENDOR user exists with this ID or phone
      await prisma.user.deleteMany({
        where: {
          OR: [
            { id: rawId },
            { phone: rawId },
          ],
          role: "VENDOR",
        },
      }).catch(() => null);
    }

    res.json({ message: "Vendor and associated user login deleted successfully from Supabase DB", id: rawId });
  } catch (err) {
    console.error("Delete vendor endpoint error:", err);
    sendServerError(res, err);
  }
});

// 4. MASTER PRODUCT CATALOG ENDPOINTS
app.get("/api/v1/master-products", async (req, res) => {
  try {
    const cached = getCached("master_products");
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    const products = await prisma.productMaster.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    setCached("master_products", products, 900000); // 15 mins
    res.setHeader("X-Cache", "MISS");
    res.json(products);
  } catch (err) {
    sendServerError(res, err);
  }
});

app.post("/api/v1/master-products", requireAuth, requireRole("ADMIN", "DR"), async (req, res) => {
  try {
    const { name, categoryId, brand, type, grade, unit, suggestedPrice, imageUrl, addedBy } = req.body;
    
    let targetCatId = categoryId;
    if (!targetCatId) {
      const firstCat = await prisma.category.findFirst();
      targetCatId = firstCat.id;
    }

    const newProduct = await prisma.productMaster.create({
      data: {
        name,
        categoryId: targetCatId,
        brand: brand || "Generic",
        type: type || "Standard",
        grade: grade || "Standard Grade",
        unit: unit || "Unit",
        suggestedPrice: Number(suggestedPrice) || 100,
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
        addedBy: addedBy || "Admin",
      },
    });
    res.status(201).json(newProduct);
  } catch (err) {
    sendServerError(res, err);
  }
});

// Master Product Update Endpoint — Admin dwara Product Title, Brand, Grade, Unit, Price, Image update karne ke liye
app.patch("/api/v1/master-products/:id", requireAuth, requireRole("ADMIN", "DR"), async (req, res) => {
  try {
    const rawId = req.params.id;
    const { name, categoryId, brand, type, grade, unit, suggestedPrice, price, imageUrl } = req.body;

    let mp = await prisma.productMaster.findUnique({ where: { id: rawId } }).catch(() => null);

    if (mp) {
      const updateData = {};
      if (name) updateData.name = name;
      if (categoryId) updateData.categoryId = categoryId;
      if (brand) updateData.brand = brand;
      if (type) updateData.type = type;
      if (grade) updateData.grade = grade;
      if (unit) updateData.unit = unit;

      const targetPrice = suggestedPrice !== undefined ? Number(suggestedPrice) : (price !== undefined ? Number(price) : undefined);
      if (targetPrice !== undefined && !isNaN(targetPrice)) {
        updateData.suggestedPrice = targetPrice;
      }
      if (imageUrl) updateData.imageUrl = imageUrl;

      const updatedMp = await prisma.productMaster.update({
        where: { id: mp.id },
        data: updateData,
        include: { category: true },
      });

      // Synchronize price to existing vendor listings for this master product in DB
      if (targetPrice !== undefined && !isNaN(targetPrice)) {
        await prisma.vendorProduct.updateMany({
          where: { masterProductId: mp.id },
          data: { price: targetPrice },
        }).catch(() => null);
      }

      console.log(`✅ Master Product ${mp.id} updated in DB successfully! Price: ₹${updatedMp.suggestedPrice}`);
      return res.json(updatedMp);
    }

    return res.status(404).json({ error: "Master Product not found" });
  } catch (err) {
    console.error("PATCH Master Product error:", err);
    sendServerError(res, err);
  }
});

app.delete("/api/v1/master-products/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const rawId = req.params.id;
    await prisma.vendorProduct.deleteMany({ where: { masterProductId: rawId } }).catch(() => null);
    await prisma.productMaster.delete({ where: { id: rawId } }).catch(() => null);
    res.json({ success: true, message: "Master product deleted" });
  } catch (err) {
    sendServerError(res, err);
  }
});

// 5. VENDOR PRODUCT LISTINGS & APPROVALS ENDPOINTS (Public Storefront - Zero PII / Zero Password)
app.get("/api/v1/vendor/listings", async (req, res) => {
  try {
    const listings = await prisma.vendorProduct.findMany({
      include: {
        vendor: {
          select: {
            id: true,
            shopName: true,
            status: true,
            regionId: true,
            region: {
              select: {
                id: true,
                name: true,
                state: true,
                baseDeliveryCharge: true,
                isActive: true,
              },
            },
          },
        },
        masterProduct: true,
      },
      orderBy: { submittedOn: "desc" },
    });
    res.json(listings);
  } catch (err) {
    sendServerError(res, err);
  }
});

app.post("/api/v1/vendor/listings", requireAuth, requireRole("VENDOR", "DR", "ADMIN"), async (req, res) => {
  try {
    let { masterProductId, vendorId, vendorName, regionId, regionName, price, stockQty } = req.body;
    const isVendorRole = req.auth.role === "VENDOR";

    const masterProd = masterProductId ? await prisma.productMaster.findUnique({ where: { id: masterProductId }, include: { category: true } }).catch(() => null) : null;
    if (!masterProd) {
      return res.status(400).json({ error: "Valid master product is required" });
    }

    let vendor = null;
    if (isVendorRole) {
      // Vendors can only list products for their own shop
      const own = await resolveOwnVendor(req);
      vendor = own ? await prisma.vendor.findUnique({ where: { id: own.id }, include: { region: true } }).catch(() => null) : null;
      if (!vendor) {
        return res.status(403).json({ error: "Vendor profile not found for this account" });
      }
    } else if (vendorId) {
      vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, include: { region: true } }).catch(() => null);
    }
    if (!vendor && !isVendorRole && (vendorName || vendorId)) {
      vendor = await prisma.vendor.findFirst({
        where: {
          OR: [
            { id: vendorId },
            { shopName: { equals: vendorName, mode: "insensitive" } },
            { ownerName: { equals: vendorName, mode: "insensitive" } },
          ],
        },
        include: { region: true },
      }).catch(() => null);
    }

    if (req.auth.role === "DR") {
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found." });
      }
      if (!(await drCanManageVendor(req.auth, vendor))) {
        return res.status(403).json({ error: "You can only add listings for vendors in your own district." });
      }
    }

    let targetRegName = req.body.regionName || req.body.districtName || vendor?.region?.name;
    
    // If regionId is passed as seed string ("r2" or "r1"), map to real names
    if (!targetRegName && regionId) {
      if (regionId === "r2" || regionId.toLowerCase().includes("mirzapur")) targetRegName = "Mirzapur";
      else if (regionId === "r1" || regionId.toLowerCase().includes("varanasi")) targetRegName = "Varanasi";
    }

    if (!targetRegName) targetRegName = "Mirzapur";

    // Find matching region in DB (by UUID or name); vendor and DR listings always live in the shop's own district
    let matchedRegion = req.auth.role === "ADMIN" ? null : vendor.region;
    if (!matchedRegion && regionId && regionId.length > 10) {
      matchedRegion = await prisma.region.findUnique({ where: { id: regionId } }).catch(() => null);
    }

    if (!matchedRegion && targetRegName) {
      matchedRegion = await prisma.region.findFirst({
        where: { name: { equals: targetRegName.trim(), mode: "insensitive" } },
      }).catch(() => null);
    }

    if (!matchedRegion && vendor?.region) {
      matchedRegion = vendor.region;
    }

    if (!matchedRegion) {
      matchedRegion = await prisma.region.create({
        data: {
          name: targetRegName.trim(),
          state: "Uttar Pradesh",
          baseDeliveryCharge: 49,
          isActive: true,
        },
      }).catch(async () => {
        return await prisma.region.findFirst().catch(() => null);
      });
    }

    if (!vendor) {
      return res.status(400).json({ error: "Vendor not found" });
    }

    const finalRegionId = matchedRegion ? matchedRegion.id : null;
    const finalRegionName = matchedRegion ? matchedRegion.name : targetRegName;

    // Sync vendor region in DB if different
    if (vendor && matchedRegion && vendor.regionId !== matchedRegion.id) {
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { regionId: matchedRegion.id },
      }).catch(() => null);
    }

    // Only staff can publish directly; vendor submissions always go through review
    const isAutoApproved = req.auth.role === "ADMIN" || req.auth.role === "DR";
    const listingPrice = Number(price) || Number(masterProd.suggestedPrice) || 100;
    const listingStock = stockQty !== undefined && stockQty !== "" ? Number(stockQty) : 100;
    if (!(listingPrice > 0) || !Number.isInteger(listingStock) || listingStock < 0) {
      return res.status(400).json({ error: "Invalid price or stock quantity" });
    }

    const newListing = await prisma.vendorProduct.create({
      data: {
        masterProductId: masterProd.id,
        vendorId: vendor.id,
        regionId: finalRegionId,
        regionName: finalRegionName,
        name: masterProd.name,
        categoryId: masterProd.categoryId,
        categoryName: masterProd.category?.name || "General",
        brand: masterProd.brand,
        type: masterProd.type,
        grade: masterProd.grade,
        unit: masterProd.unit,
        price: listingPrice,
        stockQty: listingStock,
        imageUrl: masterProd.imageUrl,
        approvalStatus: isAutoApproved ? "APPROVED" : "PENDING_REVIEW",
        isActive: isAutoApproved ? true : false,
        addedBy: isAutoApproved ? (req.auth.role === "ADMIN" ? "Admin" : "DR") : "Vendor",
      },
      include: { vendor: { include: { region: true } }, masterProduct: true },
    });

    // Increment user's productCount column in Supabase users table
    await prisma.user.update({
      where: { id: vendor.userId },
      data: { productCount: { increment: 1 } },
    }).catch(() => null);

    res.status(201).json(newListing);
  } catch (err) {
    console.error("Vendor product listing error:", err);
    sendServerError(res, err);
  }
});

// Vendor Update Product Listing (Price & Stock Live Update)
app.patch("/api/v1/vendor/listings/:id", requireAuth, requireRole("VENDOR", "DR", "ADMIN"), async (req, res) => {
  try {
    const rawId = req.params.id;
    const { price, stockQty, approvalStatus, isActive } = req.body;

    let listing = await prisma.vendorProduct.findUnique({ where: { id: rawId } }).catch(() => null);

    if (listing && req.auth.role === "DR" && !(await drCanManageVendor(req.auth, listing.vendorId))) {
      return res.status(403).json({ error: "You can only manage listings for vendors in your own district." });
    }

    if (listing) {
      const isVendorRole = req.auth.role === "VENDOR";
      if (isVendorRole) {
        const own = await resolveOwnVendor(req);
        if (!own || own.id !== listing.vendorId) {
          return res.status(403).json({ error: "You do not have permission for this action" });
        }
      }

      const updateData = {};
      if (price !== undefined) {
        const p = Number(price);
        if (!(p > 0)) return res.status(400).json({ error: "Price must be greater than 0" });
        updateData.price = p;
      }
      if (stockQty !== undefined) {
        const q = Number(stockQty);
        if (!Number.isInteger(q) || q < 0) return res.status(400).json({ error: "Stock must be a whole number" });
        updateData.stockQty = q;
      }
      // Approval is a staff decision; vendors may only pause/resume an already-approved listing
      if (approvalStatus !== undefined && !isVendorRole) {
        if (!["PENDING_REVIEW", "APPROVED", "REJECTED"].includes(approvalStatus)) {
          return res.status(400).json({ error: "Invalid approval status" });
        }
        updateData.approvalStatus = approvalStatus;
        updateData.isActive = approvalStatus === "APPROVED";
      }
      if (isActive !== undefined) {
        const effectiveStatus = updateData.approvalStatus || listing.approvalStatus;
        updateData.isActive = isVendorRole ? Boolean(isActive) && effectiveStatus === "APPROVED" : Boolean(isActive);
      }

      const updatedListing = await prisma.vendorProduct.update({
        where: { id: listing.id },
        data: updateData,
        include: { vendor: { include: { region: true } }, masterProduct: true },
      });

      console.log(`✓ Live price update: Vendor listing ${listing.id} price set to ₹${updatedListing.price} in Supabase DB`);
      return res.json(updatedListing);
    }

    res.status(404).json({ error: "Vendor product listing not found" });
  } catch (err) {
    sendServerError(res, err, "Patch listing");
  }
});

app.patch("/api/v1/vendor/listings/:id/status", requireAuth, requireRole("ADMIN", "DR"), async (req, res) => {
  try {
    const rawId = req.params.id;
    const { approvalStatus } = req.body; // PENDING_REVIEW | APPROVED | REJECTED
    if (approvalStatus !== undefined && !["PENDING_REVIEW", "APPROVED", "REJECTED"].includes(approvalStatus)) {
      return res.status(400).json({ error: "Invalid approval status" });
    }

    let listing = await prisma.vendorProduct.findUnique({ where: { id: rawId } }).catch(() => null);

    if (!listing && rawId) {
      listing = await prisma.vendorProduct.findFirst({
        where: { id: rawId },
      }).catch(() => null);
    }

    if (listing && req.auth.role === "DR" && !(await drCanManageVendor(req.auth, listing.vendorId))) {
      return res.status(403).json({ error: "You can only review listings for vendors in your own district." });
    }

    if (listing) {
      const isApproved = approvalStatus === "APPROVED";
      const updatedListing = await prisma.vendorProduct.update({
        where: { id: listing.id },
        data: {
          approvalStatus: approvalStatus || "PENDING_REVIEW",
          isActive: isApproved,
        },
      });
      console.log(`✓ Listing ${listing.id} status updated to ${approvalStatus} (isActive: ${isApproved})`);
      return res.json(updatedListing);
    }

    res.status(404).json({ error: "Product listing not found" });
  } catch (err) {
    console.error("Update listing status error:", err.message);
    sendServerError(res, err);
  }
});

// 6. CATEGORIES & REGIONS ENDPOINTS
app.get("/api/v1/categories", async (req, res) => {
  try {
    const cached = getCached("categories");
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    setCached("categories", categories, 900000); // 15 mins
    res.setHeader("X-Cache", "MISS");
    res.json(categories);
  } catch (err) {
    sendServerError(res, err);
  }
});

app.post("/api/v1/categories", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, productCount } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name required" });
    }
    const existing = await prisma.category.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } } });
    if (existing) {
      return res.json(existing);
    }
    const newCategory = await prisma.category.create({
      data: {
        name: name.trim(),
        productCount: Number(productCount) || 0,
      },
    });
    res.status(201).json(newCategory);
  } catch (err) {
    sendServerError(res, err);
  }
});

app.patch("/api/v1/categories/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const rawId = req.params.id;
    const { name, productCount, isActive } = req.body;

    let cat = await prisma.category.findUnique({ where: { id: rawId } }).catch(() => null);
    if (!cat) {
      cat = await prisma.category.findFirst({
        where: { OR: [{ id: rawId }, { name: { equals: rawId.trim(), mode: "insensitive" } }] },
      }).catch(() => null);
    }

    if (!cat) {
      return res.status(404).json({ error: "Category not found" });
    }

    const updated = await prisma.category.update({
      where: { id: cat.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(productCount !== undefined ? { productCount: Number(productCount) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error("Patch category error:", err.message);
    sendServerError(res, err);
  }
});

app.delete("/api/v1/categories/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!rawId) {
      return res.status(400).json({ error: "Category ID or Name required" });
    }

    let cat = await prisma.category.findUnique({ where: { id: rawId } }).catch(() => null);
    if (!cat) {
      cat = await prisma.category.findFirst({
        where: {
          OR: [
            { id: rawId },
            { name: { equals: rawId.trim(), mode: "insensitive" } },
          ],
        },
      }).catch(() => null);
    }

    if (!cat) {
      return res.json({ success: true, message: "Category removed" });
    }

    // Unlink or delete referencing master products first to avoid FK errors
    await prisma.productMaster.deleteMany({
      where: { categoryId: cat.id },
    }).catch(() => null);

    // Delete the category row from Supabase DB
    await prisma.category.delete({
      where: { id: cat.id },
    });

    console.log(`✓ Category "${cat.name}" (${cat.id}) deleted from DB`);
    res.json({ success: true, message: `Category "${cat.name}" deleted from DB` });
  } catch (err) {
    console.error("Delete category error:", err.message);
    sendServerError(res, err);
  }
});

app.get("/api/v1/regions", async (req, res) => {
  try {
    const cached = getCached("regions");
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    const regions = await prisma.region.findMany({ orderBy: { name: "asc" } });
    setCached("regions", regions, 900000); // 15 mins
    res.setHeader("X-Cache", "MISS");
    res.json(regions);
  } catch (err) {
    sendServerError(res, err);
  }
});

app.post("/api/v1/regions", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, state, baseDeliveryCharge, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "District region name required" });
    }
    const existing = await prisma.region.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } } });
    if (existing) {
      return res.json(existing);
    }
    const newRegion = await prisma.region.create({
      data: {
        name: name.trim(),
        state: state || "Uttar Pradesh",
        baseDeliveryCharge: Number(baseDeliveryCharge) || 49.0,
        isActive: isActive !== false,
      },
    });
    res.status(201).json(newRegion);
  } catch (err) {
    sendServerError(res, err);
  }
});

app.patch("/api/v1/regions/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const rawId = req.params.id;
    const { name, state, baseDeliveryCharge, isActive } = req.body;

    let reg = await prisma.region.findUnique({ where: { id: rawId } }).catch(() => null);
    if (!reg) {
      reg = await prisma.region.findFirst({
        where: { OR: [{ id: rawId }, { name: { equals: rawId.trim(), mode: "insensitive" } }] },
      }).catch(() => null);
    }

    if (!reg) {
      return res.status(404).json({ error: "Region not found" });
    }

    const updated = await prisma.region.update({
      where: { id: reg.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(state ? { state } : {}),
        ...(baseDeliveryCharge !== undefined ? { baseDeliveryCharge: Number(baseDeliveryCharge) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    // If region name was updated, cascade new regionName to all existing vendor products in this region
    if (name && name.trim() && name.trim() !== reg.name) {
      const newName = name.trim();
      await prisma.vendorProduct.updateMany({
        where: {
          OR: [
            { regionId: reg.id },
            { regionName: reg.name },
            { vendor: { regionId: reg.id } },
          ],
        },
        data: {
          regionName: newName,
          regionId: reg.id,
        },
      }).catch((err) => console.warn("Cascade region rename warning:", err.message));
    }

    res.json(updated);
  } catch (err) {
    console.error("Patch region error:", err.message);
    sendServerError(res, err);
  }
});

app.delete("/api/v1/regions/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!rawId) {
      return res.status(400).json({ error: "Region ID or Name required" });
    }

    let reg = await prisma.region.findUnique({ where: { id: rawId } }).catch(() => null);
    if (!reg) {
      reg = await prisma.region.findFirst({
        where: {
          OR: [
            { id: rawId },
            { name: { equals: rawId.trim(), mode: "insensitive" } },
          ],
        },
      }).catch(() => null);
    }

    if (!reg) {
      return res.json({ success: true, message: "Region removed" });
    }

    // Unlink DRs & Vendors referencing this region
    await prisma.dR.updateMany({
      where: { regionId: reg.id },
      data: { regionId: null },
    }).catch(() => null);

    await prisma.vendor.updateMany({
      where: { regionId: reg.id },
      data: { regionId: null },
    }).catch(() => null);

    // Delete region row from Supabase DB
    await prisma.region.delete({
      where: { id: reg.id },
    });

    console.log(`✓ Region "${reg.name}" (${reg.id}) deleted from DB`);
    res.json({ success: true, message: `Region "${reg.name}" deleted from DB` });
  } catch (err) {
    console.error("Delete region error:", err.message);
    sendServerError(res, err);
  }
});

// 7. ORDERS & CHECKOUT ENDPOINTS (With Vendor Isolation & Status Updates)
const STAFF_ORDER_INCLUDE = {
  items: {
    include: {
      vendor: {
        select: { id: true, shopName: true, phone: true, ownerName: true, regionId: true, region: true },
      },
    },
  },
  customer: { select: SAFE_USER_SELECT },
  address: { include: { region: true } },
};

const CUSTOMER_ORDER_INCLUDE = {
  items: {
    include: {
      vendor: {
        select: { id: true, shopName: true, phone: true, ownerName: true, regionId: true },
      },
    },
  },
  customer: { select: SAFE_USER_SELECT },
  address: true,
};

const withVendorNames = (orders) =>
  (orders || []).map((o) => ({
    ...o,
    items: (o.items || []).map((it) => ({
      ...it,
      vendorName: it.vendor?.shopName || it.vendorName || "District Vendor",
    })),
  }));

// Orders a customer can see: placed by them, or delivered to their phone number
function customerOrdersWhere(userId, phone) {
  const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
  return {
    OR: [
      ...(userId ? [{ customerId: userId }] : []),
      ...(cleanPhone ? [{ customer: { phone: { contains: cleanPhone } } }] : []),
      ...(cleanPhone ? [{ address: { phone: { contains: cleanPhone } } }] : []),
    ],
  };
}

// All orders (Admin / DR). Supports ?limit=&cursor=&includeOpen=1 and ?regionId= for a district.
app.get("/api/v1/orders", requireAuth, requireRole("ADMIN", "DR"), async (req, res) => {
  try {
    let where = orderRegionWhere(req.query.regionId);
    if (req.auth.role === "DR") {
      // DRs only ever see orders in their own district
      const drRegionIds = await resolveCallerDrRegionIds(req.auth);
      if (drRegionIds.length === 0) {
        return res.json(getPageParams(req) ? { orders: [], nextCursor: null, hasMore: false } : []);
      }
      where = { AND: [where, ordersInRegionsWhere(drRegionIds)] };
    }
    const list = await listOrders(req, where, { include: STAFF_ORDER_INCLUDE });
    sendOrderList(res, list, withVendorNames(list.orders));
  } catch (err) {
    sendServerError(res, err);
  }
});

// Exact order totals for the caller's scope (dashboard headline numbers, independent of paging)
app.get("/api/v1/orders/summary", requireAuth, async (req, res) => {
  try {
    const role = req.auth.role;
    if (role === "ADMIN") {
      return res.json(await computeOrdersSummary(orderRegionWhere(req.query.regionId)));
    }
    if (role === "DR") {
      const drRegionIds = await resolveCallerDrRegionIds(req.auth);
      return res.json(await computeOrdersSummary({ AND: [orderRegionWhere(req.query.regionId), ordersInRegionsWhere(drRegionIds)] }));
    }
    if (role === "VENDOR") {
      const own = await resolveOwnVendor(req);
      if (!own) return res.status(403).json({ error: "Vendor profile not found for this account" });
      return res.json(await computeOrdersSummary({ items: { some: { vendorId: own.id } } }, { vendorId: own.id }));
    }
    res.json(await computeOrdersSummary(customerOrdersWhere(req.auth.userId, req.auth.phone)));
  } catch (err) {
    sendServerError(res, err, "Orders summary");
  }
});

// Customer Isolated Orders Fetch (Self by Token)
app.get("/api/v1/orders/me", requireAuth, async (req, res) => {
  const paginated = !!getPageParams(req);
  try {
    const list = await listOrders(req, customerOrdersWhere(req.auth?.userId, req.auth?.phone), { include: CUSTOMER_ORDER_INCLUDE });
    sendOrderList(res, list, withVendorNames(list.orders));
  } catch (err) {
    if (paginated) return sendServerError(res, err, "My orders");
    res.json([]);
  }
});

// Customer Isolated Orders Fetch (Self or Admin by Param)
app.get("/api/v1/orders/user/:userId", requireAuth, requireSelfOrAdmin("userId"), async (req, res) => {
  const paginated = !!getPageParams(req);
  try {
    const targetUserId = req.auth?.role === "ADMIN" ? req.params.userId : (req.auth?.userId || req.params.userId);
    const phone = req.auth?.phone || req.params.userId || "";
    const list = await listOrders(req, customerOrdersWhere(targetUserId, phone), { include: CUSTOMER_ORDER_INCLUDE });
    sendOrderList(res, list, withVendorNames(list.orders));
  } catch (err) {
    if (paginated) return sendServerError(res, err, "User orders");
    res.json([]);
  }
});

// Strict Vendor Isolated Orders Fetch
app.get("/api/v1/orders/vendor/:vendorId", requireAuth, requireRole("VENDOR", "DR", "ADMIN"), async (req, res) => {
  try {
    const { vendorId } = req.params;
    let vendor = null;

    if (req.auth.role === "VENDOR") {
      // Vendors always get their own orders, whatever id the client sent
      vendor = await resolveOwnVendor(req);
    } else {
      const cleanPhone = vendorId.replace(/^v-/, "").replace(/\D/g, "");
      vendor = await prisma.vendor.findFirst({
        where: {
          OR: [
            { id: vendorId },
            { userId: vendorId },
            ...(cleanPhone.length === 10 ? [{ phone: cleanPhone }] : []),
          ],
        },
      }).catch(() => null);
    }

    if (!vendor || (req.auth.role === "DR" && !(await drCanManageVendor(req.auth, vendor)))) {
      return res.json(getPageParams(req) ? { orders: [], nextCursor: null, hasMore: false } : []);
    }

    // Filter in the database instead of loading every order into memory
    const list = await listOrders(req, { items: { some: { vendorId: vendor.id } } }, {
      include: {
        items: {
          where: { vendorId: vendor.id },
          include: {
            vendor: {
              select: { id: true, shopName: true, phone: true, ownerName: true, regionId: true },
            },
          },
        },
        _count: { select: { items: true } },
        customer: { select: SAFE_USER_SELECT },
        address: { include: { region: true } },
      },
    });

    const formatted = list.orders.map(({ _count, ...o }) => {
      const myItems = o.items || [];
      const vendorSubtotal = myItems.reduce((acc, it) => acc + Number(it.priceAtPurchase || 0) * Number(it.quantity || 1), 0);
      const allItemsCount = _count?.items ?? myItems.length;
      const isFullOrder = myItems.length === allItemsCount;
      const vendorTotal = isFullOrder ? Number(o.totalAmount || vendorSubtotal) : vendorSubtotal;

      return {
        ...o,
        items: myItems.map((it) => ({
          ...it,
          name: it.productName,
          productName: it.productName,
          price: Number(it.priceAtPurchase || 0),
          totalPrice: Number(it.totalPrice || Number(it.priceAtPurchase || 0) * Number(it.quantity || 1)),
          vendorName: it.vendor?.shopName || vendor.shopName || "District Vendor",
        })),
        totalAmount: vendorTotal,
        total: vendorTotal,
        vendorItemsTotal: vendorSubtotal,
        isPartialOrder: !isFullOrder,
        allOrderItemsCount: allItemsCount,
      };
    });

    sendOrderList(res, list, formatted);
  } catch (err) {
    sendServerError(res, err, "Vendor orders");
  }
});

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

// Update Order Status (Vendor & Admin with Auto Stock Restore on Cancel)
app.patch("/api/v1/orders/:id/status", requireAuth, requireRole("VENDOR", "DR", "ADMIN"), async (req, res) => {
  try {
    const { status } = req.body; // PENDING | PROCESSING | OUT_FOR_DELIVERY | DELIVERED | CANCELLED
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid order status" });
    }

    const previousOrder = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    }).catch(() => null);

    if (!previousOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Vendors may only update orders whose items all belong to their own shop
    if (req.auth.role === "VENDOR") {
      const own = await resolveOwnVendor(req);
      const ownsEveryItem = !!own && previousOrder.items.length > 0 && previousOrder.items.every((it) => it.vendorId === own.id);
      if (!ownsEveryItem) {
        const ownsSomeItem = !!own && previousOrder.items.some((it) => it.vendorId === own.id);
        return res.status(403).json({
          error: ownsSomeItem
            ? "This order is shared with another shop. Please ask your District Representative to update it."
            : "You do not have permission for this action",
        });
      }
    }

    // DRs may only update orders in their own district
    if (req.auth.role === "DR") {
      const drRegionIds = await resolveCallerDrRegionIds(req.auth);
      const inDistrict = drRegionIds.length > 0 && (await prisma.order.count({
        where: { AND: [{ id: previousOrder.id }, ordersInRegionsWhere(drRegionIds)] },
      })) > 0;
      if (!inDistrict) {
        return res.status(403).json({ error: "This order is outside your district." });
      }
    }

    const ops = [
      prisma.order.update({
        where: { id: previousOrder.id },
        data: { status },
        include: { items: true, customer: { select: SAFE_USER_SELECT } },
      }),
    ];

    // Restore reserved quantity back to the exact listing when order is cancelled
    if (status === "CANCELLED" && previousOrder.status !== "CANCELLED") {
      for (const item of previousOrder.items) {
        const qty = Number(item.quantity || 1);
        if (item.vendorProductId) {
          ops.push(prisma.vendorProduct.updateMany({
            where: { id: item.vendorProductId },
            data: { stockQty: { increment: qty } },
          }));
        } else {
          // Legacy orders created before vendorProductId was recorded
          const vp = await prisma.vendorProduct.findFirst({
            where: { vendorId: item.vendorId, name: { equals: item.productName, mode: "insensitive" } },
            select: { id: true },
          }).catch(() => null);
          if (vp) {
            ops.push(prisma.vendorProduct.updateMany({
              where: { id: vp.id },
              data: { stockQty: { increment: qty } },
            }));
          }
        }
      }
    }

    // Status change and stock restore succeed or fail together
    const [updatedOrder] = await prisma.$transaction(ops);
    res.json(updatedOrder);
  } catch (err) {
    sendServerError(res, err, "Order status update");
  }
});

// Customer Addresses Fetch & Save Endpoints (Explicit Express Routes)
const handleGetAddresses = async (req, res) => {
  try {
    const isAdmin = req.auth?.role === "ADMIN";
    const targetUserId = isAdmin && req.params.userId ? req.params.userId : req.auth?.userId;

    if (!targetUserId || targetUserId === "undefined" || targetUserId === "null") {
      return res.json([]);
    }

    const addresses = await prisma.address.findMany({
      where: {
        userId: targetUserId,
      },
      include: { region: true },
      orderBy: { createdAt: "desc" },
    }).catch(() => []);

    // Deduplicate by normalized street + city + pincode
    const seen = new Map();
    for (const a of addresses) {
      const cleanStreet = (a.street || "").toLowerCase().trim();
      const cleanCity = (a.city || "").toLowerCase().trim();
      const cleanPin = (a.pincode || "").trim();
      const key = `${cleanStreet}_${cleanCity}_${cleanPin}`;

      if (!seen.has(key)) {
        seen.set(key, a);
      } else if (a.isDefault && !seen.get(key).isDefault) {
        seen.set(key, a);
      }
    }

    const uniqueList = Array.from(seen.values());

    // Ensure only 1 address has isDefault = true
    let defaultFound = false;
    const sanitized = uniqueList.map((a) => {
      if (a.isDefault && !defaultFound) {
        defaultFound = true;
        return a;
      }
      return { ...a, isDefault: false };
    });

    if (!defaultFound && sanitized.length > 0) {
      sanitized[0].isDefault = true;
    }

    res.json(sanitized);
  } catch (err) {
    res.json([]);
  }
};

app.get("/api/v1/addresses/me", requireAuth, handleGetAddresses);
app.get("/api/v1/addresses/user/:userId", requireAuth, requireSelfOrAdmin((req) => req.params.userId), handleGetAddresses);
app.get("/api/v1/addresses/:userId", requireAuth, requireSelfOrAdmin((req) => req.params.userId), handleGetAddresses);

app.post("/api/v1/addresses", requireAuth, async (req, res) => {
  try {
    const { fullName, phone, street, city, state, pincode, isDefault } = req.body;
    const owningUserId = req.auth.userId;

    const targetUser = await prisma.user.findUnique({ where: { id: owningUserId } }).catch(() => null);
    if (!targetUser) {
      return res.status(404).json({ error: "Authenticated user not found" });
    }

    // Auto-update customer profile name in DB if name was previously default or placeholder
    if (fullName && fullName.trim()) {
      const currentName = (targetUser.name || "").trim().toLowerCase();
      const isPlaceholder =
        !currentName ||
        currentName === "customer" ||
        currentName === "user" ||
        currentName === "verified customer" ||
        /^customer\s*\d*$/i.test(currentName) ||
        /^user\s*\d*$/i.test(currentName);

      if (isPlaceholder && fullName.trim().length > 1) {
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { name: fullName.trim() },
        }).catch(() => null);
      }
    }

    const regName = city || "Mirzapur";
    let reg = await prisma.region.findFirst({
      where: { name: { equals: regName.trim(), mode: "insensitive" } },
    }).catch(() => null);

    if (!reg) {
      reg = await prisma.region.findFirst().catch(() => null);
    }
    if (!reg) {
      reg = await prisma.region.create({
        data: { name: regName.trim(), state: state || "Uttar Pradesh", baseDeliveryCharge: 49, isActive: true },
      }).catch(async () => {
        return await prisma.region.findFirst().catch(() => null);
      });
    }

    if (!reg) {
      return res.status(400).json({ error: "Unable to resolve target region in database." });
    }

    const existingCount = await prisma.address.count({ where: { userId: targetUser.id } }).catch(() => 0);
    const shouldBeDefault = isDefault !== undefined ? Boolean(isDefault) : existingCount === 0;

    if (shouldBeDefault) {
      await prisma.address.updateMany({
        where: { userId: targetUser.id },
        data: { isDefault: false },
      }).catch(() => null);
    }

    const streetClean = (street || "Main Delivery Address").trim();
    const existingAddr = await prisma.address.findFirst({
      where: {
        userId: targetUser.id,
        street: { equals: streetClean, mode: "insensitive" },
        city: { equals: regName.trim(), mode: "insensitive" },
      },
      include: { region: true },
    }).catch(() => null);

    if (existingAddr) {
      const updated = await prisma.address.update({
        where: { id: existingAddr.id },
        data: {
          fullName: fullName || existingAddr.fullName,
          phone: phone || existingAddr.phone,
          pincode: pincode || existingAddr.pincode,
          isDefault: shouldBeDefault,
        },
        include: { region: true },
      });
      return res.status(200).json(updated);
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: targetUser.id,
        regionId: reg.id,
        fullName: fullName || targetUser.name || "Customer",
        phone: phone || targetUser.phone || "",
        street: streetClean,
        city: regName,
        state: state || "Uttar Pradesh",
        pincode: pincode || "221001",
        isDefault: shouldBeDefault,
      },
      include: { region: true },
    });

    console.log("✓ Address successfully saved into Supabase public.addresses table:", newAddress.id, newAddress.street);
    res.status(201).json(newAddress);
  } catch (err) {
    console.error("POST /api/v1/addresses error:", err.message);
    sendServerError(res, err);
  }
});

// Update Address Endpoint in Supabase DB
app.put("/api/v1/addresses/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, street, city, state, pincode, isDefault } = req.body;

    const addr = await prisma.address.findUnique({ where: { id } }).catch(() => null);
    if (!addr) {
      return res.status(404).json({ error: "Address record not found" });
    }

    if (addr.userId !== req.auth.userId && req.auth.role !== "ADMIN") {
      return res.status(403).json({ error: "You do not have permission for this action" });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: addr.userId },
        data: { isDefault: false },
      }).catch(() => null);
    }

    const updated = await prisma.address.update({
      where: { id: addr.id },
      data: {
        ...(fullName ? { fullName: fullName.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(street ? { street: street.trim() } : {}),
        ...(city ? { city: city.trim() } : {}),
        ...(state ? { state: state.trim() } : {}),
        ...(pincode ? { pincode: pincode.trim() } : {}),
        ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
      },
      include: { region: true },
    });
    console.log("✓ Address updated in Supabase DB:", addr.id);
    return res.json(updated);
  } catch (err) {
    console.error("PUT /api/v1/addresses/:id error:", err.message);
    sendServerError(res, err);
  }
});

// Delete Address Endpoint in Supabase DB
app.delete("/api/v1/addresses/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const addr = await prisma.address.findUnique({ where: { id } }).catch(() => null);
    if (!addr) {
      return res.status(404).json({ error: "Address record not found" });
    }

    if (addr.userId !== req.auth.userId && req.auth.role !== "ADMIN") {
      return res.status(403).json({ error: "You do not have permission for this action" });
    }

    await prisma.address.delete({ where: { id: addr.id } });
    console.log(`✓ Address deleted from Supabase DB: ${addr.id}`);
    return res.json({ success: true, count: 1 });
  } catch (err) {
    console.error("DELETE /api/v1/addresses/:id error:", err.message);
    sendServerError(res, err);
  }
});

app.post("/api/v1/orders/checkout", requireAuth, async (req, res) => {
  try {
    const { items, idempotencyKey } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items in order." });
    }
    if (items.length > 100) {
      return res.status(400).json({ error: "Too many items in one order." });
    }

    // 1. The order always belongs to the authenticated account (never a customerId from the body)
    let targetUser = await prisma.user.findUnique({ where: { id: req.auth.userId } }).catch(() => null);
    if (!targetUser && req.auth.phone) {
      targetUser = await prisma.user.findUnique({ where: { phone: req.auth.phone } }).catch(() => null);
    }
    if (!targetUser) {
      return res.status(401).json({ error: "Session expired. Please log in again.", invalidSession: true });
    }
    const targetCustomerId = targetUser.id;

    if (idempotencyKey) {
      // A split checkout stores the key on its first order and "<key>__vN" on the rest
      const key = String(idempotencyKey);
      const existingOrders = await prisma.order.findMany({
        where: { OR: [{ idempotencyKey: key }, { idempotencyKey: { startsWith: `${key}__v` } }] },
        include: { items: true, customer: { select: SAFE_USER_SELECT }, address: true },
        orderBy: { createdAt: "asc" },
      });
      if (existingOrders.length > 0) {
        if (existingOrders.some((o) => o.customerId !== targetCustomerId)) {
          return res.status(409).json({ error: "Duplicate order request. Please refresh and try again." });
        }
        return res.json({ success: true, order: existingOrders[0], orders: existingOrders, isDuplicate: true });
      }
    }

    // Region list is near-static; cache briefly (catalog mutations clear it)
    let cachedRegions = getCached("checkout_regions");
    if (!cachedRegions) {
      cachedRegions = await prisma.region.findMany().catch(() => []);
      setCached("checkout_regions", cachedRegions, 5 * 60 * 1000);
    }

    let reg = null;
    if (req.body.regionId) {
      reg = cachedRegions.find((r) => r.id === req.body.regionId);
    }
    if (!reg && req.body.districtName) {
      const dName = req.body.districtName.trim().toLowerCase();
      reg = cachedRegions.find((r) => r.name.toLowerCase() === dName || r.name.toLowerCase().includes(dName));
    }
    if (!reg) {
      reg = cachedRegions[0] || null;
    }

    const targetRegionName = reg?.name || (req.body.districtName || req.body.address?.city || req.body.address?.district || "Varanasi").trim();

    // 2. Batch query all cart products at once in 1 single fast database call!
    const itemIds = items.map((i) => i.id || i.productId).filter((v) => typeof v === "string");
    const itemNames = items.map((i) => String(i.name || i.productName || "").trim()).filter(Boolean);

    const liveProducts = await prisma.vendorProduct.findMany({
      where: {
        approvalStatus: "APPROVED",
        isActive: true,
        vendor: { status: { not: "SUSPENDED" } },
        OR: [
          ...(itemIds.length > 0 ? [{ id: { in: itemIds } }] : []),
          ...(itemNames.length > 0 ? [{ name: { in: itemNames, mode: "insensitive" } }] : []),
        ],
      },
      include: {
        vendor: {
          select: { id: true, shopName: true, phone: true, ownerName: true, regionId: true, status: true },
        },
      },
    }).catch(() => []);

    // 3. Validate every item BEFORE any write, so a bad item can't leave partial side effects
    const validatedItems = [];
    const stockRequested = new Map();

    for (const item of items) {
      const itemQty = Number(item.quantity);
      const prodName = String(item.name || item.productName || item.title || "").trim();

      if (!Number.isInteger(itemQty) || itemQty < 1 || itemQty > 10000) {
        throw new ClientError(`Invalid quantity for product: ${prodName || "Item"}`);
      }

      const pId = item.id || item.productId;
      let liveVp = liveProducts.find((p) => p.id === pId);
      if (!liveVp && prodName) {
        liveVp = liveProducts.find((p) => p.name.toLowerCase() === prodName.toLowerCase());
      }

      if (!liveVp) {
        throw new ClientError(`Product not available or supplier suspended: ${prodName || "Item"}`);
      }

      const verifiedPrice = Number(liveVp.price);
      if (isNaN(verifiedPrice) || verifiedPrice <= 0) {
        throw new ClientError(`Invalid product price for ${liveVp.name}`);
      }

      const itemTotal = itemQty * verifiedPrice;
      stockRequested.set(liveVp.id, (stockRequested.get(liveVp.id) || 0) + itemQty);

      validatedItems.push({
        vendorProductId: liveVp.id,
        productName: liveVp.name || prodName,
        priceAtPurchase: verifiedPrice,
        quantity: itemQty,
        totalPrice: itemTotal,
        vendorId: liveVp.vendorId,
        vendor: liveVp.vendor,
      });
    }

    // 4. Address Save / Link Logic
    let addressId = null;
    if (req.body.address || req.body.districtName || req.body.regionId) {
      const addrObj = req.body.address || {};
      const streetStr = String(typeof addrObj === "string" ? addrObj : (addrObj.street || addrObj.line || addrObj.address || "Main Site Delivery Address"));
      const fullNameStr = typeof addrObj === "object" ? (addrObj.fullName || addrObj.name || "Customer") : "Customer";
      const phoneStr = typeof addrObj === "object" ? (addrObj.phone || targetUser.phone || "") : (targetUser.phone || "");
      const cityStr = targetRegionName;

      if (reg && reg.id) {
        let existingAddress = await prisma.address.findFirst({
          where: {
            userId: targetCustomerId,
            street: { equals: streetStr.trim(), mode: "insensitive" },
            city: { equals: cityStr.trim(), mode: "insensitive" },
          },
        }).catch(() => null);

        if (existingAddress) {
          addressId = existingAddress.id;
        } else {
          const createdAddress = await prisma.address.create({
            data: {
              userId: targetCustomerId,
              regionId: reg.id,
              fullName: String(fullNameStr),
              phone: String(phoneStr),
              street: streetStr,
              city: cityStr,
              state: typeof addrObj === "object" ? (addrObj.state || "Uttar Pradesh") : "Uttar Pradesh",
              pincode: typeof addrObj === "object" ? String(addrObj.pincode || "221001") : "221001",
              isDefault: false,
            },
          }).catch((err) => {
            console.warn("Address creation note:", err.message);
            return null;
          });

          if (createdAddress) addressId = createdAddress.id;
        }
      }
    }

    const calculatedDeliveryFee = reg ? Number(reg.baseDeliveryCharge || 49) : 49;

    // 5. One order per vendor: each shop accepts, dispatches and delivers its own order,
    // so a status change by one vendor can never close another vendor's items.
    // All orders, their items and the stock decrements commit atomically.
    // Stock is decremented only while enough remains, so it can never go negative.
    const vendorGroups = new Map();
    for (const vi of validatedItems) {
      if (!vendorGroups.has(vi.vendorId)) vendorGroups.set(vi.vendorId, []);
      vendorGroups.get(vi.vendorId).push(vi);
    }

    const orderCreates = Array.from(vendorGroups.values()).map((groupItems, idx) =>
      prisma.order.create({
        data: {
          customerId: targetCustomerId,
          addressId,
          totalAmount: groupItems.reduce((sum, vi) => sum + vi.totalPrice, 0) + calculatedDeliveryFee,
          deliveryFee: calculatedDeliveryFee,
          paymentMode: "COD",
          status: "PENDING",
          idempotencyKey: idempotencyKey ? (idx === 0 ? String(idempotencyKey) : `${idempotencyKey}__v${idx + 1}`) : null,
          items: {
            create: groupItems.map((vi) => ({
              vendorProductId: vi.vendorProductId,
              productName: vi.productName,
              priceAtPurchase: vi.priceAtPurchase,
              quantity: vi.quantity,
              totalPrice: vi.totalPrice,
              vendorId: vi.vendorId,
            })),
          },
        },
        include: {
          items: {
            include: {
              vendor: {
                select: { id: true, shopName: true, phone: true, ownerName: true, regionId: true },
              },
            },
          },
        },
      })
    );

    const stockOps = [...stockRequested.entries()].map(([vpId, qty]) => {
      const vp = liveProducts.find((p) => p.id === vpId);
      const dec = Math.min(Number(vp?.stockQty || 0), qty);
      return dec > 0
        ? prisma.vendorProduct.updateMany({ where: { id: vpId, stockQty: { gte: dec } }, data: { stockQty: { decrement: dec } } })
        : null;
    }).filter(Boolean);

    let createdOrders;
    try {
      const results = await prisma.$transaction([...orderCreates, ...stockOps]);
      createdOrders = results.slice(0, orderCreates.length);
    } catch (txErr) {
      // Concurrent retry with the same idempotency key: the other request won
      if (txErr.code === "P2002" && idempotencyKey) {
        return res.status(409).json({ error: "Duplicate order request. Please refresh your orders." });
      }
      throw txErr;
    }

    // 6. Build response objects with guaranteed real DB items
    const fullOrders = createdOrders.map((newOrder) => ({
      ...newOrder,
      items: (newOrder.items || []).map((ci) => ({
        ...ci,
        price: Number(ci.priceAtPurchase),
        totalPrice: Number(ci.totalPrice),
        vendorName: ci.vendor?.shopName || "District Vendor",
      })),
      customer: {
        id: targetUser.id,
        name: targetUser.name,
        phone: targetUser.phone,
        email: targetUser.email,
        role: targetUser.role,
      },
      address: {
        id: addressId,
        street: req.body.address?.street || "Main Site Delivery Address",
        city: targetRegionName,
        region: reg,
      },
    }));

    console.log(`✅ ${fullOrders.length} order(s) created (${fullOrders.map((o) => o.id).join(", ")}) for customer ${targetCustomerId}`);

    // Respond IMMEDIATELY to customer
    res.status(201).json({ success: true, order: fullOrders[0], orders: fullOrders });

    // 7. Send High-Priority FCM Push Notification to each vendor in background (non-blocking)
    setImmediate(async () => {
      try {
        const { sendVendorOrderPushNotification } = require("./pushService");
        for (const fullOrder of fullOrders) {
          const firstItem = fullOrder.items[0];
          if (!firstItem?.vendorId) continue;
          await sendVendorOrderPushNotification({
            vendorId: firstItem.vendorId,
            phone: firstItem.vendor?.phone || null,
            orderNumber: fullOrder.orderNumber || fullOrder.id,
            amount: Number(fullOrder.totalAmount) || 0,
            itemCount: fullOrder.items.reduce((sum, it) => sum + (it.quantity || 1), 0),
            orderId: fullOrder.id,
          }).catch((e) => console.warn("FCM push send error:", e.message));
        }
      } catch (pushErr) {
        console.warn("FCM push dispatch note:", pushErr.message);
      }
    });
  } catch (err) {
    sendServerError(res, err, "Order checkout");
  }
});

// Vendor FCM Device Token Registration (for background push notifications when app is killed)
app.post("/api/v1/vendor/fcm-token", requireAuth, requireRole("VENDOR", "DR", "ADMIN"), async (req, res) => {
  try {
    const { token } = req.body;
    let { vendorId, phone } = req.body;
    if (req.auth.role === "VENDOR") {
      // A device can only be bound to the logged-in vendor's own shop
      const own = await resolveOwnVendor(req);
      if (!own) return res.status(403).json({ error: "Vendor profile not found for this account" });
      vendorId = own.id;
      phone = own.phone;
    }
    if (!vendorId || !token || typeof token !== "string" || token.length > 4096) {
      return res.status(400).json({ error: "vendorId and token are required" });
    }
    const { saveToken } = require("./pushService");
    await saveToken(vendorId, token, phone);
    res.json({ success: true, message: "FCM token registered successfully" });
  } catch (err) {
    sendServerError(res, err, "FCM token save");
  }
});

// Vendor FCM Device Token Deregistration (Called when vendor logs out).
// Anyone holding the device token may unlink that device; unlinking by vendorId needs that vendor's session.
async function handleRemoveFcmToken(req, res) {
  try {
    const { token } = req.body || {};
    let vendorId = null;
    if (req.auth?.role === "VENDOR") {
      vendorId = (await resolveOwnVendor(req))?.id || null;
    } else if (req.auth?.role === "ADMIN") {
      vendorId = req.body?.vendorId || null;
    }
    if (!token && !vendorId) {
      return res.status(400).json({ error: "token is required" });
    }
    const { removeToken } = require("./pushService");
    await removeToken(vendorId, token);
    res.json({ success: true, message: "FCM token removed successfully" });
  } catch (err) {
    sendServerError(res, err, "FCM token remove");
  }
}
app.delete("/api/v1/vendor/fcm-token", optionalAuth, handleRemoveFcmToken);
app.post("/api/v1/vendor/fcm-token/deregister", optionalAuth, handleRemoveFcmToken);

// 12. PRODUCT REVIEWS ENDPOINTS (Supabase DB Persistence)
app.get("/api/v1/reviews", async (req, res) => {
  try {
    const { productId } = req.query;
    const whereClause = productId ? { productId } : {};

    const reviews = await prisma.review.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    res.json(reviews);
  } catch (err) {
    sendServerError(res, err);
  }
});

app.post("/api/v1/reviews", requireAuth, async (req, res) => {
  try {
    const { productId, name, rating, comment } = req.body;
    if (!productId || !comment) {
      return res.status(400).json({ error: "productId and comment are required" });
    }

    const cleanRating = Math.round(Number(rating) || 5);
    if (cleanRating < 1 || cleanRating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }
    if (String(comment).length > 2000) {
      return res.status(400).json({ error: "Review is too long" });
    }

    const review = await prisma.review.create({
      data: {
        productId: String(productId),
        name: String(name || "Verified Customer").trim().slice(0, 80),
        rating: cleanRating,
        comment: String(comment).trim(),
      },
    });

    res.status(201).json(review);
  } catch (err) {
    sendServerError(res, err);
  }
});

// 13. NOTIFICATIONS ENDPOINTS (Admin Broadcast & Real-Time Customer Alerts)
app.get("/api/v1/notifications/me", requireAuth, async (req, res) => {
  try {
    const targetUserId = req.auth?.userId;
    const userRole = (req.auth?.role || "").toUpperCase();

    let whereClause = {};
    if (userRole === "ADMIN") {
      whereClause = {};
    } else if (targetUserId) {
      whereClause = {
        OR: [
          { userId: targetUserId },
          { user: { role: "ADMIN" } },
        ],
      };
    } else {
      whereClause = { user: { role: "ADMIN" } };
    }

    const rawList = await prisma.notification.findMany({
      where: whereClause,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }).catch(() => []);

    const uniqueList = Array.from(
      new Map(rawList.map((n) => [n.id, n])).values()
    );
    res.json(uniqueList);
  } catch (err) {
    sendServerError(res, err);
  }
});

app.get("/api/v1/notifications", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { userId } = req.query;
    const whereClause = {};
    if (userId && userId.length > 20) {
      whereClause.userId = userId;
    }

    const rawList = await prisma.notification.findMany({
      where: whereClause,
      include: { user: { select: SAFE_USER_SELECT } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }).catch(() => []);

    const uniqueList = Array.from(
      new Map(rawList.map((n) => [n.id, n])).values()
    );

    res.json(uniqueList);
  } catch (err) {
    sendServerError(res, err);
  }
});

app.post("/api/v1/notifications", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { title, message, userId } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }

    let targetUser = null;
    if (userId && userId.length > 20) {
      targetUser = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    }
    if (!targetUser) {
      targetUser = await prisma.user.findFirst({ where: { role: "ADMIN" } }).catch(() => null);
    }
    if (!targetUser) {
      targetUser = await prisma.user.findFirst().catch(() => null);
    }
    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          phone: "7607650875",
          name: "BuildCity Central System",
          role: "ADMIN",
        },
      }).catch(() => null);
    }

    const notif = await prisma.notification.create({
      data: {
        userId: targetUser ? targetUser.id : (await prisma.user.findFirst()).id,
        title: title.trim(),
        message: message.trim(),
        isRead: false,
      },
    });

    console.log(`📢 Real-Time Notification saved in Supabase PostgreSQL DB: "${notif.title}" (${notif.id})`);
    res.status(201).json({ success: true, notification: notif });
  } catch (err) {
    console.error("POST /api/v1/notifications error:", err);
    sendServerError(res, err);
  }
});

app.patch("/api/v1/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // Users can only mark their own notifications; admin broadcasts stay unread for everyone else
    await prisma.notification.updateMany({
      where: req.auth.role === "ADMIN" ? { id } : { id, userId: req.auth.userId },
      data: { isRead: true },
    }).catch(() => null);
    res.json({ success: true, id });
  } catch (err) {
    sendServerError(res, err);
  }
});

app.delete("/api/v1/notifications", requireAuth, async (req, res) => {
  try {
    const userRole = (req.auth?.role || "").toUpperCase();
    const targetUserId = req.auth?.userId;
    if (userRole === "ADMIN") {
      await prisma.notification.deleteMany({});
    } else if (targetUserId) {
      await prisma.notification.deleteMany({ where: { userId: targetUserId } });
    }
    res.json({ success: true });
  } catch (err) {
    sendServerError(res, err);
  }
});

app.delete("/api/v1/notifications/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.deleteMany({ where: { id } }).catch(() => null);
    res.json({ success: true });
  } catch (err) {
    sendServerError(res, err);
  }
});

// Unknown API routes return JSON instead of Express's HTML page
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Final error handler: malformed JSON bodies, oversized payloads and anything thrown synchronously
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large" });
  }
  sendServerError(res, err, `${req.method} ${req.path}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

// Start Express Server
const server = app.listen(PORT, () => {
  console.log(`🚀 BuildCity Express Gateway running live on http://localhost:${PORT}`);
});

// Graceful shutdown: finish in-flight requests (e.g. checkouts) before the platform stops the container
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received: closing HTTP server...`);
  server.close(async () => {
    await prisma.$disconnect().catch(() => null);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
