#!/usr/bin/env node
/**
 * Test script for gender/name service.
 * Run: node scripts/test-gender-service.js
 * Requires: GENDER_SERVICE_URL (e.g. http://127.0.0.1:5001), GENDER_SERVICE_TOKEN
 */
const url = process.env.GENDER_SERVICE_URL || "http://127.0.0.1:5001";
const token = process.env.GENDER_SERVICE_TOKEN || "your-secret-token-here";

async function testPredict(name) {
  const res = await fetch(`${url.replace(/\/$/, "")}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gender-Service-Token": token,
    },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function testHealth() {
  const res = await fetch(`${url.replace(/\/$/, "")}/health`, {
    headers: { "X-Gender-Service-Token": token },
  });
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

    // 2. Predict with Google-style display names only
    const tests = [
      "John",
      "Maria",
      "Robert Markowitch",
      "UnknownXyz123",
    ];

    for (let i = 0; i < tests.length; i++) {
      const name = tests[i];
      console.log(`${i + 2}. Predict: name=${JSON.stringify(name)}`);
      const result = await testPredict(name);
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
