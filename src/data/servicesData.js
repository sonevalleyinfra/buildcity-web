export const constructionServices = [
  {
    id: "construction",
    name: "Construction Services",
    shortName: "Construction",
    subtitle: "House & Building",
    tag: "With & Without Product",
    bg: "#EFF6FF",
    icon: "🏡",
    subServices: ["House Construction", "Building Construction", "Renovation", "Home Extension"],
    withMaterialRate: 1550, // per sq.ft
    withoutMaterialRate: 240, // per sq.ft
    unit: "sq.ft",
    minArea: 500,
    defaultArea: 1000,
    withMaterialTitle: "With Material (Turnkey Package)",
    withMaterialDesc: "All foundation-to-finish raw materials (UltraTech/Ambuja Cement, TMT Steel, Bricks, Sand, Gitti) + verified contractor & site supervision.",
    withoutMaterialTitle: "Without Product (Labour Rate Only)",
    withoutMaterialDesc: "You buy products on BuildCity store; verified civil contractors & mistries work on fixed per-sq.ft labour rates.",
    highlightsWith: [
      "Branded Cement (UltraTech/Ambuja) & TMT Steel (Tata/Jindal)",
      "Dedicated Site Supervisor & Milestone Quality Testing",
      "Full Architectural & Structural Drawing Support",
      "10-Year Structural Strength Warranty"
    ],
    highlightsWithout: [
      "Experienced Civil Contractors & Mistries",
      "Daily Workmanship Log & Supervision",
      "Fixed sq.ft Labour Rates with No Hidden Charges",
      "Laser Level & Modern Compaction Machinery"
    ]
  },
  {
    id: "architect",
    name: "Engineer & Architect Services",
    shortName: "Engineer & Architect",
    subtitle: "Map, Design & Supervision",
    tag: "With & Without Product",
    bg: "#FAF5FF",
    icon: "👷‍♂️",
    subServices: ["Civil Engineer", "Architect", "Structural Engineer", "Site Supervisor", "Building Map Design"],
    withMaterialRate: 45, // Full plan + 3D + visits
    withoutMaterialRate: 18, // 2D map design only
    unit: "sq.ft",
    minArea: 500,
    defaultArea: 1200,
    withMaterialTitle: "Full Engineering Package (Map + 3D + Site Visits)",
    withMaterialDesc: "2D Floor Plan, 3D Elevation, Structural Drawing, Soil Test Report & Certified Engineer Site Visits during key milestones.",
    withoutMaterialTitle: "Architectural Design Only (Map & 2D/3D)",
    withoutMaterialDesc: "Custom vastu-compliant 2D House Map, municipal sanction drawings & 3D exterior front elevation rendering.",
    highlightsWith: [
      "Vastu-Compliant 2D Floor Plan & Furniture Layout",
      "Photo-realistic 3D Front Elevation",
      "Column, Beam & Footing Structural Drawings",
      "Civil Engineer Physical Visits During Slab Casting"
    ],
    highlightsWithout: [
      "AutoCAD Detailed 2D Architecture Map",
      "Municipal / Development Authority Sanction Layout",
      "Unlimited Revisions Until Floor Plan Approval",
      "Delivered in High-Resolution PDF & DWG Format"
    ]
  },
  {
    id: "painting",
    name: "Painting Services",
    shortName: "Painting",
    subtitle: "Interior, Exterior & Putty",
    tag: "With & Without Product",
    bg: "#F0FDF4",
    icon: "🎨",
    subServices: ["Interior Painting", "Exterior Painting", "Texture Painting", "Wall Putty"],
    withMaterialRate: 35,
    withoutMaterialRate: 12,
    unit: "sq.ft",
    minArea: 500,
    defaultArea: 1500,
    withMaterialTitle: "With Material (Paint + Putty Included)",
    withMaterialDesc: "Asian Paints / Berger Royale, Birla White Putty, Primer, roller tools & 3-coat finish with machine sanding.",
    withoutMaterialTitle: "Without Material (Painter Labour Only)",
    withoutMaterialDesc: "Customer provides paint; experienced painter team works on fixed per-sq.ft labour rate with complete surface prep.",
    highlightsWith: [
      "Birla White Wall Care Putty (2 Coats)",
      "Asian Paints Royale (Interior) / Apex Ultima (Exterior)",
      "Dust-Free Mechanical Sanding Machine Polish",
      "Floor Masking & Clean Site Handover"
    ],
    highlightsWithout: [
      "Skilled Painters with Complete Tools & Rollers",
      "Surface Cracking & Seepage Repair Labour",
      "Smooth Putty Sanding & Prime Base",
      "Uniform Finish with Zero Lap Marks"
    ]
  },
  {
    id: "electrical",
    name: "Electrical Services",
    shortName: "Electrical",
    subtitle: "Wiring, Lighting & Solar",
    tag: "With & Without Product",
    bg: "#FFFBEB",
    icon: "⚡",
    subServices: ["Wiring", "Lighting", "Switchboard", "Inverter", "Solar Installation"],
    withMaterialRate: 195,
    withoutMaterialRate: 40,
    unit: "sq.ft",
    minArea: 300,
    defaultArea: 800,
    withMaterialTitle: "With Material (Wires, Switches & Conduit)",
    withMaterialDesc: "Havells / Polycab FR copper wires, Anchor modular switches, distribution board, conduit pipes & earthing kit.",
    withoutMaterialTitle: "Without Material (Electrician Labour Only)",
    withoutMaterialDesc: "Certified technicians for wall grooving, pipe laying, wire pulling & switchboard installation on labour rate.",
    highlightsWith: [
      "Havells / Polycab Flame Retardant (FR) Copper Wires",
      "Legrand / Anchor Modular Switch Plates & MCB Box",
      "Dedicated Earthing & Load Balancing Setup",
      "Conduit Pipe Concealed Wall Fitting"
    ],
    highlightsWithout: [
      "Certified Electricians with Safety Tools",
      "Chipping, Wall Grooving & Pipe Laying",
      "Switchboard Wiring & Inverter Connection",
      "Fixed Transparent Per-Point / Per-Sq.ft Rates"
    ]
  },
  {
    id: "plumbing",
    name: "Plumbing Services",
    shortName: "Plumbing",
    subtitle: "Pipes, Fitting & Drainage",
    tag: "With & Without Product",
    bg: "#ECFEFF",
    icon: "🔧",
    subServices: ["Pipe Fitting", "Bathroom Fitting", "Water Tank", "Drainage", "Leakage Repair"],
    withMaterialRate: 180,
    withoutMaterialRate: 45,
    unit: "sq.ft",
    minArea: 300,
    defaultArea: 800,
    withMaterialTitle: "With Material (Pipes & Fittings Included)",
    withMaterialDesc: "Astral / Supreme CPVC & UPVC pipes, brass valves, Sintex overhead tank connection & sanitary fixtures.",
    withoutMaterialTitle: "Without Material (Plumber Labour Only)",
    withoutMaterialDesc: "Master plumbers for concealed wall piping, tank installation, drainage lines & bathroom fittings on labour rate.",
    highlightsWith: [
      "Astral / Supreme Heavy Gauge CPVC & UPVC Pipes",
      "Pressure-Tested Leak-Proof Concealed Lines",
      "Overhead Water Tank & Booster Pump Connection",
      "Sanitary Fixture & Diverter Fitting"
    ],
    highlightsWithout: [
      "Certified Master Plumbers",
      "Concealed Grooving & Core Cutting Labour",
      "Sewer & Drainage Line Fitting",
      "Zero Leakage Guarantee"
    ]
  },
  {
    id: "concrete",
    name: "Cement & Concrete Services",
    shortName: "Cement & Concrete",
    subtitle: "RCC, Slab & Plastering",
    tag: "With & Without Product",
    bg: "#F1F5F9",
    icon: "🧱",
    subServices: ["RCC Work", "Slab Casting", "Concrete Work", "Plastering"],
    withMaterialRate: 480,
    withoutMaterialRate: 65,
    unit: "sq.ft",
    minArea: 400,
    defaultArea: 1000,
    withMaterialTitle: "With Material (Cement, Sand, Gitti & Shuttering)",
    withMaterialDesc: "UltraTech Cement, coarse river sand, graded blue metal aggregates, modern vibrator machine & steel shuttering included.",
    withoutMaterialTitle: "Without Material (Slab & Mistry Labour Only)",
    withoutMaterialDesc: "Experienced slab casting team and plaster mistries with mixer machine and leveling tools on per-sq.ft labour rate.",
    highlightsWith: [
      "UltraTech / Ambuja 53 Grade High-Strength Cement",
      "Double Washed Coarse Sand & 20mm Blue Metal Gitti",
      "Steel Plate Shuttering & Mechanical Vibrator Compaction",
      "Smooth 12mm / 15mm Interior & Exterior Wall Plaster"
    ],
    highlightsWithout: [
      "Certified RCC Mistry Gang with Concrete Mixer",
      "Laser Level Shuttering & Beam Prop Alignment",
      "Slab Casting Finishing & Curing Water Ponding",
      "Smooth Sponge & Sand-Face Plaster Workmanship"
    ]
  },
  {
    id: "flooring",
    name: "Flooring Services",
    shortName: "Flooring",
    subtitle: "Tiles, Marble & Granite",
    tag: "With & Without Product",
    bg: "#FFF7ED",
    icon: "🪟",
    subServices: ["Tiles", "Marble", "Granite", "Kota Stone", "Floor Polishing"],
    withMaterialRate: 145,
    withoutMaterialRate: 35,
    unit: "sq.ft",
    minArea: 300,
    defaultArea: 800,
    withMaterialTitle: "With Material (Tiles/Granite + Adhesive)",
    withMaterialDesc: "Kajaria/Somany vitrified tiles, Black Galaxy granite, chemical adhesive, spacer joints & epoxy grouting.",
    withoutMaterialTitle: "Without Material (Tile Mistry Labour Only)",
    withoutMaterialDesc: "Expert tile & marble mistries for laser-level floor laying, 45-degree chamfering & diamond mirror polishing.",
    highlightsWith: [
      "Kajaria / Somany GVT Vitrified Tiles (4x2 or 2x2)",
      "Roff / Laticrete Polymer Tile Adhesive & Epoxy Grout",
      "Black Galaxy Granite Countertops with Moulding",
      "Laser Level Precision & Flawless Alignment"
    ],
    highlightsWithout: [
      "Master Tile Mistries with Water Level & Laser Tools",
      "Diagonal, Spacer & Paper-Joint Laying Expert",
      "Granite Chamfering & Edge Polishing Labour",
      "Diamond Floor Polishing & Wax Finishing"
    ]
  },
  {
    id: "waterproofing",
    name: "Waterproofing Services",
    shortName: "Waterproofing",
    subtitle: "Roof, Terrace & Basement",
    tag: "With & Without Product",
    bg: "#EFF6FF",
    icon: "💧",
    subServices: ["Roof", "Terrace", "Bathroom", "Basement Waterproofing"],
    withMaterialRate: 65,
    withoutMaterialRate: 20,
    unit: "sq.ft",
    minArea: 300,
    defaultArea: 1000,
    withMaterialTitle: "With Material (Chemicals & Membrane Included)",
    withMaterialDesc: "Dr. Fixit / Fosroc polymer coatings, fiberglass mesh reinforcement, crystalline basement barrier & 5-year leak-proof warranty.",
    withoutMaterialTitle: "Without Material (Waterproofing Labour Only)",
    withoutMaterialDesc: "Trained chemical application specialists for crack filling, surface grinding & 3-layer elastomeric coating application.",
    highlightsWith: [
      "Dr. Fixit Newcoat / Raincoat Heavy Elastomeric Coating",
      "Fiberglass Non-Woven Mesh Crack Reinforcement",
      "Crystalline Injection Grouting for Basement & Sunken Area",
      "5-Year Leakage Free Performance Guarantee"
    ],
    highlightsWithout: [
      "Specialized Waterproofing Applicator Team",
      "High-Pressure Surface Washing & Chemical Grinding",
      "Corner Coving & Pipe Collar Sealing Labour",
      "Multi-Coat Primer, Base & Top Layer Application"
    ]
  }
];

export const getServiceById = (id) => {
  return constructionServices.find((s) => s.id === id) || constructionServices[0];
};
