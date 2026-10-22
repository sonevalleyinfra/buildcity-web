// BuildCity — Dynamic Category-Driven Attributes Configuration
// Maps category types to dynamic fields, chip presets, and metadata.

export function detectCategoryType(categoryName = "") {
  const cat = (categoryName || "").toLowerCase().trim();
  if (cat.includes("cement") || cat.includes("concrete")) return "cement";
  if (cat.includes("paint") || cat.includes("color") || cat.includes("varnish")) return "paints";
  if (cat.includes("steel") || cat.includes("rebar") || cat.includes("tmt") || cat.includes("sariya") || cat.includes("iron")) return "steel";
  if (cat.includes("tile") || cat.includes("marble") || cat.includes("flooring") || cat.includes("granite")) return "tiles";
  if (cat.includes("pipe") || cat.includes("plumb") || cat.includes("fitting") || cat.includes("sanitary")) return "plumbing";
  if (cat.includes("stone") || cat.includes("sand") || cat.includes("aggregate") || cat.includes("gitti") || cat.includes("morang") || cat.includes("balu")) return "aggregates";
  return "general";
}

export const CATEGORY_SPECS = {
  cement: {
    categoryType: "cement",
    label: "Cement & Concrete",
    brandPresets: ["UltraTech", "Ambuja", "ACC", "Birla Gold", "Shree Cement", "Dalmia", "JK Super", "Bangur"],
    typeLabel: "Product / Cement Type",
    typePresets: ["PPC Cement", "OPC 53 Cement", "OPC 43 Cement", "White Cement", "Waterproof Cement", "Ready Mix Concrete"],
    gradeLabel: "Grade / Specification",
    gradePresets: ["PPC (IS 1489 Part 1)", "OPC 53 Grade", "OPC 43 Grade", "PSC (Slag Cement)", "Weather-Shield / Super"],
    unitLabel: "Unit Packaging",
    unitPresets: ["50kg Bag", "25kg Bag", "1kg Pouch", "Bulk / Loose Ton"],
    defaultUnit: "50kg Bag",
    defaultSuggestedPrice: "390",
    titlePlaceholder: "e.g. UltraTech Super PPC Cement",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  paints: {
    categoryType: "paints",
    label: "Paints & Wall Finishes",
    brandPresets: ["Asian Paints", "Berger", "Nerolac", "Dulux", "Birla Opus", "Indigo Paints", "JSW Paints"],
    typeLabel: "Paint / Application Type",
    typePresets: ["Interior Emulsion", "Exterior Weatherproof", "Waterproofing / Dampproof", "Wall Primer", "Gloss Enamel", "Distemper"],
    gradeLabel: "Surface Finish / Sheen",
    gradePresets: ["Matte / Smooth", "High Gloss", "Satin / Silk", "Rich Sheen", "Eggshell", "Metallic"],
    unitLabel: "Base Packaging Unit",
    unitPresets: ["20 Litre Bucket", "10 Litre Bucket", "4 Litre Can", "1 Litre Can", "500ml Can"],
    defaultUnit: "20 Litre Bucket",
    defaultSuggestedPrice: "4200",
    titlePlaceholder: "e.g. Asian Paints Apex Ultima Exterior Emulsion",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    // Special variant pack sizes supported in paints
    availablePackSizes: ["1 Litre", "4 Litre", "10 Litre", "20 Litre Bucket"],
  },
  steel: {
    categoryType: "steel",
    label: "Steel & TMT Rebars",
    brandPresets: ["Tata Tiscon", "Jindal Panther", "Sail", "Kamdhenu", "Shyam Steel", "Rungta Steel", "Electrosteel"],
    typeLabel: "Product Type",
    typePresets: ["TMT Rebar / Sariya", "Corrosion Resistant (CRS)", "Binding Wire", "Structural Steel", "MS Angle / Channel"],
    gradeLabel: "Steel Grade / Standard",
    gradePresets: ["Fe 550D (High Ductility)", "Fe 500D (Earthquake Resistant)", "Fe 500", "Fe 600", "IS 1786"],
    unitLabel: "Billing / Packaging Unit",
    unitPresets: ["Per Piece (12m)", "Per Bundle", "Per Ton (MT)", "Per Quintal (100kg)"],
    defaultUnit: "Per Piece (12m)",
    defaultSuggestedPrice: "680",
    titlePlaceholder: "e.g. Tata Tiscon 550D TMT Rebar (12mm)",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    diameters: ["8mm", "10mm", "12mm", "16mm", "20mm", "25mm", "32mm"],
  },
  tiles: {
    categoryType: "tiles",
    label: "Tiles & Flooring",
    brandPresets: ["Kajaria", "Somany", "Nitco", "Orientbell", "Johnson Tiles", "Varmora", "Simpolo"],
    typeLabel: "Tile Category / Body",
    typePresets: ["Vitrified Floor Tiles", "Ceramic Wall Tiles", "Double Charge Vitrified", "Glazed Vitrified (GVT)", "Outdoor / Parking Tiles", "Step Tiles"],
    gradeLabel: "Surface Finish & Texture",
    gradePresets: ["Glossy Polish", "High Gloss Mirror", "Matte / Satin", "Carving / Sugar", "Rustic / Anti-Skid"],
    unitLabel: "Box / Packaging Unit",
    unitPresets: ["Box (16 Sq. Ft. / 4 Pcs)", "Box (8 Sq. Ft.)", "Box (12 Sq. Ft.)", "Per Sq. Ft.", "Per Piece"],
    defaultUnit: "Box (16 Sq. Ft. / 4 Pcs)",
    defaultSuggestedPrice: "680",
    titlePlaceholder: "e.g. Kajaria Vitrified Floor Tiles (2x2 ft)",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    tileSizes: ["2x2 ft (600x600mm)", "4x2 ft (1200x600mm)", "1x1 ft (300x300mm)", "2x1 ft (600x300mm)"],
  },
  plumbing: {
    categoryType: "plumbing",
    label: "Plumbing & Pipes",
    brandPresets: ["Astral", "Ashirvad", "Supreme", "Finolex", "Prince Pipes", "Apollo"],
    typeLabel: "Pipe Material / Class",
    typePresets: ["CPVC (Hot & Cold)", "UPVC (Cold Water)", "PVC Conduit", "SWR (Drainage & Rain)", "Agricultural Pipe"],
    gradeLabel: "Pressure Schedule / Class",
    gradePresets: ["SDR 11 (Class 1)", "SDR 13.5 (Class 2)", "Schedule 40", "Schedule 80", "Heavy Duty"],
    unitLabel: "Packaging Unit",
    unitPresets: ["10 ft Pipe", "20 ft Pipe", "Bundle (5 Pcs)", "Per Piece / Fitting"],
    defaultUnit: "10 ft Pipe",
    defaultSuggestedPrice: "240",
    titlePlaceholder: "e.g. Astral CPVC Pro Pipe 1 inch (10 ft)",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
    pipeSizes: ["1/2 inch", "3/4 inch", "1 inch", "1.25 inch", "1.5 inch", "2 inch", "3 inch", "4 inch"],
  },
  aggregates: {
    categoryType: "aggregates",
    label: "Sand, Gravel & Aggregates",
    brandPresets: ["Government Mining Certified", "Sone River Certified", "Ganga Sand", "Standard Quarry"],
    typeLabel: "Material Type",
    typePresets: ["Coarse River Sand (Balu)", "Manufactured Sand (M-Sand)", "Blue Metal Gitti (10mm)", "Blue Metal Gitti (20mm)", "Red Morang Sand"],
    gradeLabel: "Sieve Quality / Zone",
    gradePresets: ["Zone II Standard Sieve", "Zone III Fine", "10mm Crushed Stone", "20mm Concrete Grade"],
    unitLabel: "Selling Unit",
    unitPresets: ["Cubic Feet (CFT)", "Tractor Trolley (~100 CFT)", "Dumper (~400 CFT)", "Per Ton / Metric Ton"],
    defaultUnit: "Cubic Feet (CFT)",
    defaultSuggestedPrice: "48",
    titlePlaceholder: "e.g. Coarse Sone River Sand (Balu)",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
  },
  general: {
    categoryType: "general",
    label: "Building Materials",
    brandPresets: ["BuildCity Certified", "Standard Grade", "Premium Quality"],
    typeLabel: "Product Type",
    typePresets: ["Standard Grade", "Commercial Grade", "Heavy Duty"],
    gradeLabel: "Grade / Specification",
    gradePresets: ["Standard Spec", "Premium Grade", "IS Certified"],
    unitLabel: "Unit Packaging",
    unitPresets: ["Piece", "Box", "Bag", "Set", "Pack"],
    defaultUnit: "Piece",
    defaultSuggestedPrice: "100",
    titlePlaceholder: "e.g. Product Name / Specification",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
  },
};

export function getCategorySpec(categoryName = "") {
  const type = detectCategoryType(categoryName);
  return CATEGORY_SPECS[type] || CATEGORY_SPECS.general;
}
