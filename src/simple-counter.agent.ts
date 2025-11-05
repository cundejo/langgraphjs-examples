import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

/**
 * Countdown Agent
 *
 * This agent demonstrates conditional routing and state management:
 * - Numbers > 10: subtract 5 (fast countdown)
 * - Numbers 1-10: subtract 1 (slow countdown)
 * - Numbers <= 0: end
 *
 * Key concepts:
 * - Custom state with Annotation.Root()
 * - Conditional edges with multiple possible routes
 * - State history tracking
 * - Dynamic routing based on state values
 *
 * Reference: https://langchain-ai.github.io/langgraphjs/concepts/low_level/#reducers
 */

// ============================================================================
// STATE DEFINITION
// ============================================================================

/**
 * Graph state tracking the current number and countdown history.
 */
const CountdownState = Annotation.Root({
  number: Annotation<number>,
  history: Annotation<number[]>,
});

type State = typeof CountdownState.State;

// ============================================================================
// GRAPH NODES
// ============================================================================

/**
 * Subtracts 5 from the current number (fast countdown).
 */
async function subtractFive(state: State): Promise<Partial<State>> {
  const newNumber = state.number - 5;
  console.log(`  ${state.number} - 5 = ${newNumber}`);
  return {
    number: newNumber,
    history: [...state.history, newNumber],
  };
}

/**
 * Subtracts 1 from the current number (slow countdown).
 */
async function subtractOne(state: State): Promise<Partial<State>> {
  const newNumber = state.number - 1;
  console.log(`  ${state.number} - 1 = ${newNumber}`);
  return {
    number: newNumber,
    history: [...state.history, newNumber],
  };
}

// ============================================================================
// ROUTING LOGIC
// ============================================================================

/**
 * Routes to the appropriate countdown node based on the current number.
 *
 * @returns "subtract_five" for numbers > 10, "subtract_one" for 1-10, END for <= 0
 */
function routeCountdown(state: State) {
  if (state.number > 10) return "subtract_five";
  if (state.number > 0) return "subtract_one";
  return END;
}

// ============================================================================
// GRAPH DEFINITION
// ============================================================================

const graph = new StateGraph(CountdownState)
  .addNode("subtract_five", subtractFive)
  .addNode("subtract_one", subtractOne)
  .addConditionalEdges(START, routeCountdown, [
    "subtract_five",
    "subtract_one",
    END,
  ])
  .addConditionalEdges("subtract_five", routeCountdown, [
    "subtract_five",
    "subtract_one",
    END,
  ])
  .addConditionalEdges("subtract_one", routeCountdown, [
    "subtract_five",
    "subtract_one",
    END,
  ])
  .compile();

// ============================================================================
// EXECUTION
// ============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("Countdown Agent");
  console.log("=".repeat(60));

  const startNumber = 57;
  console.log(`\n→ Starting countdown from ${startNumber}:\n`);

  const result = await graph.invoke({
    number: startNumber,
    history: [],
  });

  console.log("\n" + "=".repeat(60));
  console.log("Final Result");
  console.log("=".repeat(60));
  console.log("Final number:", result.number);
  console.log("History:", result.history);
  console.log("Steps taken:", result.history.length);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
}
