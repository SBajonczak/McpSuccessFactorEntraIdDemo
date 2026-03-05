/**
 * Simple test / demonstration script for computeMismatches.
 * Run with: npm run test:mismatches
 */
import { listSapUsers } from "./sapClient";
import { listEntraUsers } from "./entraClient";
import { computeMismatches } from "./mismatches";

async function main(): Promise<void> {
  const [sapUsers, entraUsers] = await Promise.all([
    listSapUsers(),
    listEntraUsers(),
  ]);

  console.log(`SAP users   : ${sapUsers.length}`);
  console.log(`Entra users : ${entraUsers.length}`);

  const mismatches = computeMismatches(sapUsers, entraUsers);

  console.log(`\nMismatches found: ${mismatches.length}`);
  console.log("─".repeat(60));

  for (const m of mismatches) {
    switch (m.type) {
      case "MissingInEntra":
        console.log(
          `[MissingInEntra]  SAP userId=${m.sapUser?.userId}` +
            `  email=${m.sapUser?.email ?? "(none)"}`
        );
        break;
      case "MissingInSap":
        console.log(
          `[MissingInSap]    Entra upn=${m.entraUser?.userPrincipalName}` +
            `  mail=${m.entraUser?.mail ?? "(none)"}`
        );
        break;
      case "AttributeMismatch":
        console.log(
          `[AttributeMismatch] userId=${m.sapUser?.userId}  ${m.details}`
        );
        break;
    }
  }

  // Basic assertions to confirm expected mismatches with mock data
  const missing_in_entra = mismatches.filter((m) => m.type === "MissingInEntra");
  const missing_in_sap = mismatches.filter((m) => m.type === "MissingInSap");
  const attribute = mismatches.filter((m) => m.type === "AttributeMismatch");

  console.log("\nSummary:");
  console.log(`  MissingInEntra    : ${missing_in_entra.length}`);
  console.log(`  MissingInSap      : ${missing_in_sap.length}`);
  console.log(`  AttributeMismatch : ${attribute.length}`);

  // sap009 (iris.thomas) and sap010 (jack.martinez) have no matching Entra user
  const expectedMissingInEntra = ["sap009", "sap010"];
  for (const userId of expectedMissingInEntra) {
    const found = missing_in_entra.some((m) => m.sapUser?.userId === userId);
    if (!found) {
      throw new Error(`Expected MissingInEntra for SAP userId=${userId}`);
    }
  }

  // entra-009 and entra-010 have no matching SAP user
  const expectedMissingInSap = ["entra-009", "entra-010"];
  for (const entraId of expectedMissingInSap) {
    const found = missing_in_sap.some((m) => m.entraUser?.id === entraId);
    if (!found) {
      throw new Error(`Expected MissingInSap for Entra id=${entraId}`);
    }
  }

  // bob.smith: SAP dept=Finance, Entra dept=Accounting => AttributeMismatch
  const bobMismatch = attribute.find((m) => m.sapUser?.userId === "sap002");
  if (!bobMismatch) {
    throw new Error("Expected AttributeMismatch for bob.smith (sap002)");
  }

  // eve.miller: SAP dept=Engineering, Entra dept=Product => AttributeMismatch
  const eveMismatch = attribute.find((m) => m.sapUser?.userId === "sap005");
  if (!eveMismatch) {
    throw new Error("Expected AttributeMismatch for eve.miller (sap005)");
  }

  console.log("\n✅ All assertions passed.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
