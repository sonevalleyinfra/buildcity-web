#!/usr/bin/env node
// Seeds the E2E accounts and catalog (ADR 0002 section 4). Idempotent: safe to re-run.
//   DATABASE_URL=... E2E_VENDOR_PASSWORD=... E2E_DR_PASSWORD=... E2E_ADMIN_PASSWORD=... node seed-test-accounts.js
// Writes only when the database is marked 'staging', or marked 'test' with APP_ENV=test on a loopback host.
// An unmarked database or anything else exits 2 with no writes. Passwords come from env only and are never printed.
"use strict";

const PASSWORD_VARS = ["E2E_VENDOR_PASSWORD", "E2E_DR_PASSWORD", "E2E_ADMIN_PASSWORD"];
const LOOPBACK = ["localhost", "127.0.0.1", "::1", "[::1]"];

const PHONES = { vendor: "1000000001", dr: "1000000002", admin: "9999999999" };
// The name contains "Varanasi" on purpose: the DR dashboard only lists orders of districts it can canonicalise
// (Varanasi, Mirzapur, Prayagraj, Jaunpur) and files everything else under Varanasi, so a district with an
// unrelated name would show the DR no orders.
const REGION_NAME = "E2E Varanasi";
const CATEGORY_NAME = "E2E Category";
const PRODUCT_NAME = "E2E Test Cement 50kg";
const DEFAULT_MIN_CASHBACK = 5000;

// Pure decision: returns { ok: true } or { ok: false, reason } (fixed strings, no URLs or values).
function decide({ appEnv, marker, databaseUrl, passwords }) {
  for (const k of PASSWORD_VARS) {
    if (!passwords || !passwords[k]) return { ok: false, reason: `${k} is not set` };
  }
  if (appEnv === "production") return { ok: false, reason: "APP_ENV=production" };
  if (!marker) {
    return {
      ok: false,
      reason:
        "database is not marked (buildcity.env unset); mark a local test DB with ALTER DATABASE ... SET buildcity.env = 'test'",
    };
  }
  if (String(marker).toLowerCase() === "production") return { ok: false, reason: "database marker is production" };
  if (marker === "staging") return { ok: true };
  if (marker !== "test") return { ok: false, reason: "database marker is not staging or test" };
  if (appEnv !== "test") return { ok: false, reason: "database marker is test but APP_ENV is not test" };
  // The marker (read from the connected DB) is the guard; node-pg honours ?host=, so the hostname is best-effort.
  let host = null;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    host = null;
  }
  if (host && LOOPBACK.includes(host)) return { ok: true };
  return { ok: false, reason: "database marker is test but DATABASE_URL is not a loopback host" };
}

async function readMarker(prisma) {
  const rows = await prisma.$queryRaw`SELECT current_setting('buildcity.env', true) AS env`;
  return (rows && rows[0] && rows[0].env) || null;
}

