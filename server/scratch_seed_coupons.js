const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  try {
    const initialCoupons = [
      { code: 'BUILDCITY100', title: 'Flat ₹100 OFF', minOrder: 1000, discountAmount: 100, expiryDate: '2026-12-31', isActive: true, desc: 'Valid on orders above ₹1,000' },
      { code: 'SUPER500', title: 'Flat ₹500 OFF', minOrder: 5000, discountAmount: 500, expiryDate: '2026-12-31', isActive: true, desc: 'Bulk order discount above ₹5,000' },
      { code: 'WELCOME200', title: 'Flat ₹200 OFF', minOrder: 1500, discountAmount: 200, expiryDate: '2026-12-31', isActive: true, desc: 'Special welcome coupon for new site orders' }
    ];

    for (const cp of initialCoupons) {
      const existing = await prisma.coupon.findUnique({ where: { code: cp.code } }).catch(() => null);
      if (!existing) {
        await prisma.coupon.create({ data: cp });
        console.log('✓ Created coupon in Supabase DB:', cp.code);
      } else {
        console.log('• Coupon already exists in Supabase DB:', cp.code);
      }
    }

    const all = await prisma.coupon.findMany();
    console.log('✅ Total coupons live in Supabase PostgreSQL DB:', all.length);
    console.log(all);
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
