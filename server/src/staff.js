// Staff (DR / vendor) account lifecycle: phone and password rules, the partner login decision, soft delete,
// the audit trail and the disabled_at columns + partial unique phone indexes.
// No Express import; Prisma (or a transaction client) is always passed in.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { normalizePhone, isValidPhoneInput } = require("./otp");

const SESSION_EXPIRED_BODY = Object.freeze({ error: "Session expired. Please log in again.", invalidSession: true });
const PARTNER_LOGIN_ERROR = Object.freeze({ error: "Invalid mobile number or password." });
const ADMIN_PHONE = "9999999999";

const STAFF_ERRORS = Object.freeze({
  INVALID_PHONE: Object.freeze({ error: "Enter a valid 10-digit mobile number.", code: "INVALID_PHONE" }),
  PHONE_IN_USE: Object.freeze({ error: "This mobile number is already in use.", code: "PHONE_IN_USE" }),
  PHONE_IN_USE_STAFF: Object.freeze({ error: "This mobile number belongs to a staff account.", code: "PHONE_IN_USE_STAFF" }),
  ACCOUNT_DISABLED: Object.freeze({ error: "This mobile number belongs to a disabled account.", code: "ACCOUNT_DISABLED" }),
  STAFF_DISABLED: Object.freeze({ error: "This account was deleted.", code: "STAFF_DISABLED" }),
  INVALID_STATUS: Object.freeze({ error: "Invalid status.", code: "INVALID_STATUS" }),
});

// Thrown inside a transaction to abort it and answer with a fixed status/body
class StaffError extends Error {
  constructor(status, body) {
    super(body.error);
    this.status = status;
    this.body = body;
  }
}

function normalizeStaffPhone(raw) {
  return isValidPhoneInput(raw) ? normalizePhone(raw) : null;
}

const PASSWORD_DENY_LIST = new Set([
  "vendor123", "dr123", "admin123", "drpass1", "vendora123", "vendorb123", "vendorc123", "password", "password1",
  "password123", "passw0rd", "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000", "qwerty123",
  "qwertyuiop", "abcd1234", "welcome123", "buildcity", "buildcity123", "buildcity@123", "admin@123", "vendor@123",
  "dr@123", "india123", "iloveyou",
]);

// For NEW accounts and resets only; existing passwords keep working
function checkNewPassword(raw, { phone } = {}) {
  if (typeof raw !== "string") return { ok: false, error: "Password must be 8-128 characters." };
  const value = raw.trim();
  if (value.length < 8 || value.length > 128) return { ok: false, error: "Password must be 8-128 characters." };
  if (PASSWORD_DENY_LIST.has(value.toLowerCase())) return { ok: false, error: "This password is too common. Choose another." };
  const phone10 = normalizePhone(phone);
  if (phone10.length === 10 && (value.includes(phone10) || value.replace(/\D/g, "") === phone10)) {
    return { ok: false, error: "Password must not contain the mobile number." };
  }
  return { ok: true, value };
}

// Compared against when there is no stored hash, so unknown and known phones cost the same bcrypt work
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10);

function isActiveStatus(s) {
  return String(s || "ACTIVE").toUpperCase() === "ACTIVE";
}

// user: the User for the phone; dr / vendor: that user's live (ACTIVE / APPROVED, not disabled) row, or null.
// Exactly one compare on every path; callers answer every denial with the same PARTNER_LOGIN_ERROR.
async function decidePartnerLogin({ phone10, password, user, dr, vendor }, compare) {
  let allowed = false;
  let kind = null;
  let stored = null;
  if (phone10 === ADMIN_PHONE) {
    kind = "ADMIN";
    stored = user ? user.password : null;
    allowed = !!(user && user.password);
  } else if (user && user.role === "DR") {
    kind = "DR";
    stored = (dr && dr.password) || user.password;
    allowed = !!dr && isActiveStatus(user.status);
  } else if (user && user.role === "VENDOR") {
    kind = "VENDOR";
    stored = (vendor && vendor.password) || user.password;
    allowed = !!vendor && isActiveStatus(user.status);
  }
  let match = false;
  try {
    match = (await compare(password, stored || DUMMY_PASSWORD_HASH)) === true;
  } catch {
    match = false;
  }
  return allowed && stored && match ? { ok: true, kind } : { ok: false };
}

