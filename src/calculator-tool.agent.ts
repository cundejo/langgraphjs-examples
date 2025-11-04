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
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Calculator tools
 * Doc: https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling
 */

type AddArgs = {
  number1: number;
  number2: number;
};

const add = tool(
  ({ number1, number2 }: AddArgs) => {
    return number1 + number2;
  },
  {
    name: "add",
    description: "Add two numbers",
    schema: z.object({
      number1: z.number().describe("The first number"),
      number2: z.number().describe("The second number"),
    }),
  },
);

type SubtractArgs = {
  number1: number;
  number2: number;
};

const subtract = tool(
  ({ number1, number2 }: SubtractArgs) => {
    return number1 - number2;
  },
  {
    name: "subtract",
    description: "Subtract two numbers",
    schema: z.object({
      number1: z.number().describe("The first number"),
      number2: z.number().describe("The second number"),
    }),
  },
);

// Define the tools for the agent to use in a node
const tools = [add, subtract];
const toolNode = new ToolNode(tools);

// Example manually calling the ToolNode
// const messageWithSingleToolCall = new AIMessage({
//   content: "",
//   tool_calls: [
//     {
//       name: "add",
//       args: { number1: 1, number2: 3 },
//       id: "tool_call_id_1",
//       type: "tool_call",
//     },
//     {
//       name: "subtract",
//       args: { number1: 1, number2: 3 },
//       id: "tool_call_id_2",
//       type: "tool_call",
//     },
//   ],
// });

const model = models.openai().bindTools(tools);

const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  if (
    "tool_calls" in lastMessage &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls?.length
  )
    return "tools";

  return END;
};

const callModel = async (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const response = await model.invoke(messages);
  return { messages: response };
};

const workflow = new StateGraph(MessagesAnnotation)
  // Define the two nodes we will cycle between
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

const app = workflow.compile();

const main = async () => {
  const finalState = await app.invoke({
    messages: [
      new SystemMessage(
        "Use the tools to calculate and answer only the result number, nothing more.",
      ),
      new HumanMessage(
        "If I have 7 apples and I give 3 to my friend, and then I buy 5 more, how many apples do I have?",
      ),
    ],
  });

  const { messages } = finalState;
  const lastMessage = messages[messages.length - 1];
  console.log(lastMessage.content);
};

// Only run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
