// Customer OTP helpers: phone normalisation, hashed OTP storage, the request decision and the attempts column.
// Pure module: no Express and no Prisma import (ensureOtpSchema takes the client as an argument).
const crypto = require("crypto");

const OTP_MAX_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_GENERIC_ERROR = "Invalid or expired OTP. Please enter the exact OTP code sent to your mobile.";
const ALLOWED_OTP_TYPES = ["login", "register"];
const STAFF_ROLES = ["ADMIN", "DR", "VENDOR"];
const HASH_PREFIX = "h1$";

const BOOT_MS = Date.now();
const COMPAT_MAX_MS = 15 * 60 * 1000;

function normalizePhone(raw) {
  return String(raw ?? "").replace(/\D/g, "").slice(-10);
}

// Accepts 10 digits, or a 0 / 91 prefixed 10-digit number ("+91 98765 43210", "09876543210")
function isValidPhoneInput(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return true;
  if (digits.length === 11) return digits.startsWith("0");
  if (digits.length === 12) return digits.startsWith("91");
  return false;
}

let pepperCache = null;
function otpPepper() {
  if (pepperCache) return pepperCache;
  const explicit = (process.env.OTP_PEPPER || "").trim();
  if (explicit.length >= 16) {
    pepperCache = explicit;
    return pepperCache;
  }
  const jwtSecret = (process.env.JWT_SECRET || "").trim();
  if (!jwtSecret) throw new Error("OTP_PEPPER and JWT_SECRET are both unset; refusing to hash OTPs");
  console.warn("[otp] OTP_PEPPER not set; using a pepper derived from JWT_SECRET");
  pepperCache = crypto.createHmac("sha256", jwtSecret).update("buildcity-otp-pepper-v1").digest("hex");
  return pepperCache;
}

function hashOtp(phone10, code) {
  return HASH_PREFIX + crypto.createHmac("sha256", otpPepper()).update(`${phone10}:${String(code).trim()}`).digest("hex");
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// OTP_PLAINTEXT_COMPAT_MS only exists so tests can close the window; it can only shorten it, never extend it.
function plaintextCompatOpen(nowMs) {
  const raw = Number(process.env.OTP_PLAINTEXT_COMPAT_MS ?? COMPAT_MAX_MS);
  const compatMs = Number.isNaN(raw) ? COMPAT_MAX_MS : Math.min(Math.max(raw, 0), COMPAT_MAX_MS);
  return nowMs < BOOT_MS + compatMs;
}

function otpMatches(row, phone10, code, nowMs) {
  const stored = String(row?.otp ?? "");
  if (stored.startsWith(HASH_PREFIX)) return safeEqual(stored, hashOtp(phone10, code));
  // TEMPORARY (remove after 2026-11-15): plaintext OTP rows written by pre-hash pods.
  // Rows expire after 10 min, so after the 15-min window none can match.
  if (!plaintextCompatOpen(nowMs)) return false;
  if (!/^\d{6}$/.test(stored)) return false;
  return safeEqual(stored, String(code).trim());
}

// Default ON so shipped APKs keep their registered / not-registered / staff messages; "0" turns them off.
function legacyOtpHints() {
  return process.env.LEGACY_OTP_HINTS !== "0";
}

const UNIFORM = { success: true, message: "OTP dispatched", gateway: "AradhyaSMS", smsStatus: "dispatched" };

// Decides what /auth/otp/request does for a number. With legacyHints off every caller sees the same body.
function planOtpRequest({ phone10, type, existingRole, isSpecial, legacyHints }) {
  const isStaff = !!existingRole && STAFF_ROLES.includes(existingRole);
  if (!legacyHints) {
    return { issue: !(isSpecial || isStaff), status: 200, body: { ...UNIFORM } };
  }
  if (isSpecial) {
    return {
      issue: false,
      status: 403,
      body: {
        error: "Special Admin and DR accounts cannot log in using Mobile OTP. Please click 'Partner Login (Password)' at the bottom.",
        isStaffBlocked: true,
      },
    };
  }
  if (isStaff) {
    return {
      issue: false,
      status: 403,
      body: {
        error: "Vendor, DR, and Admin accounts cannot log in using Mobile OTP. Please click 'Partner Login (Password)' at the bottom.",
        isStaffBlocked: true,
      },
    };
  }
  if (type === "login" && !existingRole) {
    return {
      issue: false,
      status: 200,
      body: { success: false, notRegistered: true, error: "This mobile number is not registered. Please create an account first." },
    };
  }
  if (type === "register" && existingRole) {
    return {
      issue: false,
      status: 200,
      body: { success: false, alreadyRegistered: true, error: "This mobile number is already registered. Please log in directly." },
    };
  }
  return {
    issue: true,
    status: 200,
    body: {
      success: true,
      message: `OTP dispatched to +91 ${phone10}`,
      gateway: "AradhyaSMS",
      smsStatus: "dispatched",
      isRegistered: !!existingRole,
    },
  };
}

// Prod does not run `prisma db push` on deploy and staging restores prod dumps, so the column self-provisions here.
// Throws after bounded retries (e.g. lock_timeout while the hourly pg_dump holds ACCESS SHARE); the caller must then
// refuse to boot so the new container never turns healthy and the platform keeps the old one.
// Worst case: 5 attempts x 5 s lock_timeout + 15 s of sleeps = ~40 s, which must stay under the Coolify healthcheck window.
const OTP_SCHEMA_DELAYS_MS = [1000, 2000, 4000, 8000];

async function ensureOtpSchema(prisma, opts = {}) {
  const delaysMs = opts.delaysMs || OTP_SCHEMA_DELAYS_MS;
  const sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const log = opts.log || console;
  const shouldStop = opts.shouldStop || (() => false);
  const max = delaysMs.length + 1;
  let lastError = null;
  for (let i = 1; i <= max; i++) {
    if (shouldStop()) return;
    try {
      // pg_catalog, not information_schema: the latter hides columns the role holds no privilege on, and a false
      // "missing" now blocks boot. to_regclass resolves through search_path exactly like the unqualified ALTER below.
      const cols = await prisma.$queryRawUnsafe(
        "SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('otp_verifications') AND attname = 'attempts' AND NOT attisdropped"
      );
      if (Array.isArray(cols) && cols.length > 0) return;
      await prisma.$transaction([
        prisma.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'"),
        prisma.$executeRawUnsafe("ALTER TABLE otp_verifications ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0"),
      ]);
      log.log("[otp] added otp_verifications.attempts");
      return;
    } catch (e) {
      lastError = e;
      const msg = String((e && e.message) || e).replace(/\s+/g, " ").trim();
      log.error(`[otp] ensure schema attempt ${i}/${max} failed: ${(e && e.code) || ""} ${msg}`);
      if (i < max) {
        if (shouldStop()) return;
        await sleep(delaysMs[i - 1]);
      }
    }
  }
  const lastMsg = String((lastError && lastError.message) || lastError).replace(/\s+/g, " ").trim();
  throw new Error(`otp_verifications.attempts is missing and could not be added after ${max} attempts: ${lastMsg}`, { cause: lastError });
}

module.exports = {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  OTP_GENERIC_ERROR,
  ALLOWED_OTP_TYPES,
  normalizePhone,
  isValidPhoneInput,
  otpPepper,
  hashOtp,
  otpMatches,
  plaintextCompatOpen,
  legacyOtpHints,
  planOtpRequest,
  ensureOtpSchema,
};
