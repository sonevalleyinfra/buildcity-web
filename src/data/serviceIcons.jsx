import React from "react";

export function HouseConstructionIcon({ className = "w-7 h-7 sm:w-8 sm:h-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Background soft glow / base */}
      <rect x="6" y="20" width="36" height="24" rx="4" fill="#DBEAFE" fillOpacity="0.7" />
      {/* House structure */}
      <path d="M24 6L6 20H42L24 6Z" fill="#2563EB" />
      <path d="M24 6L6 20H12L24 10.6L36 20H42L24 6Z" fill="#1D4ED8" />
      {/* Windows and Door */}
      <rect x="12" y="25" width="8" height="8" rx="1.5" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="1.5" />
      <line x1="16" y1="25" x2="16" y2="33" stroke="#3B82F6" strokeWidth="1.5" />
      <line x1="12" y1="29" x2="20" y2="29" stroke="#3B82F6" strokeWidth="1.5" />
      <rect x="26" y="27" width="10" height="17" rx="2" fill="#F59E0B" />
      <circle cx="28.5" cy="35.5" r="1" fill="#FFFFFF" />
      {/* Foundation Line */}
      <rect x="4" y="42" width="40" height="3" rx="1.5" fill="#1E293B" />
      {/* Crane / Construction hook detail */}
      <path d="M36 4V12M36 4H43M43 4L43 10M43 10L40 12M43 10L46 12" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArchitectIcon({ className = "w-7 h-7 sm:w-8 sm:h-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Blueprint grid sheet */}
      <rect x="8" y="8" width="32" height="32" rx="4" fill="#7C3AED" />
      <rect x="11" y="11" width="26" height="26" rx="2" fill="#8B5CF6" />
      {/* Blueprint grid lines */}
      <line x1="11" y1="18" x2="37" y2="18" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.8" />
      <line x1="11" y1="25" x2="37" y2="25" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.8" />
      <line x1="11" y1="32" x2="37" y2="32" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.8" />
      <line x1="18" y1="11" x2="18" y2="37" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.8" />
      <line x1="25" y1="11" x2="25" y2="37" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.8" />
      <line x1="32" y1="11" x2="32" y2="37" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.8" />
      {/* Drafting Compass Ruler */}
      <path d="M15 35L24 14L33 35" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="14" r="3" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M19 28H29" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function PaintingIcon({ className = "w-7 h-7 sm:w-8 sm:h-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Paint Roller head */}
      <rect x="12" y="8" width="24" height="12" rx="3.5" fill="#059669" />
      <rect x="15" y="10" width="18" height="4" rx="2" fill="#34D399" />
      {/* Painted fresh stroke */}
      <path d="M14 6C14 5 16 4 20 4H28C32 4 34 5 34 6V8H14V6Z" fill="#10B981" />
      {/* Roller metal bracket */}
      <path d="M36 14H40C41.1 14 42 14.9 42 16V22C42 23.1 41.1 24 40 24H25V30" stroke="#047857" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Wooden handle */}
      <rect x="22" y="30" width="6" height="14" rx="3" fill="#D97706" />
      <rect x="23.5" y="32" width="3" height="8" rx="1.5" fill="#FBBF24" />
      {/* Wet paint drops */}
      <circle cx="16" cy="24" r="2.5" fill="#10B981" />
      <circle cx="20" cy="27" r="1.5" fill="#059669" />
    </svg>
  );
}

export function ElectricalIcon({ className = "w-7 h-7 sm:w-8 sm:h-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Energy circle backdrop */}
      <circle cx="24" cy="24" r="18" fill="#FEF3C7" />
      {/* Glowing Energy Bolt */}
      <path
        d="M27 6L13 25H25L21 42L35 23H23L27 6Z"
        fill="#F59E0B"
        stroke="#D97706"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Highlight core */}
      <path
        d="M26 10L16 23.5H24.5L22 36L31 24.5H23.5L26 10Z"
        fill="#FEF08A"
      />
      {/* Energy Sparkles */}
      <circle cx="11" cy="14" r="1.5" fill="#F59E0B" />
      <circle cx="37" cy="16" r="2" fill="#F59E0B" />
      <circle cx="36" cy="34" r="1.5" fill="#F59E0B" />
    </svg>
  );
}

