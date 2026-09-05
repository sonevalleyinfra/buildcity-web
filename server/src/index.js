require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { issueToken, requireAuth, requireRole, requireSelfOrAdmin } = require("./middleware/auth");

const app = express();
app.set("trust proxy", 1);
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Security Headers & Protection
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.disable("x-powered-by");

// Enable CORS & JSON Parsing
app.use(cors());
app.use(express.json());

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

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10,
  keyGenerator: (req) => String(req.body?.phone || req.ip),
  message: { error: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Health Check Endpoint
let couponsList = [
  { id: "cp-1", code: "BUILDCITY100", title: "Flat ₹100 OFF", minOrder: 1000, discountAmount: 100, expiryDate: "2026-12-31", isActive: true, desc: "Valid on orders above ₹1,000" },
  { id: "cp-2", code: "SUPER500", title: "Flat ₹500 OFF", minOrder: 5000, discountAmount: 500, expiryDate: "2026-12-31", isActive: true, desc: "Bulk order discount above ₹5,000" },
  { id: "cp-3", code: "WELCOME200", title: "Flat ₹200 OFF", minOrder: 1500, discountAmount: 200, expiryDate: "2026-12-31", isActive: true, desc: "Special welcome coupon for new site orders" },
];

// Single Unified Cloud Sync Endpoint (Replaces 7 separate HTTP requests with 1 request to free browser TCP sockets)
app.get("/api/v1/cloud-sync", requireAuth, requireRole("ADMIN", "DR", "VENDOR"), async (req, res) => {
  try {
    const [drs, vendors, masterProducts, categories, regions, orders, listings, coupons] = await Promise.all([
      prisma.dR.findMany({
        include: { region: true, user: { select: { id: true, name: true, phone: true, email: true, role: true } } },
        orderBy: { joinedOn: "desc" },
      }).then(list => list.map(d => { const { password, ...safe } = d; return safe; })).catch(() => []),
      prisma.vendor.findMany({
        include: { region: true, user: { select: { id: true, name: true, phone: true, email: true, role: true } }, vendorProducts: true },
        orderBy: { joinedOn: "desc" },
      }).then(list => list.map(v => { const { password, ...safe } = v; return safe; })).catch(() => []),
      prisma.productMaster.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } }).catch(() => []),
      prisma.category.findMany().catch(() => []),
      prisma.region.findMany().catch(() => []),
      prisma.order.findMany({ include: { items: true, customer: { select: { id: true, name: true, phone: true, email: true, role: true } }, address: true }, orderBy: { createdAt: "desc" } }).catch(() => []),
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
    ]);

    res.json({
      drs,
      vendors,
      masterProducts,
      categories,
      regions,
      orders,
      listings,
      coupons: coupons || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Password Login Endpoint — Phone & Password Login for Admin, DR, and Vendor Partners
app.post("/api/v1/auth/vendor/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
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
        drInfo: drInDb || null,
        tokenVersion: userInDb?.tokenVersion || drInDb?.user?.tokenVersion || 1,
      };
      const token = issueToken(drUserObj);

      return res.json({
        success: true,
        token,
        user: drUserObj,
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

    res.json({
      success: true,
      token,
      user: vendorUserObj,
      vendor,
    });
  } catch (err) {
    console.error("Vendor Login Error:", err);
    res.status(500).json({ error: err.message || "Vendor authentication failed." });
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

const { sendRealSMSOTP } = require("./smsService");

// 1. AUTHENTICATION & USERS ENDPOINTS (INSTANT HIGH SPEED OPTIMIZED)
app.post("/api/v1/auth/otp/request", otpRequestLimiter, async (req, res) => {
  const { phone, type = "login" } = req.body;
  if (!phone || !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: "Valid 10-digit phone number required" });
  }

  try {
    // Clean 10-digit mobile number
    const cleanPhone = phone.trim().replace(/\D/g, "").slice(-10);

    // STRICT CUSTOMER ONLY RESTRICTION: Block Mobile OTP for Vendor, DR, and Admin accounts
    const isSpecialAdminOrDr = cleanPhone === "9999999999" || cleanPhone === "7777777777";
    const drExists = await prisma.dR.findFirst({ where: { OR: [{ phone: cleanPhone }, { phone }] } }).catch(() => null);
    const vendorExists = await prisma.vendor.findFirst({ where: { OR: [{ phone: cleanPhone }, { phone }] } }).catch(() => null);
    const staffUser = await prisma.user.findFirst({ where: { phone: cleanPhone, role: { in: ["ADMIN", "DR", "VENDOR"] } } }).catch(() => null);

    if (isSpecialAdminOrDr || drExists || vendorExists || staffUser) {
      return res.status(403).json({
        error: "Vendor, DR, and Admin accounts cannot log in using Mobile OTP. Please click 'Partner Login (Password)' at the bottom to log in with your Password.",
        isStaffBlocked: true,
      });
    }
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
    }

    // Check if user exists in database
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: { contains: cleanPhone.slice(-10) } },
        ],
      },
    }).catch(() => null);

    // If logging in, user MUST be registered in database
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

    // 90-second per-phone cooldown check (safely handling server clock timezone differences)
    const lastOtp = await prisma.oTPVerification.findFirst({
      where: { OR: [{ phone: cleanPhone }, { phone }] },
      orderBy: { createdAt: "desc" },
    }).catch(() => null);

    if (lastOtp && lastOtp.createdAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000);
      if (elapsedSeconds >= 0 && elapsedSeconds < 90) {
        const remaining = Math.min(90, Math.max(1, 90 - elapsedSeconds));
        return res.status(429).json({ error: `Please wait ${remaining}s before requesting a new OTP` });
      }
    }

    // Generate 6-digit OTP code instantly
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    // Save OTP record in DB
    await prisma.oTPVerification.create({
      data: {
        phone: cleanPhone,
        otp: generatedOtp,
        expiresAt,
        createdAt: new Date(),
      },
    }).catch((e) => console.warn("Background OTP save note:", e.message));

    // Dispatch Live SMS via Aradhya Technologies SMS Gateway (Ultra-Fast Concurrent Dispatch)
    sendRealSMSOTP(cleanPhone, generatedOtp).catch((smsErr) => {
      console.warn("[Background SMS Notice]:", smsErr.message);
    });

    return res.json({
      success: true,
      message: `OTP dispatched to +91 ${cleanPhone.slice(-10)}`,
      gateway: "AradhyaSMS",
      smsStatus: "dispatched",
      isRegistered: !!existingUser,
    });
  } catch (err) {
    console.error("OTP dispatch error:", err);
    res.status(500).json({ error: "Failed to dispatch OTP", details: err.message });
  }
});

