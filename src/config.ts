import dotenv from "dotenv";
import path from "path";

// Load .env file if present (falls back gracefully when not found)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function env(key: string, defaultValue = ""): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  // SAP SuccessFactors – in a real project these would point at the OData API
  sap: {
    baseUrl: env("SAP_BASE_URL", "https://api.successfactors.com"),
    clientId: env("SAP_CLIENT_ID"),
    clientSecret: env("SAP_CLIENT_SECRET"),
    companyId: env("SAP_COMPANY_ID"),
  },

  // Microsoft Entra ID – in a real project these would drive MSAL / Graph SDK
  entra: {
    tenantId: env("ENTRA_TENANT_ID"),
    clientId: env("ENTRA_CLIENT_ID"),
    clientSecret: env("ENTRA_CLIENT_SECRET"),
  },

  // HTTP server
  port: parseInt(env("PORT", "3000"), 10),
};
