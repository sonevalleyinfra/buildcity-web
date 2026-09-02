const path = require("path");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

// Load from server/.env or root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 32
  ? process.env.JWT_SECRET.trim()
  : null;

if (!JWT_SECRET) {
  throw new Error("Missing required JWT_SECRET in environment variables. Must be at least 32 characters.");
}

/**
 * Signs and issues a valid, tamper-proof JSON Web Token for the authenticated user
 * @param {Object} user - User object containing id, phone, role, and tokenVersion
 * @returns {string} - Signed JWT with 7 days expiry
 */
function issueToken(user) {
  if (!user) throw new Error("Cannot issue JWT for undefined user");

  const payload = {
    sub: String(user.id || user.userId),
    phone: user.phone || "",
    role: String(user.role || "CUSTOMER").toUpperCase(),
    tv: user.tokenVersion || 1,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Middleware: Requires a valid Authorization: Bearer <token> header
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({ error: "Authentication required" });
  }

  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = parts[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    req.auth = {
      userId: decoded.sub,
      phone: decoded.phone,
      role: (decoded.role || "CUSTOMER").toUpperCase(),
      tokenVersion: decoded.tv || 1,
    };

    next();
  });
}

/**
 * Middleware Factory: Requires the authenticated user to possess one of the allowed roles
 * @param {...string} allowedRoles - e.g. "ADMIN", "DR", "VENDOR", "CUSTOMER"
 */
function requireRole(...allowedRoles) {
  const normalized = allowedRoles.map((r) => String(r).toUpperCase());

  return (req, res, next) => {
    if (!req.auth || !req.auth.role) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!normalized.includes(req.auth.role)) {
      return res.status(403).json({ error: "You do not have permission for this action" });
    }

    next();
  };
}

/**
 * Middleware Factory: Allows the request if user is ADMIN or acting on their own resource
 * @param {Function|string} getTargetUserId - Function(req) => targetId, or param name string
 */
function requireSelfOrAdmin(getTargetUserId) {
  return (req, res, next) => {
    if (!req.auth || !req.auth.role) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.auth.role === "ADMIN") {
      return next();
    }

    let targetId = null;
    if (typeof getTargetUserId === "function") {
      targetId = getTargetUserId(req);
    } else if (typeof getTargetUserId === "string") {
      targetId = req.params[getTargetUserId] || req.body[getTargetUserId] || req.query[getTargetUserId];
    } else {
      targetId = req.params.userId || req.params.id;
    }

    if (targetId && (String(targetId) === String(req.auth.userId) || String(targetId).replace(/\D/g, "") === String(req.auth.phone).replace(/\D/g, ""))) {
      return next();
    }

    return res.status(403).json({ error: "You do not have permission for this action" });
  };
}

module.exports = {
  issueToken,
  requireAuth,
  requireRole,
  requireSelfOrAdmin,
};
