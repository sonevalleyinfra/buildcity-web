// Image resolvers for vendor product / category tiles — bundled offline assets first, zero-latency fallbacks

const bundledAssetFor = (categoryName = "", productName = "") => {
  const cat = (categoryName || "").toLowerCase();
  const name = (productName || "").toLowerCase();

  if (cat.includes("cement") || name.includes("cement") || name.includes("birla") || name.includes("acc") || name.includes("ultratech") || name.includes("ambuja")) {
    return "/categories/cement.png";
  }
  if (cat.includes("steel") || cat.includes("tmt") || name.includes("steel") || name.includes("tmt") || name.includes("jindal") || name.includes("tata tiscon")) {
    return "/categories/steel.png";
  }
  if (cat.includes("paint") || name.includes("paint") || name.includes("asian") || name.includes("berger") || name.includes("nerolac")) {
    return "/categories/paints.png";
  }
  if (cat.includes("plumb") || cat.includes("pipe") || name.includes("pipe") || name.includes("astral") || name.includes("ashirvad") || name.includes("supreme")) {
    return "/categories/plumbing.png";
  }
  if (cat.includes("tile") || cat.includes("marble") || name.includes("tile") || name.includes("kajaria") || name.includes("somany")) {
    return "/categories/tiles.png";
  }
  if (cat.includes("stone") || cat.includes("sand") || cat.includes("aggregate") || cat.includes("gitti") || cat.includes("morang") || cat.includes("balu")) {
    return "/categories/crushed_stone.png";
  }
  if (cat.includes("rebar") || name.includes("rebar") || name.includes("rod") || name.includes("sariya")) {
    return "/categories/rebars.png";
  }
  return "/categories/cement.png";
};

export const resolveProductImage = (imageUrl, categoryName = "", productName = "") => {
  if (!imageUrl) {
    return bundledAssetFor(categoryName, productName);
  }
  let clean = "";
  if (Array.isArray(imageUrl) && imageUrl.length > 0) {
    clean = String(imageUrl.filter(Boolean)[0] || "").trim();
  } else if (typeof imageUrl === "string") {
    // If comma-separated URLs, extract the first valid URL
    const parts = imageUrl.split(",").map((s) => s.trim()).filter(Boolean);
    clean = parts[0] || "";
  }
  if (!clean) {
    return bundledAssetFor(categoryName, productName);
  }
  // Already a local asset
  if (clean.startsWith("/") || clean.startsWith("assets/")) {
    return clean;
  }
  // Unsplash: request a small thumbnail so it loads fast
  if (clean.includes("images.unsplash.com")) {
    const base = clean.split("?")[0];
    return `${base}?auto=format&fit=crop&w=300&h=300&q=80`;
  }
  return clean;
};

// Category bubble image resolver matching circular category tiles
export const resolveCategoryBubbleImage = (catName = "") => {
  const lower = (catName || "").toLowerCase().trim();
  if (lower.includes("cement")) return "/categories/cement.png";
  if (lower.includes("steel")) return "/categories/steel.png";
  if (lower.includes("rebar") || lower.includes("sariya")) return "/categories/rebars.png";
  if (lower.includes("stone") || lower.includes("gitti") || lower.includes("crush") || lower.includes("aggregate")) return "/categories/crushed_stone.png";
  if (lower.includes("tile")) return "/categories/tiles.png";
  if (lower.includes("plumb") || lower.includes("pipe")) return "/categories/plumbing.png";
  if (lower.includes("paint")) return "/categories/paints.png";
  if (lower.includes("brick")) return "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=160&q=80";
  if (lower.includes("elect")) return "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=160&q=80";
  return "/categories/cement.png";
};

// Listed product image, falling back to its master-catalog image
export const listingImage = (p, masterProducts = []) => {
  if (!p) return "/categories/cement.png";
  let rawUrl = "";
  if (Array.isArray(p.images) && p.images.filter(Boolean).length > 0) {
    rawUrl = p.images.filter(Boolean)[0];
  } else if (p.imageUrl) {
    rawUrl = p.imageUrl;
  } else if (p.img) {
    rawUrl = p.img;
  } else {
    const matchedMaster = (masterProducts || []).find((m) => m.id === (p.masterProductId || p.id));
    if (matchedMaster) {
      if (Array.isArray(matchedMaster.images) && matchedMaster.images.filter(Boolean).length > 0) {
        rawUrl = matchedMaster.images.filter(Boolean)[0];
      } else {
        rawUrl = matchedMaster.imageUrl;
      }
    }
  }
  return resolveProductImage(rawUrl, p.categoryName || p.category, p.name);
};

// Universal clean image helper for any product or item object
export const cleanProductImage = (itemOrUrl, categoryName = "", productName = "") => {
  if (!itemOrUrl) return bundledAssetFor(categoryName, productName);
  if (typeof itemOrUrl === "string") {
    return resolveProductImage(itemOrUrl, categoryName, productName);
  }
  const it = itemOrUrl;
  let raw = "";
  if (Array.isArray(it.images) && it.images.filter(Boolean).length > 0) {
    raw = it.images.filter(Boolean)[0];
  } else if (it.imageUrl) {
    raw = it.imageUrl;
  } else if (it.img) {
    raw = it.img;
  } else if (it.masterProduct?.imageUrl) {
    raw = it.masterProduct.imageUrl;
  } else if (it.vendorProduct?.imageUrl) {
    raw = it.vendorProduct.imageUrl;
  }
  return resolveProductImage(raw, it.categoryName || it.category, it.name || it.productName);
};

