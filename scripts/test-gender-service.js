#!/usr/bin/env node
/**
 * Test script for gender/name service.
 * Run: node scripts/test-gender-service.js
 * Requires: GENDER_SERVICE_URL (e.g. http://127.0.0.1:5001), GENDER_SERVICE_TOKEN
 */
const url = process.env.GENDER_SERVICE_URL || "http://127.0.0.1:5001";
const token = process.env.GENDER_SERVICE_TOKEN || "your-secret-token-here";

async function testPredict(name, email) {
  const body = {};
  if (name) body.name = name;
  if (email) body.email = email;
  const res = await fetch(`${url.replace(/\/$/, "")}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gender-Service-Token": token,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function testHealth() {
  const res = await fetch(`${url.replace(/\/$/, "")}/health`);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log("=== Gender Service Test ===\n");
  console.log("GENDER_SERVICE_URL:", url);
  console.log("GENDER_SERVICE_TOKEN:", token ? "(set)" : "(not set)\n");

  try {
    // 1. Health check
    console.log("1. Health check GET /health");
    const health = await testHealth();
    console.log("   Status:", health.status);
    console.log("   Response:", JSON.stringify(health.data, null, 2));
    if (health.status !== 200) {
      console.log("\n   -> Service may not be running or URL wrong. Start server with GENDER_SERVICE_URL and GENDER_SERVICE_TOKEN set.");
      process.exit(1);
    }
    console.log("");

    // 2. Predict with known names
    const tests = [
      { name: "John", email: null },
      { name: "Maria", email: null },
      { name: "Robert Markowitch", email: null },
      { name: null, email: "john.smith@example.com" },
      { name: null, email: "maria_garcia@test.com" },
      { name: "UnknownXyz123", email: null },
    ];

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      console.log(`${i + 2}. Predict: name=${JSON.stringify(t.name)}, email=${JSON.stringify(t.email)}`);
      const result = await testPredict(t.name, t.email);
      console.log("   Status:", result.status);
      console.log("   Response:", JSON.stringify(result.data, null, 2));
      console.log("   g:", result.data.g ?? "(empty)");
      console.log("   fn:", result.data.fn ?? "(empty)");
      console.log("");
    }
  } catch (err) {
    console.error("Error:", err.message);
    if (err.cause) console.error("Cause:", err.cause);
    process.exit(1);
  }
}

main();
