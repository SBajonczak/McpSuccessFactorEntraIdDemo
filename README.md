# MCP SuccessFactors / Entra ID Demo

A demo **Node.js / TypeScript** project that implements an [MCP](https://modelcontextprotocol.io/) server exposing three tools to compare SAP SuccessFactors and Microsoft Entra ID (Azure AD) users and surface sync mismatches.

> **Note:** All data is loaded from local mock JSON files so the project runs entirely offline without any real SAP or Entra ID credentials.

---

## What it does

| Tool | Description |
|------|-------------|
| `sap_list_users` | Returns users loaded from `src/mockSapUsers.json` (simulating a SuccessFactors OData query). |
| `entra_list_users` | Returns users loaded from `src/mockEntraUsers.json` (simulating a Microsoft Graph `/users` call). |
| `report_mismatches` | Compares both lists and returns `MissingInEntra`, `MissingInSap`, and `AttributeMismatch` entries. |

---

## Project structure

```
.
├── src/
│   ├── config.ts           # Env-var loading (dotenv) + defaults
│   ├── sapClient.ts        # SapUser type + listSapUsers()
│   ├── entraClient.ts      # EntraUser type + listEntraUsers()
│   ├── mismatches.ts       # computeMismatches() logic
│   ├── mcpServer.ts        # Express + MCP SSE server (port 3000)
│   ├── mismatches.test.ts  # Inline test / demo script
│   ├── mockSapUsers.json   # 10 sample SAP users
│   └── mockEntraUsers.json # 10 sample Entra users (overlapping + extras)
├── .env.sample             # Environment variable template
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment (optional for the demo)

```bash
cp .env.sample .env
# Edit .env – all fields have sensible defaults for the demo
```

### 3. Start the server

```bash
# Development (ts-node, no compilation step)
npm run dev

# Production (compile first)
npm run build
npm start
```

The server starts on **http://localhost:3000** (override with `PORT=` env var).

---

## Using the MCP tools

The server implements the [Model Context Protocol](https://modelcontextprotocol.io/) over HTTP using **Server-Sent Events (SSE)**:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sse` | `GET` | Open the SSE stream; server returns a `sessionId`. |
| `/messages?sessionId=<id>` | `POST` | Send JSON-RPC 2.0 MCP requests. |
| `/health` | `GET` | Simple health-check. |

### Quick test with curl

**Step 1 – open the SSE stream** (keep this running in one terminal)

```bash
curl -N http://localhost:3000/sse
# The server responds with a line like:
# data: {"type":"endpoint","endpoint":"/messages?sessionId=abc123"}
```

**Step 2 – call a tool** (in another terminal, replace `<SESSION_ID>`)

```bash
SESSION_ID=<SESSION_ID>

# List SAP users
curl -s -X POST "http://localhost:3000/messages?sessionId=${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "sap_list_users",
      "arguments": { "limit": 5 }
    }
  }'

# Report mismatches
curl -s -X POST "http://localhost:3000/messages?sessionId=${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "report_mismatches",
      "arguments": {}
    }
  }'
```

### Run the mismatch test script

```bash
npm run test:mismatches
```

Expected output (with the included mock data):

```
SAP users   : 10
Entra users : 10

Mismatches found: 6
────────────────────────────────────────────────────────────
[AttributeMismatch] userId=sap002  department: SAP="Finance" vs Entra="Accounting"
[AttributeMismatch] userId=sap005  department: SAP="Engineering" vs Entra="Product"
[MissingInEntra]  SAP userId=sap009  email=iris.thomas@example.com
[MissingInEntra]  SAP userId=sap010  email=jack.martinez@example.com
[MissingInSap]    Entra upn=newuser.entra@example.com  mail=newuser.entra@example.com
[MissingInSap]    Entra upn=another.entraonly@example.com  mail=another.entraonly@example.com

✅ All assertions passed.
```

---

## Plugging in real clients

### Real SAP SuccessFactors client (`src/sapClient.ts`)

Replace the mock import with an HTTP call to the SuccessFactors OData API:

```typescript
import axios from "axios";
import { config } from "./config";

export async function listSapUsers(limit = 500): Promise<SapUser[]> {
  const token = await getOAuthToken();           // implement token fetch
  const { data } = await axios.get(
    `${config.sap.baseUrl}/odata/v2/User?$top=${limit}&$format=json`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data.d.results.map(mapToSapUser);       // map OData fields
}
```

### Real Microsoft Entra ID client (`src/entraClient.ts`)

Replace the mock import with a Microsoft Graph call:

```typescript
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import { config } from "./config";

export async function listEntraUsers(limit = 500): Promise<EntraUser[]> {
  const credential = new ClientSecretCredential(
    config.entra.tenantId,
    config.entra.clientId,
    config.entra.clientSecret
  );
  // ... create Graph client and call /users
}
```

All credentials are already wired through `config.ts` / `.env`.

---

## License

MIT
