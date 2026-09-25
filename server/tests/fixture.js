// Seeds a deterministic test fixture into the local test DB.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const tables = ["order_items", "orders", "addresses", "vendor_products", "product_images", "product_masters", "categories", "vendors", "district_representatives", "notifications", "otp_verifications", "audit_logs", "reviews", "coupons", "banners", "users", "regions"];
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.join(",")} CASCADE`);
  await prisma.$executeRawUnsafe(`DO $$ BEGIN IF to_regclass('vendor_fcm_tokens') IS NOT NULL THEN TRUNCATE vendor_fcm_tokens; END IF; END $$`);

  const reg = await prisma.region.create({ data: { name: "Varanasi", baseDeliveryCharge: 49 } });
  const cat = await prisma.category.create({ data: { name: "Cement" } });
  const mp = await prisma.productMaster.create({ data: { name: "Cement Bag", categoryId: cat.id, suggestedPrice: 400 } });
  const mp2 = await prisma.productMaster.create({ data: { name: "Steel Rod", categoryId: cat.id, suggestedPrice: 900 } });

  const hash = (p) => bcrypt.hash(p, 4);
  const admin = await prisma.user.create({ data: { phone: "9999999999", name: "Admin", role: "ADMIN", password: await hash("admin123") } });
  const ua = await prisma.user.create({ data: { phone: "9000000001", name: "Vendor A", role: "VENDOR", password: await hash("vendorA123") } });
  const ub = await prisma.user.create({ data: { phone: "9000000002", name: "Vendor B", role: "VENDOR", password: await hash("vendorB123") } });
  const va = await prisma.vendor.create({ data: { userId: ua.id, shopName: "Shop A", ownerName: "A", phone: "9000000001", password: ua.password, regionId: reg.id, status: "APPROVED" } });
  const vb = await prisma.vendor.create({ data: { userId: ub.id, shopName: "Shop B", ownerName: "B", phone: "9000000002", password: ub.password, regionId: reg.id, status: "APPROVED" } });
  const c1 = await prisma.user.create({ data: { phone: "8000000001", name: "Cust One", role: "CUSTOMER" } });
  const c2 = await prisma.user.create({ data: { phone: "8000000002", name: "Cust Two", role: "CUSTOMER" } });

  const base = { categoryId: cat.id, categoryName: "Cement", brand: "X", type: "T", grade: "G", unit: "Bag", imageUrl: "x", regionId: reg.id, regionName: "Varanasi" };
  const la = await prisma.vendorProduct.create({ data: { ...base, masterProductId: mp.id, vendorId: va.id, name: "Cement Bag", price: 400, stockQty: 50, approvalStatus: "APPROVED", isActive: true } });
  const lb = await prisma.vendorProduct.create({ data: { ...base, masterProductId: mp.id, vendorId: vb.id, name: "Cement Bag", price: 410, stockQty: 50, approvalStatus: "APPROVED", isActive: true } });
  const laPending = await prisma.vendorProduct.create({ data: { ...base, masterProductId: mp2.id, vendorId: va.id, name: "Steel Rod", price: 900, stockQty: 10, approvalStatus: "PENDING_REVIEW", isActive: false } });

  const orderB = await prisma.order.create({
    data: { customerId: c1.id, totalAmount: 459, items: { create: [{ vendorId: vb.id, productName: "Cement Bag", priceAtPurchase: 410, quantity: 1, totalPrice: 410 }] } },
  });
  await prisma.notification.create({ data: { userId: admin.id, title: "Hello", message: "Broadcast" } });
  await prisma.notification.create({ data: { userId: c2.id, title: "Private", message: "For C2 only" } });

  const out = { admin: admin.id, ua: ua.id, ub: ub.id, va: va.id, vb: vb.id, c1: c1.id, c2: c2.id, la: la.id, lb: lb.id, laPending: laPending.id, orderB: orderB.id, reg: reg.id, mp: mp.id };
  console.log(JSON.stringify(out));
}

main().finally(() => prisma.$disconnect());
