// ye helper product ki category, name aur unit ke hisaab se default rule-based packaging packs generate karta hai
export function getDefaultPacksForProduct(product) {
  if (!product) return [];

  const basePrice = Number(product.price) || 100;
  const baseMrp = Number(product.mrp) || basePrice;

  // Category aur name ko normalize karte hai taaki category ke hisaab se unit set ho sake
  const catRaw = (
    (typeof product.category === "string" ? product.category : product.category?.name) ||
    product.categoryName ||
    (typeof product.masterProduct?.category === "string" ? product.masterProduct?.category : product.masterProduct?.category?.name) ||
    product.masterProduct?.categoryName ||
    ""
  ).toLowerCase().trim();

  const nameLower = (product.name || "").toLowerCase().trim();
  const rawUnit = (product.unit || "").trim();
  const unitLower = rawUnit.toLowerCase();

  // Category detection logic
  const isPaint =
    catRaw.includes("paint") ||
    catRaw.includes("coating") ||
    catRaw.includes("primer") ||
    catRaw.includes("distemper") ||
    catRaw.includes("varnish") ||
    catRaw.includes("waterproof") ||
    nameLower.includes("paint") ||
    nameLower.includes("emulsion") ||
    nameLower.includes("apex") ||
    nameLower.includes("royale") ||
    nameLower.includes("distemper") ||
    nameLower.includes("primer") ||
    nameLower.includes("tractor") ||
    nameLower.includes("nerolac") ||
    nameLower.includes("berger") ||
    nameLower.includes("asian paints") ||
    nameLower.includes("dr fixit") ||
    nameLower.includes("thinner");

  const isCement =
    !isPaint &&
    (catRaw.includes("cement") ||
      catRaw.includes("putty") ||
      catRaw.includes("mortar") ||
      nameLower.includes("cement") ||
      nameLower.includes("ppc") ||
      nameLower.includes("opc") ||
      nameLower.includes("ultratech") ||
      nameLower.includes("ambuja") ||
      nameLower.includes("acc ") ||
      nameLower.includes("birla") ||
      nameLower.includes("jk super") ||
      unitLower.includes("bag") ||
      unitLower.includes("50 kg") ||
      unitLower.includes("50kg"));

  const isSteel =
    !isPaint &&
    !isCement &&
    (catRaw.includes("steel") ||
      catRaw.includes("rebar") ||
      catRaw.includes("tmt") ||
      catRaw.includes("iron") ||
      nameLower.includes("steel") ||
      nameLower.includes("tiscon") ||
      nameLower.includes("tmt") ||
      nameLower.includes("rebar") ||
      nameLower.includes("saria") ||
      nameLower.includes("kamdhenu") ||
      nameLower.includes("jindal"));

  const isTile =
    !isPaint &&
    !isCement &&
    !isSteel &&
    (catRaw.includes("tile") ||
      catRaw.includes("marble") ||
      catRaw.includes("granite") ||
      catRaw.includes("floor") ||
      nameLower.includes("tile") ||
      nameLower.includes("vitrified") ||
      nameLower.includes("ceramic"));

  const isAggregate =
    !isPaint &&
    !isCement &&
    !isSteel &&
    (catRaw.includes("stone") ||
      catRaw.includes("aggregate") ||
      catRaw.includes("sand") ||
      catRaw.includes("gitti") ||
      catRaw.includes("morang") ||
      nameLower.includes("sand") ||
      nameLower.includes("gitti") ||
      nameLower.includes("crushed stone") ||
      nameLower.includes("aggregate") ||
      nameLower.includes("balu") ||
      nameLower.includes("morang") ||
      nameLower.includes("bajri"));

  // Ab category ke hisaab se packaging units aur bulk multipliers (minimum 5 se shuru)
  let cleanUnit = "Unit";
  let packMultipliers = [5, 10, 20, 50];
  let customLabels = null;

  if (isPaint) {
    // Paint ke bulk packs: 5L, 10L, 20L, 50L
    cleanUnit = "1 Litre";
    packMultipliers = [5, 10, 20, 50];
    customLabels = {
      5: "5 Litre (Bucket)",
      10: "10 Litre (Bucket)",
      20: "20 Litre (Drum)",
      50: "50 Litre (Commercial)",
    };
  } else if (isCement) {
    // Cement aur Putty 50 kg Bag packaging: minimum 5 bags se bulk packs
    cleanUnit = "50 kg";
    packMultipliers = [5, 10, 20, 50, 100];
    customLabels = {
      5: "50 kg, Pack of 5",
      10: "50 kg, Pack of 10",
      20: "50 kg, Pack of 20",
      50: "50 kg, Pack of 50",
      100: "50 kg, Pack of 100",
    };
  } else if (isSteel) {
    if (unitLower.includes("piece") || unitLower.includes("pc") || unitLower.includes("rod") || unitLower.includes("bar")) {
      cleanUnit = "1 Piece";
      packMultipliers = [5, 10, 25, 50, 100];
      customLabels = {
        5: "1 Bundle (5 Pcs)",
        10: "2 Bundles (10 Pcs)",
        25: "5 Bundles (25 Pcs)",
        50: "10 Bundles (50 Pcs)",
        100: "1 Ton Bulk (~100 Pcs)",
      };
    } else {
      cleanUnit = "1 Ton";
      packMultipliers = [3, 5, 10, 20];
      customLabels = {
        3: "3 Ton (Mini Load)",
        5: "5 Ton (Truck Load)",
        10: "10 Ton (Project Bulk)",
        20: "20 Ton (Trailer Load)",
      };
    }
  } else if (isTile) {
    cleanUnit = "1 Box";
    packMultipliers = [5, 10, 25, 50];
    customLabels = {
      5: "5 Boxes",
      10: "10 Boxes",
      25: "25 Boxes",
      50: "50 Boxes",
    };
  } else if (isAggregate) {
    if (unitLower.includes("cft")) {
      cleanUnit = "100 CFT";
      packMultipliers = [5, 10, 20, 50];
    } else {
      cleanUnit = "1 Ton";
      packMultipliers = [5, 10, 20, 50];
      customLabels = {
        5: "5 Ton",
        10: "10 Ton",
        20: "20 Ton",
        50: "50 Ton",
      };
    }
  } else {
    // Baaki general categories (Plumbing, Electrical, Hardware)
    if (unitLower.includes("litre") || unitLower.includes("ltr") || unitLower.includes("liter")) {
      cleanUnit = "1 Litre";
      packMultipliers = [5, 10, 20, 50];
    } else if (unitLower.includes("ton")) {
      cleanUnit = "1 Ton";
      packMultipliers = [5, 10, 20, 50];
    } else if (unitLower.includes("50 kg") || unitLower.includes("bag")) {
      cleanUnit = "50 kg";
      packMultipliers = [5, 10, 20, 50, 100];
    } else if (unitLower.includes("kg")) {
      cleanUnit = "1 Kg";
      packMultipliers = [5, 10, 25, 50];
    } else if (unitLower.includes("bundle")) {
      cleanUnit = "1 Bundle";
      packMultipliers = [5, 10, 20, 50];
    } else {
      cleanUnit = rawUnit && rawUnit.toLowerCase() !== "unit" ? rawUnit : "1 Piece";
      packMultipliers = [5, 10, 20, 50];
    }
  }

  return packMultipliers.map((qty) => {
    // Bulk discount logic: quantity badhne par extra discount rate
    let bulkDiscountRate = 0.02;
    if (qty >= 100) bulkDiscountRate = 0.08;
    else if (qty >= 50) bulkDiscountRate = 0.06;
    else if (qty >= 20) bulkDiscountRate = 0.04;
    else if (qty >= 10) bulkDiscountRate = 0.03;

    const unitDiscountedPrice = basePrice * (1 - bulkDiscountRate);
    const finalPrice = Math.round(unitDiscountedPrice * qty);
    const finalMrp = Math.round(baseMrp * qty);
    const savings = Math.max(0, finalMrp - finalPrice);
    const discountPct = Math.round(((finalMrp - finalPrice) / finalMrp) * 100);

    const label =
      customLabels && customLabels[qty]
        ? customLabels[qty]
        : `${cleanUnit}, Pack of ${qty}`;

    return {
      qty,
      unitName: cleanUnit,
      label,
      price: finalPrice,
      mrp: finalMrp,
      savings,
      discountPct,
      perUnitPrice: Math.round(finalPrice / qty),
      isBulk: true,
    };
  });
}

