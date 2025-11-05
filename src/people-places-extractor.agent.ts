import "dotenv/config";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { models } from "./utils/models";
import isEmpty from "lodash/isEmpty";
import map from "lodash/map";
import { z } from "zod";

/**
 * People and Places Extractor Agent
 *
 * This agent demonstrates a parallel extraction workflow:
 * 1. Extract person names and place names from text in parallel using LLM with structured output
 * 2. Transform names into structured Person and Place objects with IDs
 *
 * Key concepts:
 * - Custom state management with Annotation.Root()
 * - Structured LLM output using Zod schemas
 * - Parallel node execution
 * - Multiple independent extraction pipelines
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
 * Place entity with unique identifier
 */
type Place = {
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
  place_names: Annotation<string[]>,
  places: Annotation<Place[]>,
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
async function extractPeopleNames(state: State): Promise<Partial<State>> {
  console.log("→ Extracting people names from text...");
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

  console.log(`  ✓ Found ${result.names.length} people names:`, result.names);
  return { names: result.names };
}

/**
 * Extracts place names from text using an LLM with structured output.
 *
 * Uses Zod schema to enforce the LLM returns a properly formatted list of place names.
 */
async function extractPlaceNames(state: State): Promise<Partial<State>> {
  console.log("→ Extracting place names from text...");
  const { text } = state;

  const placeSchema = z.object({
    place_names: z
      .array(z.string())
      .describe("A list of place names (cities, countries, locations) extracted from the text."),
  });

  const llm = models.openai().withStructuredOutput(placeSchema);
  const result = await llm.invoke(
    `Please extract all place names (cities, countries, locations) from the following text: \n\n${text}`,
  );

  console.log(`  ✓ Found ${result.place_names.length} place names:`, result.place_names);
  return { place_names: result.place_names };
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

/**
 * Transforms extracted place names into structured Place objects with unique IDs.
 *
 * Simulates an async operation (e.g., database lookup or API call).
 */
async function mapToPlaces(state: State): Promise<Partial<State>> {
  console.log("→ Mapping place names to Place objects...");
  const { place_names } = state;

  if (isEmpty(place_names)) {
    console.log("  ⚠ No place names to map");
    return { places: [] };
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  const places = map(place_names, (name, index) => ({
    id: index + 1,
    name,
  }));

  console.log(`  ✓ Created ${places.length} Place objects`);
  return { places };
}

// ============================================================================
// GRAPH DEFINITION
// ============================================================================

/**
 * Creates and executes the people and places extraction workflow.
 *
 * The graph executes two parallel extraction pipelines:
 * 1. extract_people_names -> map_to_people
 * 2. extract_place_names -> map_to_places
 *
 * Both pipelines start simultaneously from START and converge at END.
 */
async function main() {
  console.log("=".repeat(60));
  console.log("People and Places Extractor Agent");
  console.log("=".repeat(60));

  const graph = new StateGraph(PeopleExtractorState)
    .addNode("extract_people_names", extractPeopleNames)
    .addNode("extract_place_names", extractPlaceNames)
    .addNode("map_to_people", mapToPeople)
    .addNode("map_to_places", mapToPlaces)
    // Start both extraction pipelines in parallel
    .addEdge(START, "extract_people_names")
    .addEdge(START, "extract_place_names")
    // Each extraction flows to its respective mapping node
    .addEdge("extract_people_names", "map_to_people")
    .addEdge("extract_place_names", "map_to_places")
    // Both pipelines converge at END
    .addEdge("map_to_people", END)
    .addEdge("map_to_places", END)
    .compile();

  const input = {
    text: "The team includes Alice, Bob, and Dr. Eve from London. We also spoke to Carol in Paris. They're planning to visit Tokyo and New York next month.",
  };

  console.log("\nInput text:", input.text);
  console.log();

  const result = await graph.invoke(input);

  console.log("\n" + "=".repeat(60));
  console.log("Final Result");
  console.log("=".repeat(60));
  console.log("Names extracted:", result.names);
  console.log("People created:", result.people);
  console.log("\nPlace names extracted:", result.place_names);
  console.log("Places created:", result.places);
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
