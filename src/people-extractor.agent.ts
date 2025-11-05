import "dotenv/config";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { models } from "./utils/models";
import isEmpty from "lodash/isEmpty";
import map from "lodash/map";
import { z } from "zod";

/**
 * People Extractor Agent
 *
 * This agent demonstrates a two-step workflow:
 * 1. Extract person names from text using an LLM with structured output
 * 2. Transform names into structured Person objects with IDs
 *
 * Key concepts:
 * - Custom state management with Annotation.Root()
 * - Structured LLM output using Zod schemas
 * - Sequential node execution
 */

// ============================================================================
// STATE DEFINITION
// ============================================================================

/**
 * Person entity with unique identifier
 */
type Person = {
  id: number;
  name: string;
};

/**
 * Graph state that flows through all nodes.
 * Each node can read from and update this state.
 */
const PeopleExtractorState = Annotation.Root({
  text: Annotation<string>,
  names: Annotation<string[]>,
  people: Annotation<Person[]>,
});

type State = typeof PeopleExtractorState.State;

// ============================================================================
// GRAPH NODES
// ============================================================================

/**
 * Extracts person names from text using an LLM with structured output.
 *
 * Uses Zod schema to enforce the LLM returns a properly formatted list of names.
 */
async function extractNames(state: State): Promise<Partial<State>> {
  console.log("→ Extracting names from text...");
  const { text } = state;

  const nameSchema = z.object({
    names: z
      .array(z.string())
      .describe("A list of person names extracted from the text."),
  });

  const llm = models.openai().withStructuredOutput(nameSchema);
  const result = await llm.invoke(
    `Please extract all person names from the following text: \n\n${text}`,
  );

  console.log(`  ✓ Found ${result.names.length} names:`, result.names);
  return { names: result.names };
}

/**
 * Transforms extracted names into structured Person objects with unique IDs.
 *
 * Simulates an async operation (e.g., database lookup or API call).
 */
async function mapToPeople(state: State): Promise<Partial<State>> {
  console.log("→ Mapping names to Person objects...");
  const { names } = state;

  if (isEmpty(names)) {
    console.log("  ⚠ No names to map");
    return { people: [] };
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  const people = map(names, (name, index) => ({
    id: index + 1,
    name,
  }));

  console.log(`  ✓ Created ${people.length} Person objects`);
  return { people };
}

// ============================================================================
// GRAPH DEFINITION
// ============================================================================

/**
 * Creates and executes the people extraction workflow.
 */
async function main() {
  console.log("=".repeat(60));
  console.log("People Extractor Agent");
  console.log("=".repeat(60));

  const graph = new StateGraph(PeopleExtractorState)
    .addNode("extract_names", extractNames)
    .addNode("map_to_people", mapToPeople)
    .addEdge(START, "extract_names")
    .addEdge("extract_names", "map_to_people")
    .addEdge("map_to_people", END)
    .compile();

  const input = {
    text: "The team includes Alice, Bob, and Dr. Eve. We also spoke to Carol.",
  };

  console.log("\nInput text:", input.text);
  console.log();

  const result = await graph.invoke(input);

  console.log("\n" + "=".repeat(60));
  console.log("Final Result");
  console.log("=".repeat(60));
  console.log("Names extracted:", result.names);
  console.log("People created:", result.people);
}

// ============================================================================
// EXECUTION
// ============================================================================

if (require.main === module) {
  main().catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
}
