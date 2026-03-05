import { SapUser } from "./sapClient";
import { EntraUser } from "./entraClient";

export interface SyncMismatch {
  type: "MissingInEntra" | "MissingInSap" | "AttributeMismatch";
  sapUser?: SapUser;
  entraUser?: EntraUser;
  details?: string;
}

/**
 * Compares SAP and Entra ID user lists and returns a list of mismatches.
 *
 * Matching strategy (in priority order):
 *  1. Normalised e-mail address (lowercase) – used when both sides have an e-mail.
 *  2. SAP userId matched against Entra userPrincipalName (case-insensitive)
 *     – used as a fallback when the SAP user has no e-mail.
 *
 * Mismatch types:
 *  - MissingInEntra  : SAP user exists but no matching Entra user found.
 *  - MissingInSap    : Entra user exists but no matching SAP user found.
 *  - AttributeMismatch : Both users found but their department values differ
 *                        (only reported when both department values are non-empty).
 */
export function computeMismatches(
  sapUsers: SapUser[],
  entraUsers: EntraUser[]
): SyncMismatch[] {
  const mismatches: SyncMismatch[] = [];

  // Build lookup maps for Entra users
  // Key: normalised e-mail address
  const entraByEmail = new Map<string, EntraUser>();
  // Key: normalised userPrincipalName
  const entraByUpn = new Map<string, EntraUser>();

  for (const eu of entraUsers) {
    if (eu.mail) {
      entraByEmail.set(eu.mail.toLowerCase(), eu);
    }
    entraByUpn.set(eu.userPrincipalName.toLowerCase(), eu);
  }

  // Track which Entra users have been matched so we can find MissingInSap later
  const matchedEntraIds = new Set<string>();

  for (const su of sapUsers) {
    let matched: EntraUser | undefined;

    if (su.email) {
      matched = entraByEmail.get(su.email.toLowerCase());
    }

    // Fallback: match SAP userId to Entra userPrincipalName
    if (!matched) {
      matched = entraByUpn.get(su.userId.toLowerCase());
    }

    if (!matched) {
      mismatches.push({ type: "MissingInEntra", sapUser: su });
      continue;
    }

    matchedEntraIds.add(matched.id);

    // Check for attribute mismatches
    const sapDept = su.department?.trim() ?? "";
    const entraDept = matched.department?.trim() ?? "";

    if (sapDept && entraDept && sapDept.toLowerCase() !== entraDept.toLowerCase()) {
      mismatches.push({
        type: "AttributeMismatch",
        sapUser: su,
        entraUser: matched,
        details: `department: SAP="${sapDept}" vs Entra="${entraDept}"`,
      });
    }
  }

  // Find Entra users that had no SAP counterpart
  for (const eu of entraUsers) {
    if (!matchedEntraIds.has(eu.id)) {
      mismatches.push({ type: "MissingInSap", entraUser: eu });
    }
  }

  return mismatches;
}