// Copy of a dr/vendor row without password keys (also on the nested user)
function stripPasswords(row) {
  if (!row) return row;
  const { password: _p, ...rest } = row;
  if (rest.user) {
    const { password: _u, ...user } = rest.user;
    rest.user = user;
  }
  return rest;
}

// Checks for POST /drs and POST /vendors. Returns { error } (409 body) or { existing } (a CUSTOMER to convert, or null).
async function planStaffAccount(db, { model, phone10, confirmConvert, label }) {
  const live = await db[model].findFirst({ where: { phone: phone10, disabledAt: null }, select: { id: true } });
  if (live) return { error: STAFF_ERRORS.PHONE_IN_USE };
  const existing = await db.user.findUnique({ where: { phone: phone10 } });
  if (!existing) return { existing: null };
  if (phone10 === ADMIN_PHONE || existing.role !== "CUSTOMER") return { error: STAFF_ERRORS.PHONE_IN_USE_STAFF };
  if (!isActiveStatus(existing.status)) return { error: STAFF_ERRORS.ACCOUNT_DISABLED };
  if (confirmConvert !== true) {
    return {
      error: {
        error: `This number belongs to an existing customer. Convert the account to a ${label}? Orders and wallet are kept.`,
        code: "CONVERT_CONFIRM_REQUIRED",
      },
    };
  }
  return { existing };
}

// Creates the staff User, or converts the confirmed CUSTOMER in place (name, wallet, orders, addresses untouched).
// Returns the user id.
async function createOrConvertStaffUser(tx, existing, { role, name, phone10, passwordHash }) {
  if (!existing) {
    const user = await tx.user.create({ data: { phone: phone10, name, password: passwordHash, role, tokenVersion: 1 } });
    return user.id;
  }
  // Guards the race where the customer changed (role/status) after the checks above
  const r = await tx.user.updateMany({
    where: { id: existing.id, role: "CUSTOMER", status: existing.status },
    data: { role, password: passwordHash, tokenVersion: { increment: 1 } },
  });
  if (r.count !== 1) throw new StaffError(409, STAFF_ERRORS.PHONE_IN_USE_STAFF);
  return existing.id;
}

// details must carry targetType ("VENDOR" | "DR"), targetId and targetUserId; never passwords or hashes
async function writeAudit(tx, req, action, details) {
  const auth = (req && req.auth) || {};
  const actorId = auth.userId || null;
  // Only link a real user: the FK must never abort the staff change itself
  const actor = actorId ? await tx.user.findUnique({ where: { id: String(actorId) }, select: { id: true } }) : null;
  await tx.auditLog.create({
    data: {
      userId: actor ? actor.id : null,
      action,
      details: JSON.stringify({ actorId, actorRole: auth.role || null, actorPhone: auth.phone || null, ...details }),
      ipAddress: (req && req.ip) || null,
    },
  });
}

// After a DR/vendor row is soft-deleted: decide what happens to its login. Returns the mode for the audit row.
async function retireStaffUser(tx, userId, { exceptDrId, exceptVendorId } = {}) {
  const user = userId ? await tx.user.findUnique({ where: { id: userId } }) : null;
  if (!user) return "no_user";
  if (user.phone === ADMIN_PHONE || user.role === "ADMIN") return "admin_untouched";
  const otherDrs = await tx.dR.count({ where: { userId, disabledAt: null, ...(exceptDrId ? { id: { not: exceptDrId } } : {}) } });
  const otherVendors = await tx.vendor.count({ where: { userId, disabledAt: null, ...(exceptVendorId ? { id: { not: exceptVendorId } } : {}) } });
  if (otherDrs + otherVendors > 0) {
    await tx.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
    return "kept_other_roles";
  }
  const converted = await tx.auditLog.findFirst({
    where: { action: "STAFF_CONVERT", details: { contains: `"targetUserId":${JSON.stringify(String(userId))}` } },
    select: { id: true },
  });
  if (converted) {
    await tx.user.update({ where: { id: userId }, data: { role: "CUSTOMER", tokenVersion: { increment: 1 } } });
    return "reverted_to_customer";
  }
  await tx.user.update({ where: { id: userId }, data: { status: "DISABLED", tokenVersion: { increment: 1 } } });
  return "disabled";
}

