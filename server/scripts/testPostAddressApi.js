const fetch = require("node-fetch");

async function testApi() {
  console.log("Testing POST /api/v1/addresses endpoint...");
  const res = await fetch("http://localhost:5000/api/v1/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "user-test-123",
      fullName: "Ramesh Sharma",
      phone: "7607650875",
      street: "House 42, Station Road, Mirzapur",
      city: "Mirzapur",
      state: "Uttar Pradesh",
      pincode: "231001",
    }),
  });

  console.log("Status Code:", res.status);
  const data = await res.json();
  console.log("Response Data:", data);
}

testApi().catch((err) => console.error("Test error:", err.message));
