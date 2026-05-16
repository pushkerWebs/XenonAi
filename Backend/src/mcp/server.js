import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(process.env.XENON_WORKSPACE_ROOT || path.join(process.cwd(), ".."));
const server = new McpServer({
  name: "xenon-context-server",
  version: "1.0.0",
});

const ignoredFolders = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".next",
]);

const textFileExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".css",
  ".html",
  ".mjs",
  ".cjs",
  ".yml",
  ".yaml",
]);

function resolveWorkspacePath(targetPath = "") {
  const resolvedPath = path.resolve(workspaceRoot, targetPath);
  const relativePath = path.relative(workspaceRoot, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Path must stay inside the Xenon workspace: ${targetPath}`);
  }

  return resolvedPath;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readTextFileSnippet(targetPath, startLine = 1, endLine = 200) {
  const fileContent = await fs.readFile(targetPath, "utf8");
  const lines = fileContent.split(/\r?\n/);
  const safeStart = Math.max(1, startLine);
  const safeEnd = Math.min(lines.length, Math.max(safeStart, endLine));
  const snippet = lines.slice(safeStart - 1, safeEnd);

  return {
    path: path.relative(workspaceRoot, targetPath),
    startLine: safeStart,
    endLine: safeEnd,
    totalLines: lines.length,
    content: snippet.join("\n"),
  };
}

async function walkWorkspace(currentDir, matches, queryLower) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoredFolders.has(entry.name)) {
        continue;
      }

      await walkWorkspace(path.join(currentDir, entry.name), matches, queryLower);
      continue;
    }

    const filePath = path.join(currentDir, entry.name);
    const extension = path.extname(entry.name).toLowerCase();

    if (!textFileExtensions.has(extension)) {
      continue;
    }

    try {
      const content = await fs.readFile(filePath, "utf8");
      if (!content.toLowerCase().includes(queryLower)) {
        continue;
      }

      const lines = content.split(/\r?\n/);
      const hitLineIndex = lines.findIndex((line) => line.toLowerCase().includes(queryLower));
      const startLine = Math.max(1, hitLineIndex + 1 - 2);
      const endLine = Math.min(lines.length, hitLineIndex + 1 + 2);

      matches.push({
        path: path.relative(workspaceRoot, filePath),
        line: hitLineIndex + 1,
        snippet: lines.slice(startLine - 1, endLine).join("\n"),
      });
    } catch {
      // Skip unreadable files.
    }
  }
}

server.registerTool(
  "workspace_overview",
  {
    title: "Workspace overview",
    description: "Summarize the Xenon workspace structure and the most relevant auth/chat files.",
    inputSchema: z.object({
      includeFiles: z.boolean().optional().default(true),
    }),
  },
  async ({ includeFiles = true }) => {
    const overview = {
      workspaceRoot: path.relative(process.cwd(), workspaceRoot) || ".",
      keyAreas: ["Backend/src/controllers", "Backend/src/services", "Backend/src/routes", "Frontend/src/features/auth", "Frontend/src/features/chat"],
      files: [],
    };

    if (includeFiles) {
      const summaryTargets = ["Backend/src", "Frontend/src"];
      for (const target of summaryTargets) {
        const absoluteTarget = resolveWorkspacePath(target);
        if (!(await pathExists(absoluteTarget))) {
          continue;
        }

        const entries = await fs.readdir(absoluteTarget, { withFileTypes: true });
        overview.files.push({
          directory: target,
          entries: entries.slice(0, 30).map((entry) => `${entry.name}${entry.isDirectory() ? "/" : ""}`),
        });
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(overview, null, 2),
        },
      ],
    };
  }
);

server.registerTool(
  "workspace_search",
  {
    title: "Workspace search",
    description: "Search the Xenon workspace for code or documentation matches and return short snippets.",
    inputSchema: z.object({
      query: z.string().min(1),
    }),
  },
  async ({ query }) => {
    const normalizedQuery = String(query || "").trim();

    if (!normalizedQuery) {
      throw new Error("query is required");
    }

    const matches = [];
    await walkWorkspace(workspaceRoot, matches, normalizedQuery.toLowerCase());

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ query: normalizedQuery, matches: matches.slice(0, 25) }, null, 2),
        },
      ],
    };
  }
);

server.registerTool(
  "workspace_read_file",
  {
    title: "Workspace read file",
    description: "Read a text file from the Xenon workspace with line bounds.",
    inputSchema: z.object({
      path: z.string().min(1),
      startLine: z.number().int().positive().optional().default(1),
      endLine: z.number().int().positive().optional().default(200),
    }),
  },
  async ({ path: targetPath, startLine = 1, endLine = 200 }) => {
    const absolutePath = resolveWorkspacePath(targetPath);
    if (!(await pathExists(absolutePath))) {
      throw new Error(`File not found: ${targetPath}`);
    }

    const snippet = await readTextFileSnippet(absolutePath, startLine, endLine);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(snippet, null, 2),
        },
      ],
    };
  }
);

const isDirectExecution = fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectExecution) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export default server;
