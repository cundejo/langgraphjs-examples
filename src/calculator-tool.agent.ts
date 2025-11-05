import "dotenv/config";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { models } from "./utils/models";
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";

/**
 * Calculator Agent
 *
 * This agent demonstrates custom tool creation and usage:
 * 1. Agent receives a math problem
 * 2. Agent breaks it down and calls calculator tools (add/subtract)
 * 3. Agent synthesizes the final answer
 *
 * Key concepts:
 * - Custom tool definition with Zod schemas
 * - Tool binding and automatic execution
 * - Multi-step reasoning with tools
 *
 * Reference: https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling
 */

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Adds two numbers together.
 */
const addTool = tool(
  ({ a, b }: { a: number; b: number }) => a + b,
  {
    name: "add",
    description: "Add two numbers together",
    schema: z.object({
      a: z.number().describe("The first number"),
      b: z.number().describe("The second number"),
    }),
  },
);

/**
 * Subtracts the second number from the first.
 */
const subtractTool = tool(
  ({ a, b }: { a: number; b: number }) => a - b,
  {
    name: "subtract",
    description: "Subtract the second number from the first",
    schema: z.object({
      a: z.number().describe("The first number"),
      b: z.number().describe("The second number"),
    }),
  },
);

// ============================================================================
// TOOLS SETUP
// ============================================================================

const tools = [addTool, subtractTool];
const toolNode = new ToolNode(tools);

// ============================================================================
// MODEL SETUP
// ============================================================================

const llm = models.openai().bindTools(tools);

// ============================================================================
// GRAPH NODES
// ============================================================================

/**
 * Invokes the LLM to process messages and optionally call calculator tools.
 */
async function callAgent(state: typeof MessagesAnnotation.State) {
  const response = await llm.invoke(state.messages);
  return { messages: response };
}

// ============================================================================
// ROUTING LOGIC
// ============================================================================

/**
 * Determines whether to continue to tools or end the conversation.
 */
function routeAfterAgent(state: typeof MessagesAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1];

  if (
    "tool_calls" in lastMessage &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls?.length
  ) {
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
  .addConditionalEdges("agent", routeAfterAgent)
  .addEdge("tools", "agent")
  .compile();

// ============================================================================
// EXECUTION
// ============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("Calculator Agent");
  console.log("=".repeat(60));

  const problem =
    "If I have 7 apples and I give 3 to my friend, and then I buy 5 more, how many apples do I have?";

  console.log("\n→ Problem:", problem);

  const result = await graph.invoke({
    messages: [
      {
        role: "system",
        content:
          "Use the calculator tools to solve the problem. Return only the final number as your answer.",
      },
      { role: "user", content: problem },
    ],
  });

  const answer = result.messages[result.messages.length - 1].content;
  console.log("  ✓ Answer:", answer);

  console.log("\n" + "=".repeat(60));
}

if (require.main === module) {
  main().catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
}
