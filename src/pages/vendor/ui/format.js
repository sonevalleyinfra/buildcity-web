export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const inr = (value) => `₹${(Number(value) || 0).toLocaleString("en-IN")}`;

// Order lifecycle: one colour per status, used by badges, filter dots, card accents and a light top wash,
// the status select and the progress track. Pending is coral #FF5533 ("needs you").
export const ORDER_STATUS = {
  PENDING: {
    label: "Pending",
    tone: "bg-coral-50 text-coral-700 ring-coral-500/25",
    dot: "bg-coral-500",
    accent: "bg-coral-500",
    text: "text-coral-700",
    select: "bg-coral-50/70 text-coral-700 ring-coral-200 hover:bg-coral-50",
    tile: "bg-gradient-to-b from-coral-50/70 to-white to-45% border-coral-300/70",
    halo: "ring-coral-500/20",
  },
  PROCESSING: {
    label: "Processing",
    tone: "bg-sky-50 text-sky-700 ring-sky-600/20",
    dot: "bg-sky-500",
    accent: "bg-sky-500",
    text: "text-sky-800",
    select: "bg-sky-50/70 text-sky-800 ring-sky-200 hover:bg-sky-50",
    tile: "bg-gradient-to-b from-sky-50/60 to-white to-45% border-sky-300/70",
    halo: "ring-sky-500/20",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for delivery",
    tone: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    dot: "bg-indigo-500",
    accent: "bg-indigo-500",
    text: "text-indigo-800",
    select: "bg-indigo-50/70 text-indigo-800 ring-indigo-200 hover:bg-indigo-50",
    tile: "bg-gradient-to-b from-indigo-50/60 to-white to-45% border-indigo-300/70",
    halo: "ring-indigo-500/20",
  },
  DELIVERED: {
    label: "Delivered",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
    accent: "bg-emerald-500",
    text: "text-emerald-800",
    select: "bg-emerald-50/70 text-emerald-800 ring-emerald-200 hover:bg-emerald-50",
    tile: "bg-gradient-to-b from-emerald-50/60 to-white to-45% border-emerald-300/60",
    halo: "ring-emerald-500/20",
  },
  COMPLETED: {
    label: "Completed",
    tone: "bg-teal-50 text-teal-800 ring-teal-600/20",
    dot: "bg-teal-600",
    accent: "bg-teal-600",
    text: "text-teal-800",
    select: "bg-teal-50/70 text-teal-800 ring-teal-200",
    tile: "bg-gradient-to-b from-teal-50/60 to-white to-45% border-teal-300/60",
    halo: "ring-teal-500/20",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "bg-rose-50 text-rose-600 ring-rose-600/15",
    dot: "bg-rose-400",
    accent: "bg-rose-300",
    text: "text-rose-700",
    select: "bg-rose-50/60 text-rose-700 ring-rose-200 hover:bg-rose-50",
    tile: "bg-gradient-to-b from-slate-50/60 to-white to-45% border-slate-300/80",
    halo: "ring-rose-400/20",
  },
};

// Stable tinted avatar for a customer name (same person, same colour)
const AVATAR_TONES = [
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-700",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
  "bg-brand-100 text-brand-700",
];
export const avatarTone = (name = "") => {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
};

// Compact Indian notation for tight spaces: 1,67,500 -> 1.68 L
export const inrCompact = (value) => {
  const v = Number(value) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2).replace(/\.?0+$/, "")} L`;
  return inr(v);
};

// Order delivery steps shown on the progress track
export const ORDER_STEPS = ["PENDING", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED"];
