-- Fake "real" production-like rows. Every number here is invented.
CREATE TABLE customer_fcm_tokens (
  user_id TEXT PRIMARY KEY, token TEXT NOT NULL, phone TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());

INSERT INTO regions (id, name) VALUES ('r1', 'Varanasi'), ('r2', 'Lucknow');
INSERT INTO categories (id, name) VALUES ('c1', 'Cement');
INSERT INTO product_masters (id, name, "categoryId") VALUES ('pm1', 'OPC 53 Grade 50kg', 'c1');
INSERT INTO product_images (id, "productMasterId", "imageUrl") VALUES ('pi1', 'pm1', 'https://img.example/pm1.webp');
INSERT INTO banners (id, "imageUrl", "updatedAt") VALUES ('b1', 'https://img.example/b1.webp', now());
INSERT INTO coupons (id, code, title) VALUES ('cp1', 'WELCOME', 'Welcome offer');
INSERT INTO app_settings ("updatedAt") VALUES (now());

INSERT INTO users (id, phone, name, email, password, role, "walletBalance", "updatedAt") VALUES
 ('u1', '9876500001', 'Anil Verma', 'anil.verma@gmail.com', '$2a$10$realhash1', 'CUSTOMER', 150.50, now()),
 ('u2', '9876500002', 'Ramesh Sharma', 'ramesh@sharmacement.in', '$2a$10$realhash2', 'VENDOR', 0, now()),
 ('u3', '8765400003', 'Suresh Kumar', NULL, '$2a$10$realhash3', 'DR', 20, now()),
 ('u4', '9999999999', 'Real Admin Name', 'admin@buildcity.in', '$2a$10$prodadminhash', 'ADMIN', 0, now()),
 ('u5', '7777777777', NULL, NULL, NULL, 'CUSTOMER', 0, now()),
 ('u6', '6123456789', 'Meena Devi', NULL, NULL, 'CUSTOMER', 99.25, now()),
 ('u7', '9876500007', 'Om Gupta', NULL, NULL, 'VENDOR', 0, now()),
 -- u10 sorts before u8's number and is inserted (so updated) first: with a base of 0 it would be issued
 -- 2000000001 while u8, a real user whose phone looks like an issued number, still holds it.
 ('u10', '1234500001', 'Early Sorter', NULL, NULL, 'CUSTOMER', 0, now()),
 ('u8', '2000000001', 'Issued Lookalike', NULL, NULL, 'CUSTOMER', 0, now());
-- Carts snapshot product image URLs; Unsplash ids are 13-digit numbers.
UPDATE users SET "cartItems" = '[{"productId":"vp1","quantity":2,"imageUrl":"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400"}]' WHERE id = 'u1';
UPDATE users SET "cartItems" = '[]' WHERE id = 'u6';

INSERT INTO vendors (id, "userId", "shopName", "ownerName", phone, password, "regionId", status, "addedByDr") VALUES
 ('v1', 'u2', 'Sharma Cement Store', 'Ramesh Sharma', '9876500002', '$2a$10$realhash2', 'r1', 'APPROVED', 'Suresh Kumar'),
 ('v2', 'u7', 'Gupta Traders', 'Om Gupta', '9876500007', NULL, 'r1', 'APPROVED', 'Super Admin');
-- DR phone stored with a +91 prefix: must still link to users.phone 8765400003
INSERT INTO district_representatives (id, "userId", name, phone, password, "regionId") VALUES
 ('d1', 'u3', 'Suresh Kumar', '+918765400003', '$2a$10$realhash3', 'r1');
INSERT INTO vendor_products (id, "masterProductId", "vendorId", "regionId", name, "categoryId", "categoryName", brand, type, grade, unit, price, "imageUrl", description, "approvalStatus", "isActive") VALUES
 ('vp1', 'pm1', 'v1', 'r1', 'OPC 53 Grade 50kg', 'c1', 'Cement', 'Generic', 'OPC', '53', 'Bag', 400, 'https://img.example/pm1.webp', 'Batch 123456789 certified', 'APPROVED', true);