// Helper: single unit ke label ko clean format me render karta hai (jaise "1 Bag (50 kg)")
export function getStandardPackLabel(unit) {
  const raw = (unit || "Unit").trim();
  const lower = raw.toLowerCase();

  // Cement / Putty: 50kg bag -> "1 Bag (50 kg)"
  if (lower.includes("50") || lower.includes("bag")) {
    return "1 Bag (50 kg)";
  }
  // Agar pehle se "1 " se shuru hai jaise "1 Litre", "1 Piece", "1 Ton", "1 Box"
  if (/^1\s+/i.test(raw)) {
    return `${raw} (Standard)`;
  }
  // Agar kisi number se shuru hai jaise "100 CFT"
  if (/^\d+/i.test(raw)) {
    return `${raw} (Standard)`;
  }
  return `1 ${raw} (Standard)`;
}

// Steel TMT Rebar Diameter Specs & Weight Multipliers (Standard IS 1786)
export const STEEL_DIAMETERS = ["8mm", "10mm", "12mm", "16mm", "20mm", "25mm", "32mm"];

export const STEEL_DIAMETER_FACTORS = {
  "8mm": 0.72,
  "10mm": 1.0,
  "12mm": 1.44,
  "16mm": 2.56,
  "20mm": 4.0,
  "25mm": 6.25,
  "32mm": 10.2,
};