app.post("/api/v1/auth/otp/verify", otpVerifyLimiter, async (req, res) => {
  const { phone, otp, name } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP required" });

  try {
    const cleanPhone = phone.trim().replace(/\D/g, "").slice(-10);

    // STRICT CUSTOMER ONLY RESTRICTION: Staff/Partners cannot log in via OTP
    const isSpecialAdminOrDr = cleanPhone === "9999999999" || cleanPhone === "7777777777";
    const drExistsVerify = await prisma.dR.findFirst({ where: { OR: [{ phone: cleanPhone }, { phone }] } }).catch(() => null);
    const vendorExistsVerify = await prisma.vendor.findFirst({ where: { OR: [{ phone: cleanPhone }, { phone }] } }).catch(() => null);
    const staffUserVerify = await prisma.user.findFirst({ where: { phone: cleanPhone, role: { in: ["ADMIN", "DR", "VENDOR"] } } }).catch(() => null);

    if (isSpecialAdminOrDr || drExistsVerify || vendorExistsVerify || staffUserVerify) {
      return res.status(403).json({
        error: "Vendor, DR, and Admin accounts cannot log in using Mobile OTP. Please click 'Partner Login (Password)' at the bottom to log in with your Password.",
        isStaffBlocked: true,
      });
    }

    let isValid = false;

    // Strict OTP verification against DB generated OTP code
    const validRecord = await prisma.oTPVerification.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: phone.trim() }
        ],
        otp: otp.trim(),
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => null);

    if (validRecord) {
      isValid = true;
    }

    if (!isValid) {
      return res.status(401).json({ error: "Invalid or expired OTP. Please enter the exact OTP code sent to your mobile." });
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: { contains: cleanPhone.slice(-10) } },
        ],
      },
    }).catch(() => null);

    if (user) {
      // If customer provided a new/updated name during registration, save it
      if (name && name.trim().length >= 2 && user.name !== name.trim()) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: name.trim() },
        }).catch(() => user);
      }
    } else {
      // Create new user in DB with exact Name
      const customerName = name && name.trim().length >= 2 ? name.trim() : `Customer ${cleanPhone.slice(-4)}`;
      user = await prisma.user.create({
        data: {
          phone: cleanPhone,
          name: customerName,
          role: "CUSTOMER",
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
    console.error("Auth verify error:", err);
    res.status(500).json({ error: "Authentication failed", details: err.message });
  }
});

// Fetch Current Authenticated User Profile (Zero PII in URL)
app.get("/api/v1/users/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// Update Profile (Name, Email) in Supabase PostgreSQL
app.put("/api/v1/users/profile", requireAuth, async (req, res) => {
  try {
    const { phone, name, email } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: { phone, name: name || "User", email, role: "CUSTOMER", tokenVersion: 1 },
      });
    } else {
      user = await prisma.user.update({
        where: { phone },
        data: {
          name: name !== undefined ? name : user.name,
          email: email !== undefined ? email : user.email,
        },
      });
    }

    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/v1/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
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
    });

    const sanitizedUsers = users.map((u) => {
      const { password, ...safeUser } = u;
      return safeUser;
    });
    res.json(sanitizedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { phone, name, role, email } = req.body;
    const newUser = await prisma.user.create({
      data: {
        phone,
        name: name || "User",
        email,
        role: role || "CUSTOMER",
        tokenVersion: 1,
      },
    });
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. DISTRICT REPRESENTATIVE (DR) ENDPOINTS
app.get("/api/v1/drs", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const drs = await prisma.dR.findMany({
      include: { region: true, user: { select: { id: true, name: true, phone: true, email: true, role: true } } },
      orderBy: { joinedOn: "desc" },
    });
    const safeDrs = drs.map(d => { const { password, ...safe } = d; return safe; });
    res.json(safeDrs);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// 3. VENDOR ENDPOINTS
app.get("/api/v1/vendors", requireAuth, requireRole("ADMIN", "DR"), async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: { region: true, user: { select: { id: true, name: true, phone: true, email: true, role: true } } },
      orderBy: { joinedOn: "desc" },
    });
    const safeVendors = vendors.map(v => { const { password, ...safe } = v; return safe; });
    res.json(safeVendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    // 3. Create real Region record in DB if not existing
    if (!validRegion) {
      validRegion = await prisma.region.create({
        data: {
          name: reqRegName.trim(),
          state: "Uttar Pradesh",
          priceFactor: reqRegName.toLowerCase().includes("mirzapur") ? 1.05 : 1.0,
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// Vendor Delete Endpoint — Admin ya DR dwara Vendor ko Supabase DB se permanent delete karne ke liye (Foreign Key cleanup ke sath)
app.delete("/api/v1/vendors/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
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

    if (vendor) {
      const targetId = vendor.id;
      // Foreign Key constraint satisfied karne ke liye child records pehle delete karein
      await prisma.vendorProduct.deleteMany({ where: { vendorId: targetId } }).catch(() => null);
      await prisma.orderItem.deleteMany({ where: { vendorId: targetId } }).catch(() => null);
      await prisma.vendor.delete({ where: { id: targetId } }).catch(() => null);
    }

    res.json({ message: "Vendor deleted successfully from Supabase DB", id: rawId });
  } catch (err) {
    console.error("Delete vendor endpoint error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4. MASTER PRODUCT CATALOG ENDPOINTS
app.get("/api/v1/master-products", async (req, res) => {
  try {
    const products = await prisma.productMaster.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/vendor/listings", requireAuth, requireRole("VENDOR", "DR", "ADMIN"), async (req, res) => {
  try {
    let { masterProductId, vendorId, vendorName, regionId, regionName, price, stockQty, addedBy } = req.body;

    let masterProd = masterProductId ? await prisma.productMaster.findUnique({ where: { id: masterProductId }, include: { category: true } }).catch(() => null) : null;

    if (!masterProd) {
      masterProd = await prisma.productMaster.findFirst({ include: { category: true } }).catch(() => null);
    }

    if (!masterProd) {
      const cat = await prisma.category.findFirst().catch(() => null);
      masterProd = await prisma.productMaster.create({
        data: {
          name: "UltraTech Super PPC Cement",
          categoryId: cat ? cat.id : "c1",
          brand: "UltraTech",
          type: "PPC Cement",
          grade: "OPC 53 Grade",
          unit: "50kg Bag",
          suggestedPrice: 390,
          imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80",
          addedBy: "Admin",
        },
        include: { category: true },
      });
    }

    let vendor = null;
    if (vendorId) {
      vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, include: { region: true } }).catch(() => null);
    }
    if (!vendor && (vendorName || vendorId)) {
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

    let targetRegName = req.body.regionName || req.body.districtName || vendor?.region?.name;
    
    // If regionId is passed as seed string ("r2" or "r1"), map to real names
    if (!targetRegName && regionId) {
      if (regionId === "r2" || regionId.toLowerCase().includes("mirzapur")) targetRegName = "Mirzapur";
      else if (regionId === "r1" || regionId.toLowerCase().includes("varanasi")) targetRegName = "Varanasi";
    }

    if (!targetRegName) targetRegName = "Mirzapur";

    // Find matching region in DB (by UUID or name)
    let matchedRegion = null;
    if (regionId && regionId.length > 10) {
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
          priceFactor: targetRegName.toLowerCase().includes("mirzapur") ? 1.05 : 1.0,
          baseDeliveryCharge: 49,
          isActive: true,
        },
      }).catch(async () => {
        return await prisma.region.findFirst().catch(() => null);
      });
    }

    if (!vendor) {
      const user = await prisma.user.create({
        data: { phone: "98765" + Math.floor(10000 + Math.random() * 89999), name: vendorName || "Vendor Partner", role: "VENDOR" },
      });
      vendor = await prisma.vendor.create({
        data: {
          userId: user.id,
          shopName: vendorName || "Distributor Store",
          ownerName: "Vendor Owner",
          phone: user.phone,
          regionId: matchedRegion.id,
          commissionRate: 10,
          status: "APPROVED",
        },
        include: { region: true },
      });
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

    const isAutoApproved = addedBy === "Admin" || addedBy === "DR";

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
        price: Number(price) || Number(masterProd.suggestedPrice) || 100,
        stockQty: Number(stockQty) || 100,
        imageUrl: masterProd.imageUrl,
        approvalStatus: isAutoApproved ? "APPROVED" : "PENDING_REVIEW",
        isActive: isAutoApproved ? true : false,
        addedBy: addedBy || "Vendor",
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
    res.status(500).json({ error: err.message });
  }
});

// Vendor Update Product Listing (Price & Stock Live Update)
app.patch("/api/v1/vendor/listings/:id", requireAuth, requireRole("VENDOR", "DR", "ADMIN"), async (req, res) => {
  try {
    const rawId = req.params.id;
    const { price, stockQty, approvalStatus, isActive } = req.body;

    let listing = await prisma.vendorProduct.findUnique({ where: { id: rawId } }).catch(() => null);

    if (listing) {
      const updateData = {};
      if (price !== undefined && !isNaN(Number(price))) updateData.price = Number(price);
      if (stockQty !== undefined && !isNaN(Number(stockQty))) updateData.stockQty = Number(stockQty);
      if (approvalStatus !== undefined) {
        updateData.approvalStatus = approvalStatus;
        updateData.isActive = approvalStatus === "APPROVED";
      }
      if (isActive !== undefined) updateData.isActive = isActive;

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
    console.error("Patch listing error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/v1/vendor/listings/:id/status", requireAuth, requireRole("ADMIN", "DR"), async (req, res) => {
  try {
    const rawId = req.params.id;
    const { approvalStatus } = req.body; // PENDING_REVIEW | APPROVED | REJECTED

    let listing = await prisma.vendorProduct.findUnique({ where: { id: rawId } }).catch(() => null);

    if (!listing && rawId) {
      listing = await prisma.vendorProduct.findFirst({
        where: { id: rawId },
      }).catch(() => null);
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
    res.status(500).json({ error: err.message });
  }
});

// 6. CATEGORIES & REGIONS ENDPOINTS
app.get("/api/v1/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/v1/regions", async (req, res) => {
  try {
    const regions = await prisma.region.findMany({ orderBy: { name: "asc" } });
    res.json(regions);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.json(updated);
  } catch (err) {
    console.error("Patch region error:", err.message);
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// 7. ORDERS & CHECKOUT ENDPOINTS (With Vendor Isolation & Status Updates)
app.get("/api/v1/orders", requireAuth, requireRole("ADMIN", "DR"), async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        customer: true,
        address: { include: { region: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Isolated Orders Fetch (Self by Token or Admin)
app.get("/api/v1/orders/me", requireAuth, async (req, res) => {
  try {
    const targetUserId = req.auth?.userId;
    const cleanPhone = (req.auth?.phone || "").replace(/\D/g, "");

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          ...(targetUserId ? [{ customerId: targetUserId }] : []),
          ...(cleanPhone ? [{ customer: { phone: { contains: cleanPhone.slice(-10) } } }] : []),
          ...(cleanPhone ? [{ address: { phone: { contains: cleanPhone.slice(-10) } } }] : []),
        ],
      },
      include: { items: true, customer: true, address: true },
      orderBy: { createdAt: "desc" },
    }).catch(() => []);

    res.json(orders || []);
  } catch (err) {
    res.json([]);
  }
});

// Customer Isolated Orders Fetch (Self or Admin by Param)
app.get("/api/v1/orders/user/:userId", requireAuth, requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const targetUserId = req.auth?.role === "ADMIN" ? req.params.userId : (req.auth?.userId || req.params.userId);
    const cleanPhone = (req.auth?.phone || req.params.userId || "").replace(/\D/g, "");

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: targetUserId },
          ...(cleanPhone ? [{ customer: { phone: { contains: cleanPhone.slice(-10) } } }] : []),
          ...(cleanPhone ? [{ address: { phone: { contains: cleanPhone.slice(-10) } } }] : []),
        ],
      },
      include: { items: true, customer: true, address: true },
      orderBy: { createdAt: "desc" },
    }).catch(() => []);

    res.json(orders || []);
  } catch (err) {
    res.json([]);
  }
});

// Strict Vendor Isolated Orders Fetch
app.get("/api/v1/orders/vendor/:vendorId", requireAuth, requireRole("VENDOR", "DR", "ADMIN"), async (req, res) => {
  try {
    const { vendorId } = req.params;
    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { id: vendorId },
          { phone: vendorId.replace(/^v-/, "") },
          { shopName: { equals: vendorId, mode: "insensitive" } },
        ],
      },
    }).catch(() => null);

    const allOrders = await prisma.order.findMany({
      include: { items: true, customer: true, address: true },
      orderBy: { createdAt: "desc" },
    });

    if (!allOrders || allOrders.length === 0) {
      return res.json([]);
    }

    const vId = vendor?.id || vendorId;
    const vShop = (vendor?.shopName || vendorId).toLowerCase().trim();

    const filtered = allOrders.filter((o) =>
      o.items && o.items.some((it) => {
        const matchesId = it.vendorId && (it.vendorId === vId || it.vendorId === vendorId);
        const itShop = (it.vendorName || "").toLowerCase().trim();
        const matchesShop = vShop && itShop && (vShop.includes(itShop) || itShop.includes(vShop));
        return matchesId || matchesShop;
      })
    );

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Order Status (Vendor & Admin with Auto Stock Restore on Cancel)
app.patch("/api/v1/orders/:id/status", requireAuth, requireRole("VENDOR", "DR", "ADMIN"), async (req, res) => {
  try {
    const { status } = req.body; // PENDING | PROCESSING | OUT_FOR_DELIVERY | DELIVERED | CANCELLED
    const previousOrder = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    }).catch(() => null);

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { items: true, customer: true },
    });

    // Restore reserved quantity back to DB inventory when order is cancelled or rejected
    if (status === "CANCELLED" && previousOrder && previousOrder.status !== "CANCELLED" && Array.isArray(previousOrder.items)) {
      for (const item of previousOrder.items) {
        try {
          const vp = await prisma.vendorProduct.findFirst({
            where: {
              name: { equals: item.productName, mode: "insensitive" },
            },
          }).catch(() => null);

          if (vp) {
            await prisma.vendorProduct.update({
              where: { id: vp.id },
              data: { stockQty: { increment: Number(item.quantity || 1) } },
            }).catch(() => null);
            console.log(`✓ Restored ${item.quantity} units to inventory stock for product "${vp.name}"`);
          }
        } catch (e) {
          console.warn("Stock restore note:", e.message);
        }
      }
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
        data: { name: regName.trim(), state: state || "Uttar Pradesh", priceFactor: 1.0, baseDeliveryCharge: 49, isActive: true },
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/orders/checkout", requireAuth, async (req, res) => {
  try {
    const { customerId, totalAmount, deliveryFee, items, idempotencyKey } = req.body;

    if (idempotencyKey) {
      const existingOrder = await prisma.order.findUnique({ where: { idempotencyKey }, include: { items: true, customer: true, address: true } });
      if (existingOrder) {
        return res.json({ success: true, order: existingOrder, isDuplicate: true });
      }
    }

    // 1. Resolve or create valid User in Supabase DB (FK-Safe UUID Resolution)
    let targetCustomerId = null;
    let targetUser = null;

    const incomingPhone = (
      req.body.phone ||
      req.body.address?.phone ||
      (typeof customerId === "string" && customerId.startsWith("cust_") ? customerId.replace("cust_", "") : "") ||
      (typeof customerId === "string" && !customerId.includes("-") ? customerId : "")
    ).replace(/\D/g, "");

    // A. Check if customerId is a valid UUID in users table
    if (customerId && customerId.length > 20 && !customerId.startsWith("cust_") && !customerId.startsWith("user_")) {
      targetUser = await prisma.user.findUnique({ where: { id: customerId } }).catch(() => null);
    }

    // B. Check by phone number
    if (!targetUser && incomingPhone && incomingPhone.length >= 8) {
      targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: incomingPhone },
            { phone: { contains: incomingPhone.slice(-10) } },
          ],
        },
      }).catch(() => null);
    }

    // C. If user not found, create new customer user in DB
    if (!targetUser) {
      const userPhone = incomingPhone && incomingPhone.length >= 10 ? incomingPhone : `cust_${Date.now()}`;
      targetUser = await prisma.user.create({
        data: {
          phone: userPhone,
          name: req.body.address?.fullName || "Customer",
          role: "CUSTOMER",
          tokenVersion: 1,
        },
      }).catch(async () => {
        return await prisma.user.findFirst({ where: { role: "CUSTOMER" } }).catch(() => null);
      });
    }

    if (!targetUser) {
      targetUser = await prisma.user.findFirst().catch(() => null);
    }

    targetCustomerId = targetUser?.id;

    // Ensure we always have a valid default Vendor for OrderItem relations
    let defaultVendor = await prisma.vendor.findFirst().catch(() => null);

    // Customer Address Save / Link Logic (FK-Safe UUID Resolution)
    let addressId = null;
    if (req.body.address || req.body.districtName || req.body.regionId) {
      const addrObj = req.body.address || {};
      const streetStr = typeof addrObj === "string" ? addrObj : (addrObj.street || addrObj.line || addrObj.address || "Main Site Delivery Address");
      const fullNameStr = typeof addrObj === "object" ? (addrObj.fullName || addrObj.name || "Customer") : "Customer";
      const phoneStr = typeof addrObj === "object" ? (addrObj.phone || targetUser?.phone || "") : (targetUser?.phone || "");

      // Robust Region Resolution: check regionId first, then districtName, then address city
      let reg = null;
      if (req.body.regionId && req.body.regionId.length > 10) {
        reg = await prisma.region.findUnique({ where: { id: req.body.regionId } }).catch(() => null);
      }
      if (!reg && req.body.districtName) {
        reg = await prisma.region.findFirst({
          where: { name: { equals: req.body.districtName.trim(), mode: "insensitive" } },
        }).catch(() => null);
      }
      if (!reg && addrObj.city) {
        reg = await prisma.region.findFirst({
          where: { name: { equals: addrObj.city.trim(), mode: "insensitive" } },
        }).catch(() => null);
      }
      if (!reg) {
        const allRegs = await prisma.region.findMany().catch(() => []);
        const targetSearch = (req.body.districtName || addrObj.city || "").toLowerCase().trim();
        if (targetSearch) {
          reg = allRegs.find((r) => targetSearch.includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(targetSearch)) || null;
        }
      }
      if (!reg) {
        reg = await prisma.region.findFirst().catch(() => null);
      }

      const cityStr = typeof addrObj === "object" && addrObj.city ? addrObj.city : (reg ? reg.name : (req.body.districtName || "Mirzapur"));

      if (reg && reg.id && targetCustomerId) {
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
              fullName: fullNameStr,
              phone: phoneStr,
              street: streetStr,
              city: cityStr,
              state: typeof addrObj === "object" ? (addrObj.state || "Uttar Pradesh") : "Uttar Pradesh",
              pincode: typeof addrObj === "object" ? (addrObj.pincode || "221001") : "221001",
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

    // Calculate server-validated order total, verify region availability & stock
    let serverTotalAmount = 0;
    const validatedItems = [];
    const targetRegionName = (req.body.districtName || req.body.address?.city || req.body.address?.district || "Varanasi").trim();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items in order." });
    }

    for (const item of items) {
      const rawQty = item.quantity;
      const itemQty = Number(rawQty);
      const prodName = item.name || item.productName || item.title || "";

      if (!Number.isInteger(itemQty) || itemQty < 1) {
        return res.status(400).json({ error: `Invalid quantity for product: ${prodName || "Item"}` });
      }

      // Fetch live vendor product from Supabase DB
      let liveVp = null;

      if (item.id || item.productId) {
        liveVp = await prisma.vendorProduct.findFirst({
          where: {
            id: item.id || item.productId,
            approvalStatus: "APPROVED",
            isActive: true,
          },
          include: { vendor: { include: { region: true } } },
        }).catch(() => null);
      }

      if (!liveVp && prodName) {
        liveVp = await prisma.vendorProduct.findFirst({
          where: {
            name: { equals: prodName, mode: "insensitive" },
            approvalStatus: "APPROVED",
            isActive: true,
            OR: [
              { regionName: { equals: targetRegionName, mode: "insensitive" } },
              { vendor: { region: { name: { equals: targetRegionName, mode: "insensitive" } } } },
            ],
          },
          include: { vendor: { include: { region: true } } },
        }).catch(() => null);
      }

      if (!liveVp && prodName) {
        liveVp = await prisma.vendorProduct.findFirst({
          where: {
            name: { equals: prodName, mode: "insensitive" },
            approvalStatus: "APPROVED",
            isActive: true,
          },
          include: { vendor: { include: { region: true } } },
        }).catch(() => null);
      }

      if (!liveVp) {
        return res.status(400).json({ error: `Product not available: ${prodName || item.id || "Item"}` });
      }

      const verifiedPrice = Number(liveVp.price);
      if (isNaN(verifiedPrice) || verifiedPrice <= 0) {
        return res.status(400).json({ error: `Invalid product price in database for ${liveVp.name}` });
      }

      const itemTotal = itemQty * verifiedPrice;
      serverTotalAmount += itemTotal;

      // Atomically decrement stock in DB if stock exists
      if (liveVp.stockQty && liveVp.stockQty > 0) {
        await prisma.vendorProduct.update({
          where: { id: liveVp.id },
          data: { stockQty: { decrement: Math.min(liveVp.stockQty, itemQty) } },
        }).catch(() => null);
      }

      let targetVendor = liveVp.vendor || null;

      validatedItems.push({
        productName: liveVp.name || prodName,
        priceAtPurchase: verifiedPrice,
        quantity: itemQty,
        totalPrice: itemTotal,
        vendorId: targetVendor ? targetVendor.id : (defaultVendor ? defaultVendor.id : item.vendorId),
      });
    }

    // Robust Region resolution for accurate District Delivery Fee
    let regForDelivery = null;
    const reqRegionId = req.body.regionId;

    if (reqRegionId && reqRegionId.length > 10) {
      regForDelivery = await prisma.region.findUnique({ where: { id: reqRegionId } }).catch(() => null);
    }

    if (!regForDelivery && targetRegionName) {
      regForDelivery = await prisma.region.findFirst({
        where: { name: { equals: targetRegionName, mode: "insensitive" } },
      }).catch(() => null);
    }

    if (!regForDelivery && targetRegionName) {
      const allRegions = await prisma.region.findMany().catch(() => []);
      regForDelivery = allRegions.find((r) =>
        targetRegionName.toLowerCase().includes(r.name.toLowerCase()) ||
        r.name.toLowerCase().includes(targetRegionName.toLowerCase())
      ) || null;
    }

    const calculatedDeliveryFee = regForDelivery ? Number(regForDelivery.baseDeliveryCharge) : 49;
    const finalOrderAmount = serverTotalAmount + calculatedDeliveryFee;

    const newOrder = await prisma.order.create({
      data: {
        customerId: targetCustomerId,
        addressId,
        totalAmount: finalOrderAmount,
        deliveryFee: calculatedDeliveryFee,
        paymentMode: "COD",
        status: "PENDING",
        idempotencyKey,
      },
    });

    for (const vItem of validatedItems) {
      const vId = vItem.vendorId || defaultVendor?.id;
      if (vId) {
        await prisma.orderItem.create({
          data: {
            orderId: newOrder.id,
            productName: vItem.productName,
            priceAtPurchase: vItem.priceAtPurchase,
            quantity: vItem.quantity,
            totalPrice: vItem.totalPrice,
            vendorId: vId,
          },
        }).catch((e) => console.warn("OrderItem creation note:", e.message));
      }
    }

    const fullOrder = await prisma.order.findUnique({
      where: { id: newOrder.id },
      include: { items: true, customer: true, address: true },
    });

    console.log(`✅ Order ${newOrder.id} created successfully for customer ${targetCustomerId}`);
    res.status(201).json({ success: true, order: fullOrder });
  } catch (err) {
    console.error("Order checkout error:", err);
    res.status(500).json({ error: err.message });
  }
});

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
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/reviews", requireAuth, async (req, res) => {
  try {
    const { productId, name, rating, comment } = req.body;
    if (!productId || !comment) {
      return res.status(400).json({ error: "productId and comment are required" });
    }

    const review = await prisma.review.create({
      data: {
        productId,
        name: (name || "Verified Customer").trim(),
        rating: Number(rating) || 5,
        comment: comment.trim(),
      },
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }).catch(() => []);

    const uniqueList = Array.from(
      new Map(rawList.map((n) => [n.id, n])).values()
    );
    res.json(uniqueList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/v1/notifications", requireAuth, async (req, res) => {
  try {
    const { userId } = req.query;
    const whereClause = {};
    if (userId && userId.length > 20) {
      whereClause.userId = userId;
    }

    const rawList = await prisma.notification.findMany({
      where: whereClause,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }).catch(() => []);

    const uniqueList = Array.from(
      new Map(rawList.map((n) => [n.id, n])).values()
    );

    res.json(uniqueList);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/v1/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    }).catch(() => null);
    res.json(notif || { success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/v1/notifications/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.deleteMany({ where: { id } }).catch(() => null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 BuildCity Express Gateway running live on http://localhost:${PORT}`);
});