// Same boot contract as ensureOtpSchema (src/otp.js): the columns are required, so after bounded retries this
// throws and the caller refuses to boot. The partial unique indexes are best effort: duplicates already in the
// data only log a warning (an owner resolves them with scripts/staff-phone-report.js); no data is ever changed.
const STAFF_SCHEMA_DELAYS_MS = [1000, 2000, 4000, 8000];
const STAFF_INDEXES = [
  { key: "vendors", name: "vendors_phone_live_key", table: "vendors" },
  { key: "drs", name: "district_representatives_phone_live_key", table: "district_representatives" },
];
const LOCK_TIMEOUT_SQL = "SET LOCAL lock_timeout = '5s'";

const oneLine = (e) => String((e && e.message) || e).replace(/\s+/g, " ").trim();
const pgCode = (e) => (e && ((e.meta && e.meta.code) || e.code)) || "unknown";

async function ensureStaffSchema(prisma, opts = {}) {
  const delaysMs = opts.delaysMs || STAFF_SCHEMA_DELAYS_MS;
  const sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const log = opts.log || console;
  const shouldStop = opts.shouldStop || (() => false);
  const result = { indexes: { vendors: false, drs: false } };
  const max = delaysMs.length + 1;
  let lastError = null;
  let columnsReady = false;
  for (let i = 1; i <= max && !columnsReady; i++) {
    if (shouldStop()) return result;
    try {
      // pg_catalog + to_regclass for the same reasons as ensureOtpSchema
      const cols = await prisma.$queryRawUnsafe(
        "SELECT attrelid::regclass::text AS tbl FROM pg_attribute WHERE attrelid IN (to_regclass('vendors'), to_regclass('district_representatives')) AND attname = 'disabled_at' AND NOT attisdropped"
      );
      if (!(Array.isArray(cols) && cols.length >= 2)) {
        await prisma.$transaction([
          prisma.$executeRawUnsafe(LOCK_TIMEOUT_SQL),
          prisma.$executeRawUnsafe("ALTER TABLE vendors ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP(3)"),
          prisma.$executeRawUnsafe("ALTER TABLE district_representatives ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP(3)"),
        ]);
        log.log("[staff] added vendors.disabled_at and district_representatives.disabled_at");
      }
      columnsReady = true;
    } catch (e) {
      lastError = e;
      log.error(`[staff] ensure schema attempt ${i}/${max} failed: ${(e && e.code) || ""} ${oneLine(e)}`);
      if (i < max) {
        if (shouldStop()) return result;
        await sleep(delaysMs[i - 1]);
      }
    }
  }
  if (!columnsReady) {
    throw new Error(`disabled_at columns are missing and could not be added after ${max} attempts: ${oneLine(lastError)}`, { cause: lastError });
  }

  for (const idx of STAFF_INDEXES) {
    if (shouldStop()) return result;
    let code = null;
    try {
      // Never CONCURRENTLY: a failed concurrent build leaves an invalid index behind
      await prisma.$transaction([
        prisma.$executeRawUnsafe(LOCK_TIMEOUT_SQL),
        prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table} (phone) WHERE disabled_at IS NULL`),
      ]);
      const rows = await prisma.$queryRawUnsafe("SELECT indisvalid FROM pg_index WHERE indexrelid = to_regclass($1)", idx.name);
      if (!(Array.isArray(rows) && rows.length === 1)) code = "missing";
      else if (rows[0].indisvalid !== true) code = "invalid";
    } catch (e) {
      code = pgCode(e);
      // A racing boot may have built it first (the loser gets 23505 on pg_class): a valid index is success
      try {
        const rows = await prisma.$queryRawUnsafe("SELECT indisvalid FROM pg_index WHERE indexrelid = to_regclass($1)", idx.name);
        if (Array.isArray(rows) && rows.length === 1 && rows[0].indisvalid === true) code = null;
      } catch {
        // Re-check failed too: keep the original error
      }
    }
    if (code) {
      log.error(`[staff] unique index ${idx.name} not created (${code}): duplicate live phones; run node scripts/staff-phone-report.js`);
    } else {
      result.indexes[idx.key] = true;
    }
  }
  return result;
}

module.exports = {
  SESSION_EXPIRED_BODY,
  PARTNER_LOGIN_ERROR,
  ADMIN_PHONE,
  STAFF_ERRORS,
  StaffError,
  PASSWORD_DENY_LIST,
  normalizeStaffPhone,
  checkNewPassword,
  DUMMY_PASSWORD_HASH,
  isActiveStatus,
  decidePartnerLogin,
  stripPasswords,
  planStaffAccount,
  createOrConvertStaffUser,
  writeAudit,
  retireStaffUser,
  ensureStaffSchema,
};