async function seed(prisma, bcrypt, passwords) {
  const hash = (p) => bcrypt.hash(p, 10);
  const [vendorHash, drHash, adminHash] = await Promise.all([
    hash(passwords.E2E_VENDOR_PASSWORD),
    hash(passwords.E2E_DR_PASSWORD),
    hash(passwords.E2E_ADMIN_PASSWORD),
  ]);

  await prisma.$transaction(async (tx) => {
    const region = await tx.region.upsert({
      where: { name: REGION_NAME },
      update: { isActive: true },
      create: { name: REGION_NAME },
    });
    const category = await tx.category.upsert({
      where: { name: CATEGORY_NAME },
      update: { isActive: true },
      create: { name: CATEGORY_NAME },
    });

    // Admin: the hardcoded super-admin row is the only phone the admin login accepts.
    await tx.user.upsert({
      where: { phone: PHONES.admin },
      update: { role: "ADMIN", name: "E2E Admin", password: adminHash, status: "ACTIVE" },
      create: { phone: PHONES.admin, role: "ADMIN", name: "E2E Admin", password: adminHash },
    });

    const vendorUser = await tx.user.upsert({
      where: { phone: PHONES.vendor },
      update: { role: "VENDOR", name: "E2E Vendor", password: vendorHash, status: "ACTIVE" },
      create: { phone: PHONES.vendor, role: "VENDOR", name: "E2E Vendor", password: vendorHash },
    });
    const vendorData = {
      userId: vendorUser.id,
      shopName: "E2E Test Store",
      ownerName: "E2E Vendor",
      phone: PHONES.vendor,
      password: vendorHash,
      regionId: region.id,
      status: "APPROVED",
    };
    const existingVendor = await tx.vendor.findFirst({ where: { phone: PHONES.vendor } });
    const vendor = existingVendor
      ? await tx.vendor.update({ where: { id: existingVendor.id }, data: vendorData })
      : await tx.vendor.create({ data: vendorData });

    const drUser = await tx.user.upsert({
      where: { phone: PHONES.dr },
      update: { role: "DR", name: "E2E DR", password: drHash, status: "ACTIVE" },
      create: { phone: PHONES.dr, role: "DR", name: "E2E DR", password: drHash },
    });
    const drData = {
      userId: drUser.id,
      name: "E2E DR",
      phone: PHONES.dr,
      password: drHash,
      regionId: region.id,
      status: "ACTIVE",
    };
    const existingDr = await tx.dR.findFirst({ where: { phone: PHONES.dr } });
    if (existingDr) await tx.dR.update({ where: { id: existingDr.id }, data: drData });
    else await tx.dR.create({ data: drData });

    // Priced above the cashback threshold so a single unit qualifies.
    const settings = await tx.appSetting.findFirst({ select: { minOrderForCashback: true } });
    const threshold = settings ? Number(settings.minOrderForCashback) : DEFAULT_MIN_CASHBACK;
    const price = Math.floor(threshold) + 500;

    const masterData = {
      name: PRODUCT_NAME,
      categoryId: category.id,
      brand: "E2E",
      type: "Standard",
      grade: "OPC 43",
      unit: "Bag",
      suggestedPrice: price,
      mrp: price,
      addedBy: "E2E Seed",
    };
    const existingMaster = await tx.productMaster.findFirst({ where: { name: PRODUCT_NAME } });
    const master = existingMaster
      ? await tx.productMaster.update({ where: { id: existingMaster.id }, data: masterData })
      : await tx.productMaster.create({ data: masterData });

    const listingData = {
      masterProductId: master.id,
      vendorId: vendor.id,
      regionId: region.id,
      regionName: region.name,
      name: PRODUCT_NAME,
      categoryId: category.id,
      categoryName: category.name,
      brand: masterData.brand,
      type: masterData.type,
      grade: masterData.grade,
      unit: masterData.unit,
      price,
      mrp: price,
      stockQty: 1000,
      imageUrl: master.imageUrl,
      approvalStatus: "APPROVED",
      isActive: true,
      addedBy: "E2E Seed",
    };
    const existingListing = await tx.vendorProduct.findFirst({
      where: { vendorId: vendor.id, masterProductId: master.id },
    });
    if (existingListing) await tx.vendorProduct.update({ where: { id: existingListing.id }, data: listingData });
    else await tx.vendorProduct.create({ data: listingData });
  });
}

async function main() {
  const passwords = {};
  for (const k of PASSWORD_VARS) passwords[k] = process.env[k];
  const missing = PASSWORD_VARS.find((k) => !passwords[k]);
  if (missing) {
    console.error(`seed refused: ${missing} is not set`);
    process.exit(2);
  }
  if (!process.env.DATABASE_URL) {
    console.error("seed refused: DATABASE_URL is not set");
    process.exit(2);
  }
  const { PrismaClient } = require("@prisma/client");
  const bcrypt = require("bcryptjs");
  const prisma = new PrismaClient();
  try {
    let marker = null;
    try {
      marker = await readMarker(prisma);
    } catch {
      console.error("seed refused: could not read the database marker");
      process.exitCode = 2;
      return;
    }
    const verdict = decide({ appEnv: process.env.APP_ENV, marker, databaseUrl: process.env.DATABASE_URL, passwords });
    if (!verdict.ok) {
      console.error(`seed refused: ${verdict.reason}`);
      process.exitCode = 2;
      return;
    }
    await seed(prisma, bcrypt, passwords);
    console.log(`seeded: region "${REGION_NAME}", vendor ${PHONES.vendor}, DR ${PHONES.dr}, admin ${PHONES.admin}, product "${PRODUCT_NAME}"`);
  } finally {
    await prisma.$disconnect().catch(() => null);
  }
}

if (require.main === module) {
  main().catch(() => {
    console.error("seed failed");
    process.exit(1);
  });
}

module.exports = { decide, seed, PASSWORD_VARS, PHONES };
