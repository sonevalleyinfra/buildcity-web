const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const password = process.argv[2];
  if (!password || password.trim().length === 0) {
    console.error("❌ Usage: node scripts/setAdminPassword.js <NewPassword>");
    process.exit(1);
  }

  const cleanPassword = password.trim();
  const hashedPassword = await bcrypt.hash(cleanPassword, 10);

  const admin = await prisma.user.upsert({
    where: { phone: "9999999999" },
    update: {
      password: hashedPassword,
      role: "ADMIN",
    },
    create: {
      phone: "9999999999",
      name: "Super Admin",
      role: "ADMIN",
      password: hashedPassword,
      tokenVersion: 1,
    },
  });

  console.log(`✅ Admin password successfully set and hashed for phone: ${admin.phone} (ID: ${admin.id}, Role: ${admin.role})`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Error setting admin password:", e.message || e);
  await prisma.$disconnect();
  process.exit(1);
});
