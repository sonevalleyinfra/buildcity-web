const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to Supabase PostgreSQL database...");
  const user = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });
  const region = await prisma.region.findFirst();

  if (!user || !region) {
    console.log("User or region missing in DB.");
    return;
  }

  const addr = await prisma.address.create({
    data: {
      userId: user.id,
      regionId: region.id,
      fullName: user.name || "Test Customer",
      phone: user.phone || "7607650875",
      street: "Plot No 108, Mirzapur Industrial Area",
      city: region.name || "Mirzapur",
      state: "Uttar Pradesh",
      pincode: "231001",
      isDefault: true,
    },
  });

  console.log("SUCCESS! Address inserted into Supabase public.addresses:", addr);
}

main().catch((err) => {
  console.error("Test address insert error:", err);
}).finally(() => prisma.$disconnect());
