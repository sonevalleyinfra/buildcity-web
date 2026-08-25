/**
 * Utility helper to format raw UUIDs / CUIDs into clean, short, masked human-readable IDs
 */
export const formatShortId = (rawId, prefix = "ORD") => {
  if (!rawId) return `#${prefix.toUpperCase()}-*0000`;

  // Remove existing prefix or hashes
  const clean = String(rawId)
    .replace(/^#/g, "")
    .replace(/^(ord|usr|v|p|c|dr|r|vnd|prd|order|user|vendor)[-_]/i, "")
    .replace(/-/g, "")
    .toUpperCase();

  // Always take the last 4 characters for compact masked ID (e.g. #ORD-*ZXFK)
  const lastFour = clean.length > 4 ? clean.slice(-4) : clean;
  return `#${prefix.toUpperCase()}-*${lastFour}`;
};
