async function runTests() {
  console.log('================================================================');
  console.log('🔒 BuildCity Real JWT Security & PII Protection Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Test Public Endpoints (No Auth needed)
  console.log('--- 1. Testing Public Endpoints (Expected: HTTP 200) ---');
  const publicEndpoints = ['categories', 'regions', 'master-products', 'vendor/listings', 'coupons', 'reviews'];
  for (const ep of publicEndpoints) {
    const res = await fetch(`http://localhost:5000/api/v1/${ep}`);
    assert(res.status === 200, `GET /api/v1/${ep} is public and returns 200`);
  }

  // 2. Test Guarded Endpoints Without Auth (Expected: HTTP 401)
  console.log('\n--- 2. Testing Guarded Endpoints Without Token (Expected: HTTP 401) ---');
  const guardedEndpoints = ['users', 'orders', 'cloud-sync', 'drs', 'vendors'];
  for (const ep of guardedEndpoints) {
    const res = await fetch(`http://localhost:5000/api/v1/${ep}`);
    const body = await res.json().catch(() => ({}));
    assert(res.status === 401 && body.error === 'Authentication required', `GET /api/v1/${ep} blocked with 401`);
  }

  // 3. Test Admin Authentication & Access
  console.log('\n--- 3. Testing Admin Login & Full Access ---');
  const adminLoginRes = await fetch('http://localhost:5000/api/v1/auth/vendor/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9999999999', password: 'admin123' }),
  });
  const adminData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200 && adminData.token && adminData.token.startsWith('eyJ'), 'Admin login returns valid signed JWT');

  const adminToken = adminData.token;

  // Test Admin accessing PII endpoints
  for (const ep of ['users', 'orders', 'cloud-sync', 'drs', 'vendors']) {
    const res = await fetch(`http://localhost:5000/api/v1/${ep}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, `Admin with Bearer JWT accesses /api/v1/${ep} (Status 200)`);
  }

  // 4. Test Customer Role Separation (Customer cannot access Admin PII)
  console.log('\n--- 4. Testing Customer Role-Based Access Control ---');
  const customerVerifyRes = await fetch('http://localhost:5000/api/v1/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9988776655', otp: '123456' }),
  });
  const customerData = await customerVerifyRes.json();
  assert(customerVerifyRes.status === 200 && customerData.token && customerData.token.startsWith('eyJ'), 'Customer verify returns valid signed JWT');

  const customerToken = customerData.token;
  const customerId = customerData.user?.id;

  // Customer attempting to access Admin endpoints (Expected: 403 Forbidden)
  const custUsersRes = await fetch('http://localhost:5000/api/v1/users', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custUsersRes.status === 403, 'Customer token blocked from GET /api/v1/users with 403 Forbidden');

  const custSyncRes = await fetch('http://localhost:5000/api/v1/cloud-sync', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custSyncRes.status === 403, 'Customer token blocked from GET /api/v1/cloud-sync with 403 Forbidden');

  // Customer accessing own profile (Expected: 200)
  const custProfileRes = await fetch(`http://localhost:5000/api/v1/users/by-phone/9988776655`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custProfileRes.status === 200, 'Customer accesses own profile by phone (Status 200)');

  // Customer accessing own addresses (Expected: 200)
  const custAddrRes = await fetch(`http://localhost:5000/api/v1/addresses/${customerId}`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custAddrRes.status === 200, 'Customer accesses own addresses (Status 200)');

  // Customer attempting to access someone else's addresses (Expected: 403 Forbidden)
  const otherAddrRes = await fetch(`http://localhost:5000/api/v1/addresses/some-other-user-uuid-999`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(otherAddrRes.status === 403, "Customer token blocked from reading someone else's addresses (403 Forbidden)");

  console.log('\n================================================================');
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
