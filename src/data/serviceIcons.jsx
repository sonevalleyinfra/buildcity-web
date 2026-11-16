import React from "react";

// 1. House Construction - Realistic 3D Villa with Crane, Glass Windows & Slanted Roof
export function HouseConstructionIcon({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hc-sky" x1="32" y1="2" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0F2FE" />
          <stop offset="1" stopColor="#BAE6FD" />
        </linearGradient>
        <linearGradient id="hc-roof" x1="10" y1="18" x2="44" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EA580C" />
          <stop offset="0.5" stopColor="#C2410C" />
          <stop offset="1" stopColor="#9A3412" />
        </linearGradient>
        <linearGradient id="hc-wall" x1="14" y1="28" x2="42" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="hc-brick" x1="14" y1="42" x2="28" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDBA74" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="hc-glass" x1="16" y1="30" x2="26" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="hc-door" x1="30" y1="36" x2="40" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B45309" />
          <stop offset="1" stopColor="#78350F" />
        </linearGradient>
        <linearGradient id="hc-crane" x1="42" y1="6" x2="58" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <filter id="hc-shadow" x="0" y="2" width="64" height="60" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.15" />
        </filter>
      </defs>

      <g filter="url(#hc-shadow)">
        {/* Foundation ground */}
        <rect x="6" y="52" width="52" height="4" rx="2" fill="#64748B" />
        <rect x="10" y="50" width="44" height="2" fill="#94A3B8" />

        {/* Main Building Wall with 3D Depth */}
        <path d="M12 28L27 15L42 28V52H12V28Z" fill="url(#hc-wall)" />
        {/* Right side depth wall */}
        <path d="M42 28L48 23V47L42 52V28Z" fill="#CBD5E1" />

        {/* 3D Modern Slanted Tiled Roof */}
        <path d="M8 29L27 12L46 29H38L27 18L16 29H8Z" fill="url(#hc-roof)" />
        <path d="M27 12L46 29L52 24L33 8L27 12Z" fill="#9A3412" />

        {/* Chimney */}
        <rect x="16" y="14" width="4" height="8" rx="0.5" fill="#B91C1C" />
        <rect x="15" y="13" width="6" height="2" rx="0.5" fill="#7F1D1D" />

        {/* Brick accent texture on left base */}
        <rect x="14" y="44" width="12" height="7" rx="1" fill="url(#hc-brick)" opacity="0.9" />
        <line x1="14" y1="47.5" x2="26" y2="47.5" stroke="#FFFFFF" strokeWidth="0.6" strokeOpacity="0.7" />
        <line x1="20" y1="44" x2="20" y2="47.5" stroke="#FFFFFF" strokeWidth="0.6" strokeOpacity="0.7" />
        <line x1="17" y1="47.5" x2="17" y2="51" stroke="#FFFFFF" strokeWidth="0.6" strokeOpacity="0.7" />
        <line x1="23" y1="47.5" x2="23" y2="51" stroke="#FFFFFF" strokeWidth="0.6" strokeOpacity="0.7" />

        {/* Glass Window with Realistic Reflection */}
        <rect x="16" y="32" width="10" height="9" rx="1.5" fill="url(#hc-glass)" stroke="#0F172A" strokeWidth="0.8" />
        <line x1="21" y1="32" x2="21" y2="41" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.8" />
        <line x1="16" y1="36.5" x2="26" y2="36.5" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.8" />
        {/* Window gloss slash */}
        <path d="M17 33L24 40" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.8" />

        {/* Wooden Entrance Door */}
        <rect x="29" y="36" width="10" height="15" rx="1.5" fill="url(#hc-door)" stroke="#451A03" strokeWidth="0.8" />
        <rect x="31" y="38" width="6" height="5" rx="0.5" fill="#92400E" />
        <circle cx="32" cy="45" r="1" fill="#FEF08A" />

        {/* Construction Crane Tower & Hoist */}
        <rect x="50" y="8" width="3" height="34" rx="1" fill="url(#hc-crane)" />
        <line x1="50" y1="12" x2="53" y2="16" stroke="#B45309" strokeWidth="0.8" />
        <line x1="50" y1="20" x2="53" y2="24" stroke="#B45309" strokeWidth="0.8" />
        <line x1="50" y1="28" x2="53" y2="32" stroke="#B45309" strokeWidth="0.8" />
        {/* Crane Jib Arm */}
        <path d="M40 8H57L60 12H44L40 8Z" fill="#F59E0B" />
        {/* Hoist cable and hook */}
        <line x1="45" y1="12" x2="45" y2="22" stroke="#475569" strokeWidth="1" strokeDasharray="1 1" />
        <path d="M43.5 22C43.5 24 46.5 24 46.5 22C46.5 20.5 44 20.5 44 22" stroke="#DC2626" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Hanging materials block */}
        <rect x="42" y="24" width="6" height="5" rx="1" fill="#EA580C" />
      </g>
    </svg>
  );
}