INSERT INTO addresses (id, "userId", "regionId", "fullName", phone, street, pincode) VALUES
 ('a1', 'u1', 'r1', 'Anil Verma', '9876500001', '12 Gandhi Road, Sigra', '221010'),
 ('a2', 'u1', 'r1', 'Anil Verma (site)', '+91 70000 00099', '4 Station Lane', '221002'),
 ('a3', 'u6', 'r2', 'Meena Devi', '6123456789', '8 Hazratganj', '226001'),
 ('a4', 'u1', 'r1', 'Anil Verma (shop)', '022-2345-6789', '9 Market Road', '221010');

-- Idempotency keys embed a 13-digit ms timestamp; multi-vendor siblings append __v<n>.
INSERT INTO orders (id, "orderNumber", "customerId", "addressId", "totalAmount", "walletDiscount", "cashbackEarned", status, "idempotencyKey", "updatedAt") VALUES
 ('o1', 'ORD-1', 'u1', 'a1', 5000.50, 10, 100, 'DELIVERED', 'web_ord_1792512345678_9_abcde', now()),
 ('o2', 'ORD-2', 'u6', 'a3', 1200, 0, 0, 'PENDING', NULL, now()),
 ('o3', 'ORD-3', 'u1', 'a1', 400, 0, 0, 'DELIVERED', 'web_ord_1792512345678_9_abcde__v2', now());
INSERT INTO order_items (id, "orderId", "vendorProductId", "vendorId", "productName", "priceAtPurchase", quantity, "totalPrice") VALUES
 ('oi1', 'o1', 'vp1', 'v1', 'OPC 53 Grade 50kg', 400, 12, 4800),
 ('oi2', 'o2', 'vp1', 'v1', 'OPC 53 Grade 50kg', 400, 3, 1200);
-- customer phone stored with a leading 0, DR phone with spaces: both must still link
INSERT INTO order_returns (id, "orderId", "drId", "drPhone", "customerPhone", "customerName", "returnAmount", "netRefundCash", "returnReason", "returnItems") VALUES
 ('or1', 'o1', 'd1', '+91 87654 00003', '09876500001', 'Anil Verma', 400, 390, 'Customer Anil called 9876500001 or 98765-00001 for pickup', '[{"productName": "OPC 53 Grade 50kg", "vendorName": "Sharma Cement Store"}]');
INSERT INTO reviews (id, "productId", name, comment) VALUES
 ('rv1', 'pm1', 'Anil V', 'Good. Call 9812345678 or mail anil.verma@gmail.com'),
 ('rv2', 'pm1', 'Sunita', 'Fast delivery'),
 ('rv3', 'pm1', 'Mohan', 'Call 98123 45003 or 98123-45004 or 98123.45005 or +91 98123 45006 ok'),
 ('rv4', 'pm1', 'Geeta', 'Phone (981) 234-5003 anytime'),
 ('rv5', 'pm1', 'Hari', 'Try +91 (98123) 45003 or 98 12 34 50 03 today'),
 ('rv6', 'pm1', 'Ira', 'Deliver to 226001 for 12,500.00 total, ref 4500.00');
INSERT INTO wallet_transactions (id, "userId", amount, type, description) VALUES
 ('w1', 'u1', 150.50, 'ORDER_CASHBACK', 'Cashback for order'),
 ('w2', 'u6', 99.25, 'ADMIN_ADJUST', 'Credited after call from 6123456789'),
 ('w3', 'u6', 0, 'ADMIN_ADJUST', 'Spoke to 61234 56789 and 61234-56788'),
 ('w4', 'u1', 50, 'REFERRAL_BONUS', 'Referral bonus of 50 for order by Ramesh Chandra Yadav');

INSERT INTO notifications (id, "userId", title, message) VALUES ('n1', 'u1', 'Order', 'Hi Anil, OTP sent to 9876500001');
INSERT INTO audit_logs (id, "userId", action, details, "ipAddress") VALUES ('al1', 'u4', 'LOGIN', 'admin login from phone 9999999999 and 9876500001', '203.0.113.9');
INSERT INTO otp_verifications (id, phone, otp, "expiresAt") VALUES ('ot1', '9876500001', '123456', now());
INSERT INTO vendor_fcm_tokens (vendor_id, token, phone) VALUES ('v1', 'fake-vendor-token', '9876500002');
INSERT INTO customer_fcm_tokens (user_id, token, phone) VALUES ('u1', 'fake-customer-token', '9876500001');
