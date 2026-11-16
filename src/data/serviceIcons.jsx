import React from "react";

// 1. House Construction: Modern 3D Villa with Pitched Roof, Glass Window & Crane Hook
export function ConstructionLogo({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="c-roof" x1="8" y1="18" x2="30" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316" />
          <stop offset="1" stopColor="#C2410C" />
        </linearGradient>
        <linearGradient id="c-wall" x1="10" y1="18" x2="28" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="c-crane" x1="28" y1="4" x2="38" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Ground Foundation */}
      <rect x="4" y="33" width="32" height="3" rx="1.5" fill="#64748B" />

      {/* House Main Body */}
      <path d="M9 19L19 10L29 19V33H9V19Z" fill="url(#c-wall)" stroke="#CBD5E1" strokeWidth="0.8" />
      {/* 3D Depth Right Wall */}
      <path d="M29 19L33 16V30L29 33V19Z" fill="#94A3B8" />

      {/* Modern Angled Roof */}
      <path d="M7 20L19 9L31 20H25L19 14.5L13 20H7Z" fill="url(#c-roof)" />
      <path d="M19 9L31 20L35 17L23 6L19 9Z" fill="#9A3412" />

      {/* Chimney */}
      <rect x="12" y="10" width="3" height="5" rx="0.5" fill="#EA580C" />

      {/* Glass Window */}
      <rect x="12" y="21" width="6.5" height="6.5" rx="1" fill="#38BDF8" stroke="#0284C7" strokeWidth="0.8" />
      <line x1="15.25" y1="21" x2="15.25" y2="27.5" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.9" />
      <line x1="12" y1="24.25" x2="18.5" y2="24.25" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.9" />

      {/* Wood Entrance Door */}
      <rect x="21" y="23" width="6" height="10" rx="1" fill="#B45309" stroke="#78350F" strokeWidth="0.8" />
      <circle cx="22.5" cy="28.5" r="0.7" fill="#FEF08A" />

      {/* Construction Crane Tower & Hook */}
      <path d="M29 6H38L35 9H31V18" stroke="url(#c-crane)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="35" y1="9" x2="35" y2="15" stroke="#64748B" strokeWidth="1" strokeDasharray="1 1" />
      <circle cx="35" cy="16.5" r="1.5" fill="#EF4444" />
    </svg>
  );
}

