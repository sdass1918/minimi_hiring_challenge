# Minimi — Design Document

## 1. Overview

Minimi is a conversational AI agent powered by NVIDIA's Mistral Large 4 with one external tool: web search.

Its primary goal is to combine persistent conversational memory with real-time web research, allowing users to ask questions about previous discussions and verify whether previously discussed information is still accurate.

The application is built using JavaScript, Node.js, Express, PostgreSQL, NVIDIA NIM and Tavily.

## 2. Architecture & How It Works

Minimi follows a straightforward agent-orchestrator architecture.

**Request lifecycle:**

1. **Conversation management:** Express receives a user message and either creates a new conversation or validates an existing conversation.
2. **Memory retrieval:** The orchestrator retrieves recent messages from the active conversation and searches historical conversations using PostgreSQL full-text search.
3. **LLM reasoning:** Relevant context, conversation history and the system prompt are passed to Mistral Large 4 through NVIDIA's OpenAI-compatible API.
4. **Tool execution:** If the model requests web search, the orchestrator executes the Tavily search function and returns the results to the model.
5. **Response generation:** The model synthesizes the retrieved context and search results into a final response, including source URLs.
6. **Persistence:** User messages, tool results, assistant responses and citation metadata are stored in PostgreSQL.

The agent supports multiple tool-calling iterations, with a configurable maximum of three rounds per request.

### Technology Choices

- **Express + Node.js:** Lightweight HTTP server and API routing.
- **Mistral Large 4:** Reasoning, conversational responses and function calling.
- **Tavily:** Web search for current information and source discovery.
- **PostgreSQL:** Persistent storage for users, conversations, messages and summaries.
- **GIN + PostgreSQL Full-Text Search:** Efficient keyword-based retrieval of historical messages.
- **B-tree indexes:** Efficient conversation lookup and chronological message retrieval.

## 3. Memory and Retrieval Strategy

I chose PostgreSQL as the primary persistence and retrieval layer rather than introducing a separate vector database.

Conversation history is stored in a relational structure:

`users → conversations → messages`

Minimi uses two complementary memory mechanisms:

- **Short-term memory:** The most recent 20 messages from the active conversation are supplied to the model.
- **Historical memory:** PostgreSQL full-text search retrieves relevant messages across the user's previous conversations. Retrieved messages are injected as additional context.

A GIN index on the generated `tsvector` column accelerates full-text matching. B-tree indexes support user-specific conversation listing and chronological message retrieval.

Original messages are retained independently of the context passed to the model.

This approach keeps the architecture simple, avoids additional infrastructure and provides a practical foundation for conversational recall.

## 4. Design Decisions and Alternatives Considered

**Why an agent orchestrator instead of a simple LLM API call?**

A simple completion endpoint cannot independently decide when external information is required. The orchestrator allows the model to request web searches, inspect their results and formulate a grounded response.

**Why PostgreSQL instead of a dedicated vector database?**

The initial requirements involve persistent conversation history, relational ownership and keyword-based retrieval. PostgreSQL provides all three without introducing another service.

**Why Tavily?**

It provides structured search results with URLs and content that can be passed directly into the model's tool-calling workflow.

**What I deliberately avoided:**

- A separate vector database and embedding pipeline.
- Multiple agents with overlapping responsibilities.
- Complex background workers and message queues.
- A frontend that would add implementation time without improving the core agent architecture.

The priority was a working, understandable agent rather than unnecessary infrastructure.

## 5. Current Limitations

- Historical retrieval is keyword-based and does not fully understand semantic similarity.
- Recent-message context is limited to the active conversation.
- Authentication is currently represented by a development user and must be replaced before production.
- Responses are currently returned after generation rather than streamed.
- Search quality and factual accuracy depend partly on external search results and model reasoning.

These are acknowledged limitations rather than hidden architectural assumptions.

## 6. What I Would Build With Another Week

1. **Hybrid retrieval:** Combine PostgreSQL full-text search with pgvector embeddings and relevance ranking.
2. **Temporal retrieval:** Improve date-aware queries such as "What did I ask you on November 3?"
3. **Reliable memory:** Introduce incremental conversation summarization and better context selection for long conversations.
4. **Research quality:** Add query refinement, source deduplication, publication-date awareness and stronger citation verification.
5. **Production readiness:** Implement authentication, streaming responses, request-level idempotency, observability and automated evaluation tests.

## 7. Engineering Philosophy

Minimi is designed around a simple principle: conversational memory and current information should work together.

The goal is not merely to generate plausible answers, but to retrieve what was previously discussed, investigate what has changed and clearly distinguish historical context from newly discovered information.

The architecture deliberately starts small while keeping the core components independently replaceable and extensible.