export function getDiameterPrice(basePrice, targetDia = "12mm", baseDia = "10mm") {
  const p = Number(basePrice) || 680;
  const targetFactor = STEEL_DIAMETER_FACTORS[targetDia] || 1.0;
  const baseFactor = STEEL_DIAMETER_FACTORS[baseDia] || 1.0;
  return Math.round((p * targetFactor) / baseFactor);
}

// Master function: vendor custom packs available hone par custom packs use karega,
// warna rule-based default packs use karega taaki Tata Steel, Cement, Paint sabhi par bulk order ON rahe
export function generateProductPacks(product) {
  if (!product) return [];

  let rawCustom = product.customPacks || product.custom_packs || product.masterProduct?.customPacks;
  if (typeof rawCustom === "string") {
    try {
      rawCustom = JSON.parse(rawCustom);
    } catch {}
  }

  const basePrice = Number(product.price) || 100;
  const baseMrp = Number(product.mrp) || basePrice;
  const cleanUnit = product.unit || "Unit";

  // Base 1 unit option for customer selector
  const basePack = {
    qty: 1,
    unitName: cleanUnit,
    label: getStandardPackLabel(cleanUnit),
    price: basePrice,
    mrp: baseMrp,
    savings: Math.max(0, baseMrp - basePrice),
    discountPct: (baseMrp > basePrice && basePrice > 0) ? Math.round(((baseMrp - basePrice) / baseMrp) * 100) : 0,
    perUnitPrice: basePrice,
    isBulk: false,
    stock: product.stockQty !== undefined ? Number(product.stockQty) : 100,
  };

  // 0. Agar vendor ne bulk rates explicitly OFF kiya ho (Toggle switch OFF)
  if (product.bulkEnabled === false || product.bulk_enabled === false) {
    return [basePack];
  }
  if (product.id && typeof window !== "undefined") {
    try {
      const storedBulk = JSON.parse(localStorage.getItem("buildcity_bulk_enabled") || "{}");
      if (storedBulk[product.id] === false) {
        return [basePack];
      }
    } catch {}
  }

  // 1. Agar vendor ne manual custom bulk packs array set kiya hai
  if (Array.isArray(rawCustom) && rawCustom.length > 0) {
    const bulkOptions = rawCustom
      .filter((pk) => Number(pk.qty) > 1)
      .map((pk) => {
        const qty = Number(pk.qty) || 5;
        const price = Number(pk.price) > 0 ? Number(pk.price) : Math.round(basePrice * qty);
        const mrp = Number(pk.mrp) > 0 ? Number(pk.mrp) : Math.round(baseMrp * qty);
        const savings = Math.max(0, mrp - price);
        const discountPct = (mrp > price && price > 0) ? Math.round(((mrp - price) / mrp) * 100) : 0;

        return {
          qty,
          unitName: pk.unitName || pk.label || cleanUnit,
          label: pk.label || `${cleanUnit}, Pack of ${qty}`,
          price,
          mrp,
          savings,
          discountPct,
          perUnitPrice: Math.round(price / qty),
          isBulk: true,
          stock: pk.stock !== undefined && pk.stock !== "" ? Number(pk.stock) : (Number(product.stockQty) || 100),
        };
      });

    if (bulkOptions.length > 0) {
      return [basePack, ...bulkOptions];
    }
  }

  // 2. Fallback rule-based default packs (taaki Tata Steel, Rebars, Cement, Paints sabhi par bulk packs ON rahein!)
  const defaultPacks = getDefaultPacksForProduct(product);
  if (Array.isArray(defaultPacks) && defaultPacks.length > 0) {
    return [basePack, ...defaultPacks];
  }

  return [basePack];
}

