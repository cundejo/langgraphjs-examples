import "dotenv/config";
import { END, START, StateGraph } from "@langchain/langgraph";
import { models } from "./utils/models";
import isEmpty from "lodash/isEmpty";
import map from "lodash/map";
import { z } from "zod";

/**
 * Given a text, it will:
 * - Extract all the people names
 * - Map the people names to a Person object with their name and dummy id.
 * - Return the list of people
 */

// --- 1. DEFINE THE STATE ---

/**
 * This interface defines the "state" of our graph.
 * It's the data that gets passed between nodes.
 * Each node will read from this state and can write back to it
 * by returning a "partial" state object.
 */
interface AppState {
  text: string;
  names?: string[];
  people?: Person[];
}

type Person = {
  id: number;
  name: string;
};

// --- 2. DEFINE THE GRAPH NODES ---

/**
 * A node is just an async function that receives the current state
 * and returns a partial state to be merged.
 */

/**
 * Node 1: Extracts names from the text using an LLM.
 */
async function extractNames(state: AppState): Promise<Partial<AppState>> {
  console.log("--- Executing Node 1: extractNames ---");
  const { text } = state;

  // We use Zod to define the *exact* output structure we want from the LLM.
  const nameSchema = z.object({
    names: z
      .array(z.string())
      .describe("A list of person names extracted from the text."),
  });

  // Initialize the LLM
  // .withStructuredOutput() magically forces the LLM to return valid JSON
  // that matches our Zod schema.
  const structuredLLM = models.openai().withStructuredOutput(nameSchema);

  // Invoke the LLM with the input text
  const result = await structuredLLM.invoke(
    `Please extract all person names from the following text: \n\n${text}`,
  );

  console.log("LLM extracted names:", result.names);

  // Return the partial state to be merged back into the main state.
  return { names: result.names };
}

/**
 * Node 2: Maps the list of names to a list of Person objects.
 * This is an async function just to show it's possible.
 */
async function namesToPeople(state: AppState): Promise<Partial<AppState>> {
  console.log("--- Executing Node 2: namesToPeople ---");
  const { names } = state; // Read the 'names' from the state

  if (isEmpty(names)) {
    console.log("No names found to map.");
    return { people: [] };
  }

  // Simulate an async operation (like a database lookup or API call)
  await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay

  const people = map(names, (name, i) => ({ id: i + 1, name }));

  console.log("Mapped objects:", people);

  // Return the new data to be merged into the state.
  return { people };
}

// --- 3. DEFINE THE GRAPH WORKFLOW ---

async function main() {
  // The StateGraph is our main workflow class.
  const workflow = new StateGraph<AppState>();

  // Add Nodes to the Graph
  workflow.addNode("extractor", extractNames);
  workflow.addNode("mapper", namesToPeople);

  // Define the Edges (the flow)
  workflow.addEdge(START, "extractor");
  workflow.addEdge("extractor", "mapper");
  workflow.addEdge("mapper", END);

  // Compile the Graph
  const app = workflow.compile();

  // Run the Graph!
  console.log("--- Invoking Graph ---");
  const input = {
    text: "The team includes Alice, Bob, and Dr. Eve. We also spoke to Carol.",
  };

  const result = await app.invoke(input);

  console.log("\n--- Final Graph State ---");
  console.log(result);

  /*
  Expected Output:
  {
    text: 'The team includes Alice, Bob, and Dr. Eve. We also spoke to Carol.',
    names: [ 'Alice', 'Bob', 'Eve', 'Carol' ],
    mappedPeople: [
      { id: 1, person: 'Alice' },
      { id: 2, person: 'Bob' },
      { id: 3, person: 'Eve' },
      { id: 4, person: 'Carol' }
    ]
  }
  */
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
