const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Supabase PostgreSQL Database for BuildCity...");

  // 1. Seed Regions
  const regionVNS = await prisma.region.upsert({
    where: { name: "Varanasi" },
    update: {},
    create: {
      name: "Varanasi",
      state: "Uttar Pradesh",
      baseDeliveryCharge: 49.0,
      isActive: true,
    },
  });

  const regionMZP = await prisma.region.upsert({
    where: { name: "Mirzapur" },
    update: {},
    create: {
      name: "Mirzapur",
      state: "Uttar Pradesh",
      baseDeliveryCharge: 79.0,
      isActive: true,
    },
  });

  // 2. Seed Categories
  const catCement = await prisma.category.upsert({
    where: { name: "Cement" },
    update: {},
    create: { name: "Cement", productCount: 120 },
  });

  const catPaints = await prisma.category.upsert({
    where: { name: "Paints" },
    update: {},
    create: { name: "Paints", productCount: 150 },
  });

  // 3. Seed Core Users
  const adminUser = await prisma.user.upsert({
    where: { phone: "9999999999" },
    update: {},
    create: {
      phone: "9999999999",
      name: "Super Admin",
      role: "ADMIN",
      tokenVersion: 1,
    },
  });

  const drUser = await prisma.user.upsert({
    where: { phone: "7777777777" },
    update: {},
    create: {
      phone: "7777777777",
      name: "Ramesh Sharma",
      role: "DR",
      tokenVersion: 1,
    },
  });

  const vendorUser = await prisma.user.upsert({
    where: { phone: "9876543210" },
    update: { name: "Rakesh Gupta" },
    create: {
      phone: "9876543210",
      name: "Rakesh Gupta",
      role: "VENDOR",
      tokenVersion: 1,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { phone: "7607650875" },
    update: {},
    create: {
      phone: "7607650875",
      name: "Rahul Kumar",
      role: "CUSTOMER",
      tokenVersion: 1,
    },
  });

  // 4. Seed DR Entry
  const drCount = await prisma.dR.count();
  if (drCount === 0) {
    await prisma.dR.create({
      data: {
        userId: drUser.id,
        name: "Ramesh Sharma",
        phone: "7777777777",
        regionId: regionVNS.id,
        status: "ACTIVE",
      },
    });
  }

  // 5. Seed Vendor Entry
  const vendorCount = await prisma.vendor.count();
  let vendorEntry;
  if (vendorCount === 0) {
    vendorEntry = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        shopName: "Shree Cement Traders",
        ownerName: "Rakesh Gupta",
        phone: "9876543210",
        regionId: regionVNS.id,
        commissionRate: 10.0,
        addedByDr: "Ramesh Sharma",
        status: "APPROVED",
      },
    });
  } else {
    vendorEntry = await prisma.vendor.findFirst({ where: { phone: "9876543210" } });
  }

  const vId = vendorEntry ? vendorEntry.id : "v1";

  // 6. Seed Sample Orders with Items assigned to vendorId
  const orderCount = await prisma.order.count();
  if (orderCount === 0) {
    const ord1 = await prisma.order.create({
      data: {
        customerId: customerUser.id,
        totalAmount: 1950.0,
        deliveryFee: 49.0,
        paymentMode: "COD",
        status: "PENDING",
        idempotencyKey: "seed_ord_1",
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: ord1.id,
        productName: "UltraTech Super PPC Cement x5 Bags",
        quantity: 5,
        unitPrice: 390.0,
        totalPrice: 1950.0,
        vendorId: vId,
      },
    });

    const ord2 = await prisma.order.create({
      data: {
        customerId: customerUser.id,
        totalAmount: 2250.0,
        deliveryFee: 0.0,
        paymentMode: "COD",
        status: "PROCESSING",
        idempotencyKey: "seed_ord_2",
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: ord2.id,
        productName: "Asian Paints Royale Luxury Emulsion 20L",
        quantity: 1,
        unitPrice: 2250.0,
        totalPrice: 2250.0,
        vendorId: vId,
      },
    });
  }

  console.log("✅ Seed completed successfully on Supabase PostgreSQL Database!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
