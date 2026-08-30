/**
 * Direct SMS Gateway Test Script
 * Usage: node scripts/testSms.js <mobile_number>
 * Example: node scripts/testSms.js 9876543210
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { sendRealSMSOTP } = require("../src/smsService");

const rawPhone = process.argv[2];

if (!rawPhone) {
  console.error("❌ Error: Mobile number missing.");
  console.log("Usage: node scripts/testSms.js <10-digit-mobile-number>");
  process.exit(1);
}

const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

if (cleanPhone.length !== 10) {
  console.error(`❌ Error: "${rawPhone}" is not a valid 10-digit mobile number.`);
  process.exit(1);
}

const testOtp = Math.floor(100000 + Math.random() * 900000).toString();

console.log("==================================================");
console.log("🚀 Testing Aradhya SMS Gateway directly...");
console.log(`📱 Mobile: +91 ${cleanPhone}`);
console.log(`🔢 Generated OTP: ${testOtp}`);
console.log(`👤 Username: ${process.env.SMS_USERNAME || "sonevalley"}`);
console.log(`🔑 Sender ID: ${process.env.SMS_SENDER || "SNVLY"}`);
console.log(`📋 Template ID: ${process.env.SMS_TEMPLATE_ID || "1707175298595096991"}`);
console.log(`🏢 Entity (PE) ID: ${process.env.SMS_PEID || "1701175266640135857"}`);
console.log(`🛣️ Route: ${process.env.SMS_ROUTE || "TRANS"}`);
console.log("==================================================\n");

sendRealSMSOTP(cleanPhone, testOtp)
  .then((result) => {
    console.log("\n=================== RESULT ===================");
    if (result.success) {
      console.log("✅ SMS GATEWAY DISPATCH SUCCESS!");
      console.log("Response:", JSON.stringify(result, null, 2));
    } else {
      console.log("❌ SMS GATEWAY DISPATCH FAILED!");
      console.log("Error details:", JSON.stringify(result, null, 2));
    }
    console.log("==============================================");
    process.exit(result.success ? 0 : 1);
  })
  .catch((err) => {
    console.error("❌ Unexpected Error:", err.message);
    process.exit(1);
  });
