import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

/**
 * Countdown to zero
 * A simple example to show how to use the state, and conditional edge.
 * We pass a number:
 * - If number > 10: subtract 5
 * - If number <= 10: subtract 1
 * - End when number <= 0
 *
 * Doc: https://langchain-ai.github.io/langgraphjs/concepts/low_level/#reducers
 */

// Define a simple counter state
const CounterStateAnnotation = Annotation.Root({
  number: Annotation<number>,
  history: Annotation<number[]>,
});

const subtract5 = async ({
  number,
  history,
}: typeof CounterStateAnnotation.State) => {
  const newNumber = number - 5;
  return {
    number: newNumber,
    history: [...history, newNumber],
  };
};

const subtract1 = async ({
  number,
  history,
}: typeof CounterStateAnnotation.State) => {
  const newNumber = number - 1;
  return {
    number: newNumber,
    history: [...history, newNumber],
  };
};

const routingFunction = (state: typeof CounterStateAnnotation.State) => {
  const { number } = state;
  if (number > 10) return "subtract5";
  if (number <= 10 && number > 0) return "subtract1";
  return END;
};

// Create the workflow
const workflow = new StateGraph(CounterStateAnnotation)
  .addNode("subtract5", subtract5)
  .addNode("subtract1", subtract1)
  .addConditionalEdges(START, routingFunction, ["subtract5", "subtract1", END])
  .addConditionalEdges("subtract5", routingFunction, [
    "subtract5",
    "subtract1",
    END,
  ])
  .addConditionalEdges("subtract1", routingFunction, [
    "subtract5",
    "subtract1",
    END,
  ]);

const app = workflow.compile();

const main = async () => {
  const finalState = await app.invoke({
    number: 57,
    history: [],
  });
  console.log(finalState);
};

// Only run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