export function PlumbingIcon({ className = "w-7 h-7 sm:w-8 sm:h-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Interlocking Water Pipe System */}
      <path
        d="M10 18H20C22.2 18 24 19.8 24 22V38"
        stroke="#0284C7"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M10 18H20C22.2 18 24 19.8 24 22V38"
        stroke="#38BDF8"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Pipe Connectors / Flanges */}
      <rect x="7" y="14" width="5" height="8" rx="1.5" fill="#0369A1" />
      <rect x="21" y="34" width="6" height="5" rx="1" fill="#0369A1" />
      {/* Valve Knob */}
      <circle cx="24" cy="18" r="4.5" fill="#EF4444" stroke="#DC2626" strokeWidth="1.5" />
      {/* Clear Water Droplet */}
      <path
        d="M34 14C34 14 28 22 28 26C28 29.3 30.7 32 34 32C37.3 32 40 29.3 40 26C40 22 34 14 34 14Z"
        fill="#0EA5E9"
      />
      <path
        d="M33 22C33 22 30 25.5 30 27.5C30 29 31 30 32.5 30"
        stroke="#E0F2FE"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ConcreteIcon({ className = "w-7 h-7 sm:w-8 sm:h-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Foundation Concrete Blocks / Wall */}
      <rect x="8" y="24" width="14" height="8" rx="1" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
      <rect x="24" y="24" width="16" height="8" rx="1" fill="#EA580C" stroke="#9A3412" strokeWidth="1" />
      <rect x="14" y="16" width="18" height="8" rx="1" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
      <rect x="10" y="32" width="18" height="8" rx="1" fill="#EA580C" stroke="#9A3412" strokeWidth="1" />
      <rect x="30" y="32" width="10" height="8" rx="1" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
      {/* Brick Highlights */}
      <line x1="9" y1="26" x2="21" y2="26" stroke="#FCA5A5" strokeWidth="1" strokeOpacity="0.7" />
      <line x1="15" y1="18" x2="31" y2="18" stroke="#FCA5A5" strokeWidth="1" strokeOpacity="0.7" />
      {/* Mason Trowel */}
      <path d="M34 10L42 16L36 20L28 14L34 10Z" fill="#64748B" stroke="#334155" strokeWidth="1.2" />
      <path d="M36 20L40 26L38 27" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      <rect x="37" y="26" width="5" height="3" rx="1" fill="#D97706" />
    </svg>
  );
}

export function FlooringIcon({ className = "w-7 h-7 sm:w-8 sm:h-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* 3D Perspective Isometric Tiles */}
      {/* Top Tile */}
      <path d="M24 8L38 16L24 24L10 16L24 8Z" fill="#F43F5E" />
      <path d="M24 10L35 16L24 22L13 16L24 10Z" fill="#FB7185" />
      {/* Left Tile */}
      <path d="M10 18L23 25.5V39L10 31.5V18Z" fill="#E11D48" />
      <path d="M12 20.5L21 26V36L12 30.5V20.5Z" fill="#BE123C" />
      {/* Right Tile */}
      <path d="M25 25.5L38 18V31.5L25 39V25.5Z" fill="#FB923C" />
      <path d="M27 26.5L36 21V30.5L27 36V26.5Z" fill="#F97316" />
      {/* Luxury Gloss Shine Star */}
      <path d="M24 14L25.5 17.5L29 19L25.5 20.5L24 24L22.5 20.5L19 19L22.5 17.5L24 14Z" fill="#FFFFFF" />
    </svg>
  );
}

export function WaterproofingIcon({ className = "w-7 h-7 sm:w-8 sm:h-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Protective Shield */}
      <path
        d="M24 6L38 11V22C38 31 32 38.5 24 42C16 38.5 10 31 10 22V11L24 6Z"
        fill="#0284C7"
      />
      <path
        d="M24 9L35 13V22C35 29.5 30 36 24 39C18 36 13 29.5 13 22V13L24 9Z"
        fill="#0369A1"
      />
      {/* Water Droplet Inside Shield */}
      <path
        d="M24 15C24 15 18 23 18 27C18 30.3 20.7 33 24 33C27.3 33 30 30.3 30 27C30 23 24 15 24 15Z"
        fill="#38BDF8"
      />
      {/* Gloss Reflection */}
      <path
        d="M22 23C22 23 20 25.5 20 27.5C20 28.8 20.8 29.8 22 30"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Icon mapper helper
export const SERVICE_ICONS = {
  construction: HouseConstructionIcon,
  architect: ArchitectIcon,
  painting: PaintingIcon,
  electrical: ElectricalIcon,
  plumbing: PlumbingIcon,
  concrete: ConcreteIcon,
  flooring: FlooringIcon,
  waterproofing: WaterproofingIcon,
};

export function renderServiceLogo(serviceId, className = "w-7 h-7 sm:w-8 sm:h-8") {
  const IconComponent = SERVICE_ICONS[serviceId];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  return null;
}
