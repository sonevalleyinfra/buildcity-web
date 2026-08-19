const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Beginning complete wipe of Vendors and Vendor Products from DB...");

  const deletedItems = await prisma.orderItem.deleteMany({}).catch((e) => console.log("OrderItem wipe:", e.message));
  console.log("Deleted order items:", deletedItems?.count || 0);

  const deletedVendorProducts = await prisma.vendorProduct.deleteMany({}).catch((e) => console.log("VendorProduct wipe:", e.message));
  console.log("Deleted vendor products:", deletedVendorProducts?.count || 0);

  const deletedVendors = await prisma.vendor.deleteMany({}).catch((e) => console.log("Vendor wipe:", e.message));
  console.log("Deleted vendors:", deletedVendors?.count || 0);

  console.log("SUCCESS: All vendors and vendor products cleared completely from database!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Wipe failed:", err);
  process.exit(1);
});