// 2. Architect & Engineer: 3D Yellow Hardhat over Blueprints with Compass
export function ArchitectLogo({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="a-helmet" x1="10" y1="8" x2="30" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.4" stopColor="#EAB308" />
          <stop offset="1" stopColor="#CA8A04" />
        </linearGradient>
        <linearGradient id="a-blue" x1="6" y1="24" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      {/* Rolled Blueprint Plan Sheet */}
      <rect x="6" y="24" width="28" height="11" rx="2" fill="url(#a-blue)" stroke="#1E40AF" strokeWidth="0.8" />
      <line x1="8" y1="28" x2="32" y2="28" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="1.5 1" strokeOpacity="0.8" />
      <line x1="8" y1="31" x2="32" y2="31" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="1.5 1" strokeOpacity="0.8" />
      <line x1="14" y1="25" x2="14" y2="34" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="1.5 1" strokeOpacity="0.8" />
      <line x1="22" y1="25" x2="22" y2="34" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="1.5 1" strokeOpacity="0.8" />

      {/* 3D Yellow Engineer Hardhat */}
      {/* Crown Dome */}
      <path d="M10 20C10 11.5 14.5 7 20 7C25.5 7 30 11.5 30 20H10Z" fill="url(#a-helmet)" />
      {/* Center Ridge */}
      <path d="M19 7C19 6.5 19.5 6 20 6C20.5 6 21 6.5 21 7V19H19V7Z" fill="#FEF08A" />
      {/* Brim */}
      <path d="M7 20C7 19 9 18.5 12 18.5H28C31 18.5 33 19 33 20C33 21.2 30 22 20 22C10 22 7 21.2 7 20Z" fill="#CA8A04" />
      <path d="M8 20C8 19.5 10 19 13 19H27C30 19 32 19.5 32 20C32 20.8 29 21.5 20 21.5C11 21.5 8 20.8 8 20Z" fill="#FACC15" />
      {/* Gloss Highlight */}
      <path d="M13 13C14.5 10 17 8.5 20 8.2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.85" />

      {/* Drafting Compass */}
      <path d="M24 33L29 21L34 33" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="29" cy="21" r="1.8" fill="#F59E0B" />
      <line x1="26" y1="29" x2="32" y2="29" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// 3. Painting: 3D Paint Roller with Fresh Teal Paint & Wet Dripping Drops
export function PaintingLogo({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="p-roll" x1="10" y1="8" x2="28" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="0.6" stopColor="#059669" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="p-handle" x1="18" y1="24" x2="24" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D97706" />
          <stop offset="1" stopColor="#78350F" />
        </linearGradient>
      </defs>

      {/* Fresh Wall Paint Swash */}
      <path d="M10 6C12 5 16 5 22 5C26 5 28 6 28 7V10H10V6Z" fill="#A7F3D0" />

      {/* Paint Roller Cylinder */}
      <rect x="9" y="8" width="20" height="9" rx="3" fill="url(#p-roll)" stroke="#065F46" strokeWidth="0.8" />
      {/* Roller Texture Highlight */}
      <rect x="11" y="9.5" width="16" height="2" rx="1" fill="#6EE7B7" />

      {/* Chrome Bracket Arm */}
      <path d="M29 12H32C33.1 12 34 12.9 34 14V20C34 21.1 33.1 22 32 22H20V26" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29 12H32C33.1 12 34 12.9 34 14V20C34 21.1 33.1 22 32 22H20V26" stroke="#E2E8F0" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />

      {/* Wood Grip Handle */}
      <rect x="18" y="26" width="4.5" height="11" rx="2" fill="url(#p-handle)" stroke="#451A03" strokeWidth="0.8" />
      <line x1="18.5" y1="29.5" x2="22" y2="29.5" stroke="#FDE68A" strokeWidth="0.6" />
      <line x1="18.5" y1="32.5" x2="22" y2="32.5" stroke="#FDE68A" strokeWidth="0.6" />

      {/* Wet Paint Droplets */}
      <circle cx="12" cy="20" r="2" fill="#10B981" />
      <circle cx="11.5" cy="19.5" r="0.6" fill="#FFFFFF" />
      <circle cx="16" cy="23" r="1.5" fill="#059669" />
      <circle cx="9" cy="24" r="1" fill="#10B981" />
    </svg>
  );
}

// 4. Electrical: 3D High-Voltage Energy Bolt with Power Spark
export function ElectricalLogo({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="e-bolt" x1="16" y1="4" x2="26" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <radialGradient id="e-glow" cx="20" cy="18" r="15" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" stopOpacity="0.7" />
          <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Energy Glow Aura */}
      <circle cx="20" cy="19" r="14" fill="url(#e-glow)" />

      {/* 3D Lightning Energy Bolt */}
      <path
        d="M23 4L11 20H20L16 36L30 17H20L23 4Z"
        fill="url(#e-bolt)"
        stroke="#B45309"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Core Hot White Lightning Highlight */}
      <path
        d="M22 7L13 19H19.5L17.5 30L27 18H20.5L22 7Z"
        fill="#FFFFFF"
        opacity="0.8"
      />

      {/* Energy Sparkles */}
      <circle cx="9" cy="11" r="1.2" fill="#F59E0B" />
      <circle cx="31" cy="10" r="1.5" fill="#F59E0B" />
      <circle cx="30" cy="27" r="1.2" fill="#F59E0B" />
    </svg>
  );
}

