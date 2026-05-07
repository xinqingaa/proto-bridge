import type { JsonObject, ToolContext } from '../types.js';
import { callTool, toolsList } from '../tools/registry.js';
import { readResource, resourcesList } from '../resources/index.js';
import { getPrompt, promptsList } from '../prompts/index.js';

export async function dispatch(context: ToolContext, method: string, params: JsonObject | undefined): Promise<JsonObject> {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: '2025-06-18',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        serverInfo: {
          name: 'proto-bridge',
          version: '0.2.1',
        },
      };
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return {};
    case 'tools/list':
      return { tools: toolsList() };
    case 'tools/call':
      return callTool(context, params);
    case 'resources/list':
      return { resources: resourcesList(context) };
    case 'resources/read':
      return readResource(context, params);
    case 'prompts/list':
      return { prompts: promptsList() };
    case 'prompts/get':
      return getPrompt(params);
    default:
      throw new Error(`Unsupported MCP method: ${method}`);
  }
}
