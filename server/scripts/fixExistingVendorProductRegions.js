const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fix() {
  console.log("Fixing existing vendor_products rows in Supabase DB...");

  // Find or create Mirzapur region
  let mirzapurReg = await prisma.region.findFirst({
    where: { name: { equals: "Mirzapur", mode: "insensitive" } },
  });

  if (!mirzapurReg) {
    mirzapurReg = await prisma.region.create({
      data: { name: "Mirzapur", state: "Uttar Pradesh", priceFactor: 1.05, baseDeliveryCharge: 49, isActive: true },
    });
  }

  console.log("Found Mirzapur Region UUID:", mirzapurReg.id);

  // Update vendor_products where addedBy or vendor contains Mirzapur or regionId is null
  const updated = await prisma.vendorProduct.updateMany({
    where: {
      OR: [
        { regionId: null },
        { regionName: "Varanasi" },
        { addedBy: { contains: "Mirzapur", mode: "insensitive" } },
      ],
    },
    data: {
      regionId: mirzapurReg.id,
      regionName: "Mirzapur",
      approvalStatus: "APPROVED",
      isActive: true,
    },
  });

  console.log("Updated vendor products count:", updated.count);
  await prisma.$disconnect();
}

fix().catch((err) => {
  console.error("Fix failed:", err);
  process.exit(1);
});