// 5. Plumbing: 3D Chrome Water Faucet with Crystal Water Drop
export function PlumbingLogo({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pl-metal" x1="8" y1="8" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FAFC" />
          <stop offset="0.4" stopColor="#CBD5E1" />
          <stop offset="0.8" stopColor="#94A3B8" />
          <stop offset="1" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id="pl-drop" x1="16" y1="22" x2="24" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="0.6" stopColor="#0284C7" />
          <stop offset="1" stopColor="#0369A1" />
        </linearGradient>
      </defs>

      {/* Brass Pipe Connector in Wall */}
      <rect x="23" y="14" width="11" height="5" rx="1" fill="#D97706" stroke="#78350F" strokeWidth="0.8" />
      <rect x="31" y="13" width="3" height="7" rx="0.5" fill="#B45309" />

      {/* 3D Chrome Faucet Spout */}
      <path
        d="M24 17H16C13.2 17 11 14.8 11 12C11 9.2 13.2 7 16 7C18.8 7 21 9.2 21 12V19"
        stroke="url(#pl-metal)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 16H16C13.8 16 12 14.2 12 12C12 9.8 13.8 8 16 8C18.2 8 20 9.8 20 12V18"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />

      {/* Aerator Nozzle */}
      <rect x="18.5" y="18" width="5" height="3" rx="0.8" fill="#475569" stroke="#1E293B" strokeWidth="0.6" />

      {/* Red Turn Valve Wheel Handle */}
      <circle cx="16" cy="5" r="3.2" fill="#EF4444" stroke="#B91C1C" strokeWidth="0.8" />
      <circle cx="16" cy="5" r="1.3" fill="#FFFFFF" />

      {/* Crystal Clear Water Droplet */}
      <path
        d="M21 23C21 23 16 29 16 32C16 34.8 18.2 37 21 37C23.8 37 26 34.8 26 32C26 29 21 23 21 23Z"
        fill="url(#pl-drop)"
        stroke="#0284C7"
        strokeWidth="0.8"
      />
      <path d="M19 30C18.5 31.5 18.5 33 20 34.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.85" />
      <circle cx="22.5" cy="29" r="0.8" fill="#FFFFFF" />
    </svg>
  );
}

// 6. Concrete & RCC: 3D Red Clay Brick Wall with Steel Mason Trowel
export function ConcreteLogo({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cn-b1" x1="6" y1="16" x2="20" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EA580C" />
          <stop offset="1" stopColor="#9A3412" />
        </linearGradient>
        <linearGradient id="cn-b2" x1="18" y1="16" x2="34" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316" />
          <stop offset="1" stopColor="#C2410C" />
        </linearGradient>
      </defs>

      {/* Mortar Bed Base */}
      <rect x="5" y="30" width="30" height="3" rx="1" fill="#94A3B8" />

      {/* Bottom Layer Bricks */}
      <rect x="5" y="24" width="14" height="6" rx="1" fill="url(#cn-b1)" stroke="#7C2D12" strokeWidth="0.6" />
      <rect x="20" y="24" width="15" height="6" rx="1" fill="url(#cn-b2)" stroke="#7C2D12" strokeWidth="0.6" />
      <line x1="6" y1="25.5" x2="18" y2="25.5" stroke="#FDBA74" strokeWidth="0.6" strokeOpacity="0.7" />
      <line x1="21" y1="25.5" x2="34" y2="25.5" stroke="#FDBA74" strokeWidth="0.6" strokeOpacity="0.7" />

      {/* Middle Mortar Joint */}
      <rect x="5" y="22" width="30" height="2" fill="#CBD5E1" />

      {/* Middle Staggered Bricks */}
      <rect x="5" y="16" width="7" height="6" rx="1" fill="url(#cn-b2)" stroke="#7C2D12" strokeWidth="0.6" />
      <rect x="13" y="16" width="14" height="6" rx="1" fill="url(#cn-b1)" stroke="#7C2D12" strokeWidth="0.6" />
      <rect x="28" y="16" width="7" height="6" rx="1" fill="url(#cn-b2)" stroke="#7C2D12" strokeWidth="0.6" />
      <line x1="14" y1="17.5" x2="26" y2="17.5" stroke="#FDBA74" strokeWidth="0.6" strokeOpacity="0.7" />

      {/* Top Mortar Joint */}
      <rect x="8" y="14" width="24" height="2" fill="#CBD5E1" />

      {/* Steel Mason Trowel */}
      <path d="M26 6L35 12L28 17L19 11L26 6Z" fill="#E2E8F0" stroke="#475569" strokeWidth="0.8" />
      <path d="M25 8.5L31 12.5L27 14.5L22 11L25 8.5Z" fill="#FFFFFF" opacity="0.8" />
      <path d="M28 17L31 22" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="29" y="22" width="4.5" height="3" rx="1" fill="#B45309" />
    </svg>
  );
}

