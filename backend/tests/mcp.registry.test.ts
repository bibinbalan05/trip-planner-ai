import { describe, expect, it } from 'vitest';
import { initializeMcp, ToolRegistry, travelSearchPlaceholderTool } from '../src/mcp';
import { ToolNotImplementedError } from '../src/mcp/tools/travelSearch.placeholder';

describe('MCP extension point', () => {
  it('starts with no tools, so the app runs without any MCP server', async () => {
    const registry = await initializeMcp();

    expect(registry.list()).toHaveLength(0);
  });

  it('registers, looks up and removes tools', () => {
    const registry = new ToolRegistry();

    registry.register(travelSearchPlaceholderTool);

    expect(registry.has('search_destinations')).toBe(true);
    expect(registry.get('search_destinations')).toBe(travelSearchPlaceholderTool);
    expect(registry.unregister('search_destinations')).toBe(true);
    expect(registry.list()).toHaveLength(0);
  });

  it('rejects duplicate and invalid tool names', () => {
    const registry = new ToolRegistry();
    registry.register(travelSearchPlaceholderTool);

    expect(() => registry.register(travelSearchPlaceholderTool)).toThrow(/already registered/);
    expect(() => registry.register({ ...travelSearchPlaceholderTool, name: 'Bad Name' })).toThrow(
      /Invalid tool name/,
    );
  });

  it('placeholder tool refuses to run instead of returning fake data', async () => {
    await expect(
      travelSearchPlaceholderTool.execute({ destination: 'Lisbon' }, {}),
    ).rejects.toBeInstanceOf(ToolNotImplementedError);
  });
});
