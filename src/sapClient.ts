import mockData from "./mockSapUsers.json";

export interface SapUser {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  department: string | null;
}

/**
 * Returns a list of SAP SuccessFactors users.
 *
 * In this demo the data is loaded from a local JSON file so that the project
 * can run without access to a real SAP system.  In production you would
 * replace this implementation with an actual OData / REST call to the
 * SuccessFactors API using the credentials from config.ts.
 */
export async function listSapUsers(limit = 500): Promise<SapUser[]> {
  const users = mockData as SapUser[];
  return users.slice(0, limit);
}
