import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

import { config } from "./config";
import { listSapUsers } from "./sapClient";
import { listEntraUsers } from "./entraClient";
import { computeMismatches } from "./mismatches";

// ---------------------------------------------------------------------------
// MCP Server definition
// ---------------------------------------------------------------------------

function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: "mcp-successfactor-entraid-demo",
    version: "1.0.0",
  });

  /**
   * sap_list_users
   * Lists SAP SuccessFactors users (backed by mock data in this demo).
   */
  server.tool(
    "sap_list_users",
    "List users from SAP SuccessFactors",
    { limit: z.number().int().positive().optional().default(500) },
    async ({ limit }) => {
      const users = await listSapUsers(limit);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ users }, null, 2),
          },
        ],
      };
    }
  );

  /**
   * entra_list_users
   * Lists Microsoft Entra ID users (backed by mock data in this demo).
   */
  server.tool(
    "entra_list_users",
    "List users from Microsoft Entra ID (Azure AD)",
    { limit: z.number().int().positive().optional().default(500) },
    async ({ limit }) => {
      const users = await listEntraUsers(limit);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ users }, null, 2),
          },
        ],
      };
    }
  );

  /**
   * report_mismatches
   * Compares SAP and Entra ID user lists and returns sync mismatches.
   */
  server.tool(
    "report_mismatches",
    "Compare SAP SuccessFactors and Entra ID users and report mismatches",
    {
      limitSap: z.number().int().positive().optional().default(500),
      limitEntra: z.number().int().positive().optional().default(500),
    },
    async ({ limitSap, limitEntra }) => {
      const [sapUsers, entraUsers] = await Promise.all([
        listSapUsers(limitSap),
        listEntraUsers(limitEntra),
      ]);
      const mismatches = computeMismatches(sapUsers, entraUsers);
      const result = {
        totalSap: sapUsers.length,
        totalEntra: entraUsers.length,
        mismatchCount: mismatches.length,
        mismatches,
      };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

// ---------------------------------------------------------------------------
// Express HTTP server using MCP SSE transport
// ---------------------------------------------------------------------------
// The MCP protocol is exposed via two endpoints:
//   GET  /sse       – server-sent events stream (client connects here first)
//   POST /messages  – client sends JSON-RPC messages here
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

// Map of sessionId -> SSEServerTransport (supports multiple concurrent clients)
const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (req: Request, res: Response) => {
  const transport = new SSEServerTransport("/messages", res);
  const mcpServer = buildMcpServer();
  transports.set(transport.sessionId, transport);

  res.on("close", () => {
    transports.delete(transport.sessionId);
  });

  await mcpServer.connect(transport);
});

app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query["sessionId"] as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: "Missing sessionId query parameter" });
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: `Unknown sessionId: ${sessionId}` });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// Simple health-check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", server: "mcp-successfactor-entraid-demo" });
});

const { port } = config;
app.listen(port, () => {
  console.log(`MCP server listening on http://localhost:${port}`);
  console.log(`  SSE endpoint : GET  http://localhost:${port}/sse`);
  console.log(`  Messages     : POST http://localhost:${port}/messages?sessionId=<id>`);
  console.log(`  Health check : GET  http://localhost:${port}/health`);
});