// 2. Engineer & Architect - Realistic 3D Yellow Hardhat on Rolled Blueprint with Compass & Ruler
export function ArchitectIcon({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ar-helmet" x1="32" y1="14" x2="32" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.4" stopColor="#EAB308" />
          <stop offset="1" stopColor="#CA8A04" />
        </linearGradient>
        <linearGradient id="ar-blue" x1="10" y1="36" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="ar-compass" x1="24" y1="10" x2="40" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#CBD5E1" />
          <stop offset="0.5" stopColor="#94A3B8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <filter id="ar-shadow" x="2" y="6" width="60" height="54" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter="url(#ar-shadow)">
        {/* Rolled Blueprint Plan Base */}
        <rect x="8" y="38" width="48" height="18" rx="3" fill="url(#ar-blue)" />
        <rect x="11" y="40" width="42" height="14" rx="2" fill="#1D4ED8" />
        {/* Blueprint Grid Lines */}
        <line x1="11" y1="44" x2="53" y2="44" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="2 1.5" strokeOpacity="0.8" />
        <line x1="11" y1="48" x2="53" y2="48" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="2 1.5" strokeOpacity="0.8" />
        <line x1="18" y1="40" x2="18" y2="54" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="2 1.5" strokeOpacity="0.8" />
        <line x1="28" y1="40" x2="28" y2="54" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="2 1.5" strokeOpacity="0.8" />
        <line x1="38" y1="40" x2="38" y2="54" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="2 1.5" strokeOpacity="0.8" />
        <line x1="48" y1="40" x2="48" y2="54" stroke="#93C5FD" strokeWidth="0.8" strokeDasharray="2 1.5" strokeOpacity="0.8" />
        {/* Blueprint House schematic on paper */}
        <path d="M14 51L17 46L20 51H14Z" stroke="#FFFFFF" strokeWidth="0.9" fill="none" />
        <rect x="22" y="47" width="5" height="4" stroke="#FFFFFF" strokeWidth="0.8" fill="none" />

        {/* Realistic 3D Engineer Yellow Safety Helmet */}
        {/* Helmet Crown Dome */}
        <path d="M16 32C16 20 22 13 32 13C42 13 48 20 48 32H16Z" fill="url(#ar-helmet)" />
        {/* Helmet Center Ridge */}
        <path d="M30 13C30 13 31 12 32 12C33 12 34 13 34 13V31H30V13Z" fill="#FEF08A" />
        {/* Helmet Rim / Visor */}
        <path d="M12 32C12 30.8 14 30 18 30H46C50 30 52 30.8 52 32C52 33.5 48 35 32 35C16 35 12 33.5 12 32Z" fill="#CA8A04" />
        <path d="M14 32C14 31.2 16 30.8 20 30.8H44C48 30.8 50 31.2 50 32C50 33 46 34.2 32 34.2C18 34.2 14 33 14 32Z" fill="#FACC15" />
        {/* Helmet specular gleam */}
        <path d="M20 21C22 16.5 26 14.8 30 14.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8" />

        {/* Professional Metal Drafting Compass */}
        <path d="M24 37L32 18L40 37" stroke="url(#ar-compass)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="18" r="2.8" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
        <line x1="27" y1="30" x2="37" y2="30" stroke="#E2E8F0" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// 3. Painting - Realistic 3D Paint Roller with Wet Paint Drip & Vibrant Paint Bucket
export function PaintingIcon({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pt-roll" x1="16" y1="12" x2="48" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="0.5" stopColor="#059669" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="pt-handle" x1="28" y1="38" x2="36" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D97706" />
          <stop offset="1" stopColor="#78350F" />
        </linearGradient>
        <linearGradient id="pt-can" x1="38" y1="32" x2="56" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E2E8F0" />
          <stop offset="0.5" stopColor="#94A3B8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <filter id="pt-shadow" x="4" y="4" width="56" height="56" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter="url(#pt-shadow)">
        {/* Freshly painted wall background patch */}
        <rect x="12" y="8" width="38" height="12" rx="3" fill="#A7F3D0" opacity="0.6" />
        <path d="M16 6C18 5 22 5 26 5H42C46 5 48 6 48 8V12H16V6Z" fill="#34D399" opacity="0.8" />

        {/* 3D Paint Roller Cylinder */}
        <rect x="14" y="11" width="34" height="13" rx="4" fill="url(#pt-roll)" stroke="#065F46" strokeWidth="1" />
        {/* Roller fluffy texture highlights */}
        <rect x="17" y="13" width="28" height="3" rx="1.5" fill="#6EE7B7" />
        <rect x="17" y="18" width="22" height="2" rx="1" fill="#34D399" opacity="0.8" />

        {/* Metal Roller Frame Arm (Chrome finish) */}
        <path d="M48 17H52C53.7 17 55 18.3 55 20V29C55 30.7 53.7 32 52 32H32V38" stroke="#64748B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M48 17H52C53.7 17 55 18.3 55 20V29C55 30.7 53.7 32 52 32H32V38" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Wooden Handle with Grip Ridges */}
        <rect x="29" y="38" width="6" height="18" rx="3" fill="url(#pt-handle)" stroke="#451A03" strokeWidth="1" />
        <line x1="29.5" y1="43" x2="34.5" y2="43" stroke="#FDE68A" strokeWidth="0.8" />
        <line x1="29.5" y1="47" x2="34.5" y2="47" stroke="#FDE68A" strokeWidth="0.8" />
        <line x1="29.5" y1="51" x2="34.5" y2="51" stroke="#FDE68A" strokeWidth="0.8" />

        {/* Wet Paint Dripping Droplets with 3D Gloss */}
        <circle cx="18" cy="28" r="3" fill="#10B981" />
        <circle cx="17.2" cy="27.2" r="0.9" fill="#FFFFFF" />

        <circle cx="25" cy="32" r="2.2" fill="#059669" />
        <circle cx="24.4" cy="31.4" r="0.7" fill="#FFFFFF" />

        <circle cx="14" cy="34" r="1.5" fill="#10B981" />

        {/* Steel Paint Can in Background */}
        <rect x="42" y="36" width="14" height="18" rx="2" fill="url(#pt-can)" />
        {/* Paint Can Rim & Label */}
        <rect x="41" y="34.5" width="16" height="3" rx="1" fill="#CBD5E1" stroke="#475569" strokeWidth="0.6" />
        <rect x="43" y="41" width="12" height="7" rx="0.5" fill="#EF4444" />
        <rect x="44" y="43" width="10" height="3" rx="0.5" fill="#FFFFFF" />
        {/* Paint spilling over edge */}
        <path d="M46 36C46 38 48 39 48 42C48 40 50 39 50 36Z" fill="#10B981" />
      </g>
    </svg>
  );
}

// 4. Electrical - Realistic 3D Modular Switch Socket with Power Plug, Insulated Wires & Electric Spark
export function ElectricalIcon({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="el-board" x1="10" y1="12" x2="54" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.6" stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="el-bolt" x1="24" y1="8" x2="40" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <radialGradient id="el-glow" cx="32" cy="28" r="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" stopOpacity="0.8" />
          <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <filter id="el-shadow" x="4" y="4" width="56" height="56" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.16" />
        </filter>
      </defs>

      <g filter="url(#el-shadow)">
        {/* Ambient Energy Glow */}
        <circle cx="32" cy="28" r="18" fill="url(#el-glow)" />

        {/* 3D Modular Electrical Switchboard Plate */}
        <rect x="12" y="12" width="40" height="40" rx="6" fill="url(#el-board)" stroke="#CBD5E1" strokeWidth="1.2" />
        {/* Inner Socket Bevel */}
        <rect x="16" y="16" width="32" height="32" rx="4" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="0.8" />

        {/* 3-Pin Socket Holes with Depth */}
        {/* Top Earth Pin */}
        <circle cx="32" cy="23" r="3.2" fill="#1E293B" />
        <circle cx="32" cy="23" r="2" fill="#0F172A" />
        {/* Left Live Pin */}
        <circle cx="25" cy="33" r="2.6" fill="#1E293B" />
        <circle cx="25" cy="33" r="1.6" fill="#0F172A" />
        {/* Right Neutral Pin */}
        <circle cx="39" cy="33" r="2.6" fill="#1E293B" />
        <circle cx="39" cy="33" r="1.6" fill="#0F172A" />

        {/* Rocker Switch with LED indicator */}
        <rect x="27" y="40" width="10" height="5" rx="1" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.6" />
        <circle cx="32" cy="42.5" r="1" fill="#22C55E" />

        {/* High Voltage 3D Energy Lightning Bolt Burst */}
        <path
          d="M36 6L20 28H32L26 48L46 24H32L36 6Z"
          fill="url(#el-bolt)"
          stroke="#B45309"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Core Hot White Lightning Streak */}
        <path
          d="M35 10L23 26.5H31.5L28 42L41 25.5H32L35 10Z"
          fill="#FFFFFF"
          opacity="0.85"
        />

        {/* Dynamic Electric Sparkle Dots */}
        <circle cx="16" cy="16" r="1.5" fill="#F59E0B" />
        <circle cx="48" cy="18" r="1.8" fill="#F59E0B" />
        <circle cx="46" cy="44" r="1.5" fill="#F59E0B" />
      </g>
    </svg>
  );
}

// 5. Plumbing - Realistic 3D Chrome Faucet with Crystal Water Drop & Brass Valve Pipe
export function PlumbingIcon({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pl-chrome" x1="12" y1="14" x2="36" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FAFC" />
          <stop offset="0.3" stopColor="#CBD5E1" />
          <stop offset="0.7" stopColor="#94A3B8" />
          <stop offset="1" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id="pl-brass" x1="32" y1="32" x2="52" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="0.5" stopColor="#D97706" />
          <stop offset="1" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id="pl-drop" x1="24" y1="36" x2="36" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="0.6" stopColor="#0284C7" />
          <stop offset="1" stopColor="#0369A1" />
        </linearGradient>
        <filter id="pl-shadow" x="4" y="4" width="56" height="56" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter="url(#pl-shadow)">
        {/* Brass Plumbing Pipe Fitting System */}
        <rect x="36" y="24" width="18" height="8" rx="2" fill="url(#pl-brass)" stroke="#78350F" strokeWidth="0.8" />
        <rect x="50" y="22" width="4" height="12" rx="1" fill="#B45309" stroke="#78350F" strokeWidth="0.8" />
        {/* Pipe Flange Connector */}
        <rect x="34" y="22" width="4" height="12" rx="1" fill="#D97706" />

        {/* Modern 3D Gooseneck Chrome Faucet Tap */}
        <path
          d="M36 28H24C19.6 28 16 24.4 16 20C16 15.6 19.6 12 24 12C28.4 12 32 15.6 32 20V32"
          stroke="url(#pl-chrome)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Chrome Specular Reflection Line */}
        <path
          d="M34 26H24C20.7 26 18 23.3 18 20C18 16.7 20.7 14 24 14C27.3 14 30 16.7 30 20V30"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.85"
        />

        {/* Faucet Aerator Nozzle */}
        <rect x="28" y="30" width="8" height="5" rx="1.5" fill="#475569" stroke="#1E293B" strokeWidth="0.8" />
        <line x1="29" y1="35" x2="35" y2="35" stroke="#94A3B8" strokeWidth="1" />

        {/* Turn Valve Wheel Handle (Fire Engine Red) */}
        <circle cx="24" cy="9" r="5" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" />
        <circle cx="24" cy="9" r="2.2" fill="#FEF2F2" />
        <line x1="24" y1="4" x2="24" y2="14" stroke="#B91C1C" strokeWidth="1.2" />
        <line x1="19" y1="9" x2="29" y2="9" stroke="#B91C1C" strokeWidth="1.2" />

        {/* Crystal Clear 3D Water Droplet Falling from Tap */}
        <path
          d="M32 38C32 38 24 47 24 51C24 55.4 27.6 59 32 59C36.4 59 40 55.4 40 51C40 47 32 38 32 38Z"
          fill="url(#pl-drop)"
          stroke="#0284C7"
          strokeWidth="1"
        />
        {/* Water Droplet 3D Curved Light Reflection */}
        <path
          d="M29 48C28 50 28 53 30 55"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        <circle cx="34" cy="46" r="1.2" fill="#FFFFFF" opacity="0.9" />

        {/* Small Water Splash Bead */}
        <circle cx="43" cy="54" r="1.8" fill="#38BDF8" />
      </g>
    </svg>
  );
}

// 6. Concrete & RCC - Realistic Red Clay Bricks with Grey Mortar Bed & Steel Mason Trowel
export function ConcreteIcon({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cn-brick1" x1="10" y1="26" x2="30" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EA580C" />
          <stop offset="1" stopColor="#9A3412" />
        </linearGradient>
        <linearGradient id="cn-brick2" x1="28" y1="26" x2="52" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316" />
          <stop offset="1" stopColor="#C2410C" />
        </linearGradient>
        <linearGradient id="cn-trowel" x1="28" y1="10" x2="48" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1F5F9" />
          <stop offset="0.5" stopColor="#94A3B8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <filter id="cn-shadow" x="4" y="4" width="56" height="56" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter="url(#cn-shadow)">
        {/* Grey Cement Mortar Bed Base */}
        <rect x="8" y="48" width="48" height="5" rx="2" fill="#94A3B8" />
        <rect x="10" y="37" width="44" height="2.5" fill="#CBD5E1" />

        {/* Row 3 (Bottom Layer Bricks) */}
        <rect x="8" y="40" width="22" height="8" rx="1.5" fill="url(#cn-brick1)" stroke="#7C2D12" strokeWidth="0.8" />
        <rect x="32" y="40" width="24" height="8" rx="1.5" fill="url(#cn-brick2)" stroke="#7C2D12" strokeWidth="0.8" />
        <line x1="9" y1="42" x2="29" y2="42" stroke="#FDBA74" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="33" y1="42" x2="55" y2="42" stroke="#FDBA74" strokeWidth="0.8" strokeOpacity="0.6" />

        {/* Mortar Joint Layer */}
        <rect x="6" y="27" width="48" height="2.5" fill="#CBD5E1" />

        {/* Row 2 (Middle Staggered Bricks) */}
        <rect x="6" y="29.5" width="13" height="8" rx="1.5" fill="url(#cn-brick2)" stroke="#7C2D12" strokeWidth="0.8" />
        <rect x="21" y="29.5" width="22" height="8" rx="1.5" fill="url(#cn-brick1)" stroke="#7C2D12" strokeWidth="0.8" />
        <rect x="45" y="29.5" width="13" height="8" rx="1.5" fill="url(#cn-brick2)" stroke="#7C2D12" strokeWidth="0.8" />
        <line x1="22" y1="31.5" x2="42" y2="31.5" stroke="#FDBA74" strokeWidth="0.8" strokeOpacity="0.6" />

        {/* Fresh Cement Blob Spreading */}
        <ellipse cx="28" cy="27" rx="8" ry="2.5" fill="#94A3B8" />
        <ellipse cx="28" cy="26.5" rx="6" ry="1.8" fill="#CBD5E1" />

        {/* Professional Stainless Steel Mason Trowel */}
        {/* Pointed Diamond Steel Blade */}
        <path d="M40 8L54 18L44 26L30 16L40 8Z" fill="url(#cn-trowel)" stroke="#334155" strokeWidth="1" />
        {/* Steel blade specular shine reflection */}
        <path d="M38 12L48 19L42 22L34 15L38 12Z" fill="#FFFFFF" opacity="0.7" />

        {/* Trowel Angled Shank (Metal neck) */}
        <path d="M44 26L48 33L46 34" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
        {/* Ergonomic Wooden Grip */}
        <rect x="45" y="33" width="7" height="4.5" rx="1.5" fill="#B45309" stroke="#451A03" strokeWidth="0.8" />
        <rect x="47" y="34" width="3" height="2.5" rx="0.5" fill="#F59E0B" />
      </g>
    </svg>
  );
}

// 7. Flooring - Realistic 3D Isometric Polished Marble Tiles with Grout & Sparkle Flare
export function FlooringIcon({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fl-tile-top" x1="32" y1="8" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#FFE4E6" />
          <stop offset="1" stopColor="#FECDD3" />
        </linearGradient>
        <linearGradient id="fl-tile-left" x1="12" y1="24" x2="32" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F43F5E" />
          <stop offset="1" stopColor="#9F1239" />
        </linearGradient>
        <linearGradient id="fl-tile-right" x1="32" y1="24" x2="52" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB7185" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
        <filter id="fl-shadow" x="4" y="4" width="56" height="56" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter="url(#fl-shadow)">
        {/* 3D Isometric Vitrified Floor Tile Block */}
        {/* Top Face (Polished Porcelain Surface) */}
        <path d="M32 10L52 22L32 34L12 22L32 10Z" fill="url(#fl-tile-top)" stroke="#E2E8F0" strokeWidth="1" />
        {/* Subtle Luxury Marble Veining lines */}
        <path d="M22 18C26 21 28 19 36 25" stroke="#FDA4AF" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.7" />
        <path d="M28 14C31 16 33 15 38 18" stroke="#FDA4AF" strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.5" />

        {/* Left 3D Depth Face */}
        <path d="M12 22L32 34V48L12 36V22Z" fill="url(#fl-tile-left)" stroke="#881337" strokeWidth="0.8" />
        {/* Right 3D Depth Face */}
        <path d="M32 34L52 22V36L32 48V34Z" fill="url(#fl-tile-right)" stroke="#9F1239" strokeWidth="0.8" />

        {/* Second Tile Grid Joint (Foreground perspective) */}
        <path d="M32 35L48 25V33L32 43V35Z" fill="#F43F5E" opacity="0.4" />

        {/* High Gloss 4-Point Sparkle Lens Flare */}
        <path
          d="M32 18L33.8 22.5L38 24L33.8 25.5L32 30L30.2 25.5L26 24L30.2 22.5L32 18Z"
          fill="#FFFFFF"
        />
        <circle cx="32" cy="24" r="1.5" fill="#FFFFFF" />

        {/* Mini sparkle star */}
        <path
          d="M44 18L44.8 20L47 20.8L44.8 21.6L44 23.5L43.2 21.6L41 20.8L43.2 20L44 18Z"
          fill="#FFFFFF"
          opacity="0.9"
        />
      </g>
    </svg>
  );
}

// 8. Waterproofing - Realistic 3D Azure Shield with Hydrophobic Water Droplet Repelling
export function WaterproofingIcon({ className = "w-8 h-8 sm:w-9 sm:h-9" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wp-shield" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284C7" />
          <stop offset="0.5" stopColor="#0369A1" />
          <stop offset="1" stopColor="#075985" />
        </linearGradient>
        <linearGradient id="wp-rim" x1="14" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="wp-drop" x1="26" y1="20" x2="38" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0F2FE" />
          <stop offset="0.5" stopColor="#7DD3FC" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
        <filter id="wp-shadow" x="4" y="4" width="56" height="56" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.2" />
        </filter>
      </defs>

      <g filter="url(#wp-shadow)">
        {/* 3D Protective Waterproof Shield Body */}
        <path
          d="M32 8L50 14V30C50 42 42 51.5 32 56C22 51.5 14 42 14 30V14L32 8Z"
          fill="url(#wp-shield)"
          stroke="#0C4A6E"
          strokeWidth="1.2"
        />
        {/* Inner Shield Bevel Rim */}
        <path
          d="M32 12L46 17V30C46 39.5 39.5 47.5 32 51.5C24.5 47.5 18 39.5 18 30V17L32 12Z"
          fill="url(#wp-rim)"
        />
        {/* Shield Right Half Depth Shade */}
        <path
          d="M32 12L46 17V30C46 39.5 39.5 47.5 32 51.5V12Z"
          fill="#0369A1"
          opacity="0.5"
        />

        {/* Realistic 3D Hydrophobic Water Droplet Inside Shield */}
        <path
          d="M32 20C32 20 23 31 23 37C23 42 27 46 32 46C37 46 41 42 41 37C41 31 32 20 32 20Z"
          fill="url(#wp-drop)"
          stroke="#BAE6FD"
          strokeWidth="1"
        />
        {/* Water Droplet 3D Gloss Highlight */}
        <path
          d="M29 32C27.5 34.5 27.5 38 29.5 40.5"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        <circle cx="34" cy="30" r="1.3" fill="#FFFFFF" opacity="0.9" />

        {/* Repelled Water Rain Drop bouncing off shield */}
        <circle cx="48" cy="18" r="2.2" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="0.8" />
        <circle cx="16" cy="22" r="1.8" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="0.8" />
      </g>
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

export function renderServiceLogo(serviceId, className = "w-8 h-8 sm:w-9 sm:h-9") {
  const IconComponent = SERVICE_ICONS[serviceId];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  return null;
}
