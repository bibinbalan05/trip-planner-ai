# MCP extension point

This folder prepares the backend for future [Model Context Protocol](https://modelcontextprotocol.io) tools.
**Nothing here calls an external service yet.** With no MCP server configured the app runs exactly as before.

## What exists

| File | Purpose |
| --- | --- |
| `types.ts` | `TravelTool` interface (name, description, JSON-schema input, `execute`) and result types |
| `registry.ts` | `ToolRegistry`: register, look up and list tools (starts empty) |
| `tools/travelSearch.placeholder.ts` | Example tool definition. It is **not registered** and throws if executed, so it can never return fake data |
| `index.ts` | `initializeMcp()`: today returns an empty registry |

## How the pieces connect

```
POST /api/chat → chat.controller → ChatService (interface)
                                      └── GeminiService   (today)
```

The controller depends only on the `ChatService` interface (`src/types/chat.ts`), and `GeminiService` has no
knowledge of tools. That separation is what lets tools be added without rewriting the controller.

## Where future work goes

1. **MCP client initialization**: in `initializeMcp()` (`index.ts`). Read server config, connect clients, list their tools,
   wrap each one as a `TravelTool`, register it. Failures should be logged per server, never fatal.
2. **Tool execution**: add a new class, for example `ToolAugmentedChatService implements ChatService`, that:
   - passes the registry's tool declarations to Gemini as function declarations,
   - when the model returns a function call, runs `registry.get(name)?.execute(args, { signal })`,
   - sends the real tool result back to the model and returns the final text.
3. **Wiring**: in `server.ts`, construct that service (wrapping or extending `GeminiService`) and pass it to `createApp`
   instead of the plain `GeminiService`. The controller, routes and schemas stay unchanged.

## Ground rules

- Only return results that a real tool produced. Never fabricate tool output.
- If a tool fails, tell the model the call failed (`isError: true`) so it can say so honestly to the user.
- Keep tool names to lowercase letters, digits and underscores.
