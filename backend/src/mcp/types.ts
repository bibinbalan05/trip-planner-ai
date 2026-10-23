/** Minimal JSON Schema object describing a tool's arguments (the shape MCP and Gemini both use). */
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ToolExecutionContext {
  /** Aborted when the overall chat request times out or is cancelled. */
  signal?: AbortSignal;
}

export interface TravelToolResult {
  /** Text returned to the model so it can use the result in its answer. */
  content: string;
  /** True when the tool ran but reported a failure. */
  isError?: boolean;
}

/**
 * A capability the assistant could call in the future, such as searching destinations,
 * checking weather, or looking up hotels.
 *
 * A tool may be implemented locally or be a thin wrapper around a tool exposed by an
 * MCP server.
 */
export interface TravelTool<TArgs = Record<string, unknown>> {
  /** Unique name; lowercase letters, digits, and underscores (a valid function name for the model). */
  readonly name: string;
  /** Plain-language description the model uses to decide when to call the tool. */
  readonly description: string;
  readonly inputSchema: ToolInputSchema;
  execute(args: TArgs, context: ToolExecutionContext): Promise<TravelToolResult>;
}
