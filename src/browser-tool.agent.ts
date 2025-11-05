import "dotenv/config";
import { TavilySearch } from "@langchain/tavily";
import { AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  StateGraph,
  MessagesAnnotation,
  START,
  END,
} from "@langchain/langgraph";
import { models } from "./utils/models";

/**
 * Web Search Agent
 *
 * This agent demonstrates tool-calling with conditional routing:
 * 1. Agent receives a user query
 * 2. Agent decides whether to use the Tavily search tool
 * 3. If tool is called, results are returned to the agent
 * 4. Agent formulates a final response
 *
 * Key concepts:
 * - MessagesAnnotation for conversation state
 * - Tool binding with .bindTools()
 * - Conditional edges for dynamic routing
 * - ToolNode for automatic tool execution
 *
 * Reference: https://langchain-ai.github.io/langgraphjs/tutorials/quickstart
 */

// ============================================================================
// TOOLS SETUP
// ============================================================================

const searchTool = new TavilySearch({ maxResults: 3 });
const tools = [searchTool];
const toolNode = new ToolNode(tools);

// ============================================================================
// MODEL SETUP
// ============================================================================

const llm = models.openai().bindTools(tools);

// ============================================================================
// GRAPH NODES
// ============================================================================

/**
 * Invokes the LLM to process messages and optionally call tools.
 */
async function callAgent(state: typeof MessagesAnnotation.State) {
  const response = await llm.invoke(state.messages);
  return { messages: [response] };
}

// ============================================================================
// ROUTING LOGIC
// ============================================================================

/**
 * Determines the next node based on whether the agent made tool calls.
 *
 * @returns "tools" if the agent wants to use a tool, END otherwise
 */
function routeAfterAgent({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  return END;
}

// ============================================================================
// GRAPH DEFINITION
// ============================================================================

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callAgent)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", routeAfterAgent)
  .compile();

// ============================================================================
// EXECUTION
// ============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("Web Search Agent");
  console.log("=".repeat(60));

  console.log("\n→ Query 1: What is the weather in SF?");
  const state1 = await graph.invoke({
    messages: [{ role: "user", content: "what is the weather in sf" }],
  });
  const response1 = state1.messages[state1.messages.length - 1].content;
  console.log("  ✓ Response:", response1);

  console.log("\n→ Query 2: What about NY? (with context)");
  const state2 = await graph.invoke({
    messages: [
      ...state1.messages,
      { role: "user", content: "what about ny" },
    ],
  });
  const response2 = state2.messages[state2.messages.length - 1].content;
  console.log("  ✓ Response:", response2);

  console.log("\n" + "=".repeat(60));
}

if (require.main === module) {
  main().catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
}
