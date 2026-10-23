import type { TravelTool } from '../types';

export class ToolNotImplementedError extends Error {
  constructor(toolName: string) {
    super(`Tool "${toolName}" is a placeholder and has no implementation yet.`);
    this.name = 'ToolNotImplementedError';
  }
}

interface TravelSearchArgs {
  destination: string;
  interests?: string[];
}

/**
 * EXAMPLE ONLY. Shows the shape of a future travel search tool.
 *
 * - It is NOT registered by default (see `initializeMcp` in ../index.ts).
 * - It does not call any real service and never returns fake results.
 *   If something registers and executes it, it throws ToolNotImplementedError.
 *
 * To make a real tool, copy this file, keep the same fields, and replace `execute`
 * with a call to your travel API or to an MCP server tool.
 */
export const travelSearchPlaceholderTool: TravelTool<TravelSearchArgs> = {
  name: 'search_destinations',
  description:
    'Searches for attractions and activities in a destination. (Placeholder: not implemented.)',
  inputSchema: {
    type: 'object',
    properties: {
      destination: { type: 'string', description: 'City or region to search, e.g. "Lisbon"' },
      interests: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional interests such as "food" or "museums"',
      },
    },
    required: ['destination'],
  },
  async execute() {
    throw new ToolNotImplementedError('search_destinations');
  },
};
