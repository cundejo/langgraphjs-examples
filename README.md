# LangGraph Examples

A collection of well-documented LangGraph agents demonstrating various patterns and best practices for building stateful, agentic workflows with LangGraph.

## 📋 Overview

This repository contains examples that showcase different LangGraph capabilities:

1. **People Extractor Agent** - Structured data extraction with custom state
2. **Web Search Agent** - Tool-calling with conditional routing
3. **Calculator Agent** - Custom tool creation and multi-step reasoning
4. **Countdown Agent** - Conditional routing and state management

Each agent is fully documented with clear explanations of key concepts and patterns.

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ 
- pnpm
- OpenAI API key 
- Tavily API key (only for Web Search Agent)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/cundejo/langgraphjs-examples
cd langgraph-examples
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

## 🤖 Agents

### 1. People Extractor Agent

**File:** `src/people-extractor.agent.ts`

Demonstrates a two-step workflow that extracts person names from text and transforms them into structured objects.

**Key Concepts:**
- Custom state management with `Annotation.Root()`
- Structured LLM output using Zod schemas
- Sequential node execution

**Run:**
```bash
npx ts-node src/people-extractor.agent.ts
```

**Example Output:**
```
→ Extracting names from text...
  ✓ Found 4 names: [ 'Alice', 'Bob', 'Dr. Eve', 'Carol' ]
→ Mapping names to Person objects...
  ✓ Created 4 Person objects
```

---

### 2. Web Search Agent

**File:** `src/browser-tool.agent.ts`

An agent that uses the Tavily search tool to answer questions by searching the web.

**Key Concepts:**
- `MessagesAnnotation` for conversation state
- Tool binding with `.bindTools()`
- Conditional edges for dynamic routing
- `ToolNode` for automatic tool execution

**Run:**
```bash
npx ts-node src/browser-tool.agent.ts
```

**Example:**
The agent can answer questions like "What is the weather in SF?" by searching the web and maintaining conversation context.

---

### 3. Calculator Agent

**File:** `src/calculator-tool.agent.ts`

An agent that solves math problems by breaking them down and using calculator tools.

**Key Concepts:**
- Custom tool definition with Zod schemas
- Tool binding and automatic execution
- Multi-step reasoning with tools

**Run:**
```bash
npx ts-node src/calculator-tool.agent.ts
```

**Example:**
Solves problems like "If I have 7 apples and I give 3 to my friend, and then I buy 5 more, how many apples do I have?"

---

### 4. Countdown Agent

**File:** `src/simple-counter.agent.ts`

A simple agent that counts down from a number to zero using different strategies based on the current value.

**Key Concepts:**
- Custom state with `Annotation.Root()`
- Conditional edges with multiple possible routes
- State history tracking
- Dynamic routing based on state values

**Run:**
```bash
npx ts-node src/simple-counter.agent.ts
```

**Example:**
Counts down from 57 to 0, using fast countdown (subtract 5) for numbers > 10 and slow countdown (subtract 1) for numbers 1-10.

## 📚 LangGraph Concepts

### State Management

LangGraph uses **Annotation** to define state:

```typescript
// For custom state
const MyState = Annotation.Root({
  field1: Annotation<string>,
  field2: Annotation<number[]>,
});

// For message-based agents
import { MessagesAnnotation } from "@langchain/langgraph";
```

### Graph Construction

Graphs are built using method chaining:

```typescript
const graph = new StateGraph(MyState)
  .addNode("node1", nodeFunction1)
  .addNode("node2", nodeFunction2)
  .addEdge(START, "node1")
  .addEdge("node1", "node2")
  .addEdge("node2", END)
  .compile();
```

### Conditional Routing

Use `.addConditionalEdges()` for dynamic routing:

```typescript
function routeFunction(state: State) {
  if (condition) return "nodeA";
  return "nodeB";
}

graph.addConditionalEdges("source", routeFunction, ["nodeA", "nodeB", END]);
```

### Tool Calling

Bind tools to your LLM and use `ToolNode` for automatic execution:

```typescript
const tools = [myTool1, myTool2];
const llm = model.bindTools(tools);
const toolNode = new ToolNode(tools);
```

## 🏗️ Project Structure

```
langgraph-examples/
├── src/
│   ├── people-extractor.agent.ts    # Structured data extraction
│   ├── browser-tool.agent.ts        # Web search with tools
│   ├── calculator-tool.agent.ts     # Custom calculator tools
│   ├── simple-counter.agent.ts      # Conditional routing
│   └── utils/
│       └── models.ts                # Shared model configuration
├── package.json
├── tsconfig.json
├── .env                             # API keys (create this)
└── README.md
```

## 🔧 Configuration

### Model Configuration

The default model is configured in `src/utils/models.ts`. You can modify it to use different models:

```typescript
export const models = {
  openai: () =>
    new ChatOpenAI({
      model: "gpt-4.1-nano-2025-04-14",
      temperature: 0,
    }),
};
```

## 📖 Resources

- [LangGraph Documentation](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [LangChain Documentation](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangGraph Tutorials](https://langchain-ai.github.io/langgraphjs/tutorials/quickstart)

## 🤝 Contributing

Feel free to add more examples or improve existing ones! Follow these guidelines:

1. Use clear, descriptive naming conventions
2. Add comprehensive JSDoc comments
3. Follow the established code structure
4. Include example output in comments
5. Test your agent before submitting

## 📝 License

This project is for educational purposes.

## 🙋 Support

For questions or issues:
- Check the [LangGraph documentation](https://docs.langchain.com/oss/javascript/langgraph/overview)
- Review the code comments in each agent
- Open an issue in this repository

