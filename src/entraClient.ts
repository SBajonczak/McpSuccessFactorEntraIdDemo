import mockData from "./mockEntraUsers.json";

export interface EntraUser {
  id: string;
  userPrincipalName: string;
  mail: string | null;
  displayName: string | null;
  department: string | null;
}

/**
 * Returns a list of Microsoft Entra ID (Azure AD) users.
 *
 * In this demo the data is loaded from a local JSON file so that the project
 * can run without access to a real Entra ID tenant.  In production you would
 * replace this implementation with a Microsoft Graph API call (e.g. using
 * @azure/msal-node + axios, or the @microsoft/microsoft-graph-client SDK)
 * authenticated with the credentials from config.ts.
 */
export async function listEntraUsers(limit = 500): Promise<EntraUser[]> {
  const users = mockData as EntraUser[];
  return users.slice(0, limit);
}