// 7. Flooring: 3D Isometric Polished Marble / Ceramic Floor Tiles with Sparkle
export function FlooringLogo({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fl-top" x1="20" y1="6" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.6" stopColor="#FFE4E6" />
          <stop offset="1" stopColor="#FECDD3" />
        </linearGradient>
        <linearGradient id="fl-left" x1="8" y1="16" x2="20" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F43F5E" />
          <stop offset="1" stopColor="#9F1239" />
        </linearGradient>
        <linearGradient id="fl-right" x1="20" y1="16" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB7185" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
      </defs>

      {/* 3D Isometric Vitrified Floor Tile Block */}
      {/* Top Face (Polished Porcelain Surface) */}
      <path d="M20 7L32 14L20 21L8 14L20 7Z" fill="url(#fl-top)" stroke="#E2E8F0" strokeWidth="0.8" />
      {/* Tile Vein Line */}
      <path d="M14 12C17 14 18 13 23 17" stroke="#FDA4AF" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.8" />

      {/* Left 3D Depth Face */}
      <path d="M8 14L20 21V30L8 23V14Z" fill="url(#fl-left)" stroke="#881337" strokeWidth="0.6" />
      {/* Right 3D Depth Face */}
      <path d="M20 21L32 14V23L20 30V21Z" fill="url(#fl-right)" stroke="#9F1239" strokeWidth="0.6" />

      {/* Second Foreground Tile Face */}
      <path d="M20 22L30 16V21L20 27V22Z" fill="#F43F5E" opacity="0.4" />

      {/* High Gloss 4-Point Sparkle Lens Flare */}
      <path
        d="M20 12L21 14.5L23.5 15.5L21 16.5L20 19L19 16.5L16.5 15.5L19 14.5L20 12Z"
        fill="#FFFFFF"
      />
      <circle cx="20" cy="15.5" r="1" fill="#FFFFFF" />
    </svg>
  );
}

// 8. Waterproofing: 3D Azure Protective Barrier Shield with Hydrophobic Water Droplet
export function WaterproofingLogo({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wp-shield" x1="8" y1="6" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284C7" />
          <stop offset="0.5" stopColor="#0369A1" />
          <stop offset="1" stopColor="#075985" />
        </linearGradient>
        <linearGradient id="wp-drop" x1="16" y1="14" x2="24" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0F2FE" />
          <stop offset="0.6" stopColor="#7DD3FC" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>

      {/* Protective Shield Dome */}
      <path
        d="M20 5L31 9V19C31 26.5 26 32.5 20 35C14 32.5 9 26.5 9 19V9L20 5Z"
        fill="url(#wp-shield)"
        stroke="#0C4A6E"
        strokeWidth="1"
      />
      {/* Inner Bevel Rim */}
      <path
        d="M20 8L28 11.5V19C28 25 24 29.8 20 32C16 29.8 12 25 12 19V11.5L20 8Z"
        fill="#38BDF8"
        opacity="0.4"
      />

      {/* Hydrophobic 3D Water Droplet */}
      <path
        d="M20 13C20 13 14 20 14 24C14 27.3 16.7 30 20 30C23.3 30 26 27.3 26 24C26 20 20 13 20 13Z"
        fill="url(#wp-drop)"
        stroke="#BAE6FD"
        strokeWidth="0.8"
      />
      {/* Droplet Gloss Reflection */}
      <path d="M18 21C17 22.5 17 25 18.5 26.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.9" />
      <circle cx="21.5" cy="19.5" r="0.8" fill="#FFFFFF" />

      {/* Rain Drop Repelled */}
      <circle cx="30" cy="12" r="1.5" fill="#38BDF8" />
      <circle cx="10" cy="15" r="1.2" fill="#38BDF8" />
    </svg>
  );
}

// Icon mapper helper
export const SERVICE_LOGOS = {
  construction: ConstructionLogo,
  architect: ArchitectLogo,
  painting: PaintingLogo,
  electrical: ElectricalLogo,
  plumbing: PlumbingLogo,
  concrete: ConcreteLogo,
  flooring: FlooringLogo,
  waterproofing: WaterproofingLogo,
};

export function renderServiceLogo(serviceId, className = "w-8 h-8 sm:w-9 sm:h-9") {
  const IconComponent = SERVICE_LOGOS[serviceId];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  return null;
}
