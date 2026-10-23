import type { TravelTool } from './types';

const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

/** Holds the tools that are currently available to the assistant. Starts empty. */
export class ToolRegistry {
  private readonly tools = new Map<string, TravelTool>();

  register(tool: TravelTool): void {
    if (!TOOL_NAME_PATTERN.test(tool.name)) {
      throw new Error(
        `Invalid tool name "${tool.name}". Use lowercase letters, digits and underscores, starting with a letter.`,
      );
    }
    if (this.tools.has(tool.name)) {
      throw new Error(`A tool named "${tool.name}" is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  get(name: string): TravelTool | undefined {
    return this.tools.get(name);
  }

  list(): readonly TravelTool[] {
    return [...this.tools.values()];
  }
}
