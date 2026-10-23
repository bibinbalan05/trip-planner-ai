import { ToolRegistry } from './registry';

export { ToolRegistry } from './registry';
export type {
  ToolExecutionContext,
  ToolInputSchema,
  TravelTool,
  TravelToolResult,
} from './types';
export { travelSearchPlaceholderTool } from './tools/travelSearch.placeholder';

/**
 * Entry point for future Model Context Protocol support.
 *
 * TODAY: returns an empty registry, so the app runs normally with no MCP server configured.
 *
 * LATER, this is where you would:
 *   1. Read MCP server settings from config (for example a list of server commands or URLs).
 *   2. Create an MCP client per server (with the official `@modelcontextprotocol/sdk`),
 *      connect, and list the tools each server exposes.
 *   3. Wrap each remote tool as a `TravelTool` and `registry.register(...)` it.
 *   4. Handle connection failures per server by logging and continuing, so one broken
 *      server never stops the app from starting.
 *
 * Tool EXECUTION belongs in a tool-aware ChatService (see ./README.md), not in this
 * function and not in the chat controller.
 */
export async function initializeMcp(): Promise<ToolRegistry> {
  return new ToolRegistry();
}
