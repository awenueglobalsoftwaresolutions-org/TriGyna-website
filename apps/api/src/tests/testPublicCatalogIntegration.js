const assert = require("assert");
const mongoose = require("mongoose");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const User = require("../modules/users/user.model");
const env = require("../config/env");

async function testPublicCatalogIntegration() {
  console.log("================================================================================");
  console.log("   TRIGYNA REAL-TIME PUBLIC WEBSITE & ADMIN DATABASE INTEGRATION VERIFIER       ");
  console.log("================================================================================");

  const baseUrl = "http://127.0.0.1:5000/api/v1";

  // Connect to DB to get admin token
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
  await mongoose.connect(uri);

  const adminUser = await User.findOne({ role: "admin" });
  assert(adminUser, "Admin user Sushil Kumar must exist");
  const adminToken = jwt.sign(
    { id: adminUser._id.toString(), role: adminUser.role },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  console.log(`[AUTH] Authenticated as Admin: ${adminUser.name} (${adminUser.email})`);

  // 1. Fetch public services
  console.log("\n[TEST 1] Testing public services endpoint...");
  const srvRes = await fetch(`${baseUrl}/services?limit=100`);
  assert.strictEqual(srvRes.ok, true, "Public services API must return 200 OK");
  const srvJson = await srvRes.json();
  assert.strictEqual(srvJson.success, true);
  const initialCount = srvJson.data.services.length;
  console.log(`✓ Fetched ${initialCount} active published services from real MongoDB`);
  assert(initialCount >= 20, "Should have seeded services");

  // 2. Fetch public packages
  console.log("\n[TEST 2] Testing public wellness packages endpoint...");
  const pkgRes = await fetch(`${baseUrl}/packages`);
  assert.strictEqual(pkgRes.ok, true, "Public packages API must return 200 OK");
  const pkgJson = await pkgRes.json();
  assert.strictEqual(pkgJson.success, true);
  const pkgCount = pkgJson.data.packages.length;
  console.log(`✓ Fetched ${pkgCount} published wellness packages from real MongoDB`);
  assert(pkgCount >= 10, "Should have seeded packages");

  // 3. Fetch public categories
  console.log("\n[TEST 3] Testing public categories endpoint...");
  const catRes = await fetch(`${baseUrl}/services/categories`);
  assert.strictEqual(catRes.ok, true, "Public categories API must return 200 OK");
  const catJson = await catRes.json();
  assert.strictEqual(catJson.success, true);
  const catCount = catJson.data.categories.length;
  console.log(`✓ Fetched ${catCount} clinical categories from real MongoDB`);
  assert.strictEqual(catCount, 8, "Expected 8 medical categories");

  // 4. Test dynamic single service lookup by slug
  console.log("\n[TEST 4] Testing dynamic service detail lookup by slug...");
  const sampleSlug = "comprehensive-gynecological-consultation";
  const detailRes = await fetch(`${baseUrl}/services/${sampleSlug}`);
  assert.strictEqual(detailRes.ok, true, "Detail API must return 200 OK");
  const detailJson = await detailRes.json();
  assert.strictEqual(detailJson.success, true);
  assert.strictEqual(detailJson.data.service.slug, sampleSlug);
  assert(detailJson.data.service.assignedDoctors.length > 0, "Assigned doctors must be populated");
  console.log(`✓ Successfully resolved '${detailJson.data.service.name}' (${detailJson.data.service.code}) with ${detailJson.data.service.assignedDoctors.length} assigned specialists`);

  // 5. Test Live Admin Creation -> Instant Public Reflection
  console.log("\n[TEST 5] Testing Admin Create Service -> Instant Public Discovery...");
  const uniqueCode = `SRV-E2E-${Date.now().toString().slice(-4)}`;
  const testServicePayload = {
    code: uniqueCode,
    name: "Automated Integration Test Service",
    slug: `auto-test-service-${Date.now()}`,
    category: "Gynecology & Obstetrics",
    durationMinutes: 45,
    baseFee: 1750,
    consultationType: "both",
    status: "active",
    isPublished: true,
    description: "Temporary E2E test clinical service verifying immediate real-time sync with public website.",
    features: ["E2E Feature 1", "E2E Feature 2"],
  };

  const createRes = await fetch(`${baseUrl}/services`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(testServicePayload),
  });
  assert.strictEqual(createRes.ok, true, "Service creation must succeed with admin token");
  const createJson = await createRes.json();
  const createdId = createJson.data.service._id;
  const createdSlug = createJson.data.service.slug;
  console.log(`✓ Created service '${testServicePayload.name}' (${uniqueCode}) in MongoDB by Admin`);

  // Verify it appears in public catalog immediately
  const verifyListRes = await fetch(`${baseUrl}/services?limit=100`);
  const verifyListJson = await verifyListRes.json();
  const foundInPublic = verifyListJson.data.services.some((s) => s.code === uniqueCode);
  assert.strictEqual(foundInPublic, true, "Newly created service must appear in public catalog without server restart");
  console.log(`✓ Verified newly created service immediately discovered in public listing (${verifyListJson.data.services.length} total)`);

  // 6. Test Draft Isolation (Admin marks service as draft -> public site hides it)
  console.log("\n[TEST 6] Testing Draft Isolation: setting service to Draft in admin hides it from public...");
  const updateRes = await fetch(`${baseUrl}/services/${createdId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: "draft", isPublished: false }),
  });
  assert.strictEqual(updateRes.ok, true, "Update to draft must succeed");
  console.log(`✓ Updated status to 'draft' and isPublished to 'false'`);

  // Verify public list no longer includes draft service
  const publicAfterDraftRes = await fetch(`${baseUrl}/services?limit=100`);
  const publicAfterDraftJson = await publicAfterDraftRes.json();
  const isPresentInPublic = publicAfterDraftJson.data.services.some((s) => s.code === uniqueCode);
  assert.strictEqual(isPresentInPublic, false, "Draft service MUST NEVER appear in public services list!");
  console.log("✓ Draft service strictly excluded from public catalog listing");

  // Verify public single slug lookup refuses to return draft service to public visitors
  const draftSlugRes = await fetch(`${baseUrl}/services/${createdSlug}`);
  assert.strictEqual(draftSlugRes.status, 404, "Public access to draft service slug must return 404 Not Found");
  console.log("✓ Direct public slug access to draft service correctly returns 404 Not Found");

  // 7. Cleanup
  console.log("\n[TEST 7] Cleaning up test service...");
  const delRes = await fetch(`${baseUrl}/services/${createdId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(delRes.ok, true, "Deletion must succeed");
  console.log("✓ Cleaned up test service cleanly");

  console.log("\n================================================================================");
  console.log("   ALL REAL-TIME PUBLIC WEBSITE INTEGRATION TESTS PASSED (7/7)                  ");
  console.log("   Public website is dynamically wired to MongoDB with 0 hardcoding!             ");
  console.log("================================================================================\n");

  await mongoose.disconnect();
}

testPublicCatalogIntegration().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
