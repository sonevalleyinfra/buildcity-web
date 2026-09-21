require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const initialBanners = [
  {
    id: "b-1",
    tag: "BUILD YOUR DREAM SPACE",
    title: "Quality Products. Best Prices.",
    imageUrl: "https://res.cloudinary.com/lbwxvqmg/image/upload/v1788936739/buildcitybanner.jpg",
    targetUrl: "/categories",
    isActive: true,
    displayOrder: 1,
  },
  {
    id: "b-2",
    tag: "DIRECT SITE DELIVERY",
    title: "Wholesale Rates. Zero Middlemen.",
    imageUrl: "https://res.cloudinary.com/lbwxvqmg/image/upload/v1788938503/banner3.png",
    targetUrl: "/categories",
    isActive: true,
    displayOrder: 2,
  },
  {
    id: "b-3",
    tag: "100% CERTIFIED MATERIALS",
    title: "Lab Tested. Site Delivered.",
    imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    targetUrl: "/categories",
    isActive: true,
    displayOrder: 3,
  },
];

async function migrate() {
  try {
    console.log("Connecting to Supabase PostgreSQL database...");

    // 1. Create banners table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "banners" (
        "id" TEXT NOT NULL,
        "tag" TEXT DEFAULT 'BUILD YOUR DREAM SPACE',
        "title" TEXT NOT NULL DEFAULT 'Quality Products. Best Prices.',
        "imageUrl" TEXT NOT NULL,
        "targetUrl" TEXT NOT NULL DEFAULT '/categories',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "displayOrder" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log("✓ 'banners' table verified/created in Supabase PostgreSQL!");

    // 2. Seed initial banners if table is empty
    for (const b of initialBanners) {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "banners" ("id", "tag", "title", "imageUrl", "targetUrl", "isActive", "displayOrder", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT ("id") DO NOTHING;
        `,
        b.id,
        b.tag,
        b.title,
        b.imageUrl,
        b.targetUrl,
        b.isActive,
        b.displayOrder
      );
      console.log(`✓ Banner ${b.id} inserted/verified`);
    }

    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "banners" ORDER BY "displayOrder" ASC;`);
    console.log("✅ Live Banners in Supabase DB:", rows);
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
