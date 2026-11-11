# Minimi — AI Chat Agent with Web Search & Conversational Memory

Minimi is an AI-powered conversational agent built with **NVIDIA Mistral Large 4**, **PostgreSQL**, and **Tavily Web Search**.

Unlike a basic chatbot, Minimi can retrieve relevant information from previous conversations, autonomously search the web when required, and combine historical context with current information to generate informed responses.

The project was built as part of the Minimi Hiring Challenge.

## Key Features

- **AI-powered conversations:** Uses Mistral Large 4 through NVIDIA NIM for reasoning and response generation.
- **Autonomous web search:** Decides when external information is required and invokes Tavily through function calling.
- **Conversational memory:** Persists conversations and messages in PostgreSQL.
- **Cross-conversation retrieval:** Retrieves relevant historical messages across previous conversations using PostgreSQL Full-Text Search.
- **Source citations:** Returns source titles and URLs associated with web-search results.
- **Multi-turn conversations:** Maintains context across messages within a conversation.
- **REST API:** Interact with the entire application using HTTP endpoints and `curl`.

## Tech Stack

| Component | Technology |
|---|---|
| Runtime | Node.js |
| Language | JavaScript |
| Backend | Express.js |
| LLM | Mistral Large 4 |
| Model Provider | NVIDIA NIM |
| Web Search | Tavily |
| Database | PostgreSQL |
| Database Driver | node-postgres (`pg`) |
| Historical Retrieval | PostgreSQL Full-Text Search |
| Indexing | GIN and B-tree |

## Architecture

Minimi uses a custom agent-orchestrator architecture.

```text
                 USER REQUEST
                      |
                      v
              EXPRESS REST API
                      |
                      v
              CHAT CONTROLLER
                      |
          +-----------+-----------+
          |                       |
          v                       v
   PostgreSQL Database      Agent Orchestrator
          |                       |
          |                Retrieve History
          |                       |
          |                       v
          |                 NVIDIA NIM
          |                Mistral Large 4
          |                       |
          |                Tool Call Needed?
          |                       |
          |                  +----+----+
          |                  |         |
          |                 YES        NO
          |                  |         |
          |                  v         |
          |              Tavily Search |
          |                  |         |
          |                  v         |
          |             Search Results |
          |                  |         |
          |                  +----+----+
          |                       |
          |                       v
          |                 Final Answer
          |                       |
          +<----------------------+
          |
          v
       JSON RESPONSE
```

### Agent Workflow

1. Express receives a user message and creates a new conversation or validates an existing one.
2. The orchestrator retrieves recent messages from the active conversation.
3. Historical messages are searched using PostgreSQL Full-Text Search.
4. Relevant historical context is supplied to the LLM.
5. Mistral decides whether web search is necessary.
6. If requested, Tavily searches the web and returns structured results.
7. Search results are passed back to the model for answer generation.
8. User messages, tool results, assistant responses and citation metadata are persisted in PostgreSQL.

The agent supports a maximum of three web-search tool-calling rounds per request.

## Project Structure

```text
minimi/
├── server/
│   ├── db/
│   │   ├── config.js
│   │   ├── schema.sql
│   │   └── init-db.js
│   │
│   ├── src/
│   │   ├── config/
│   │   │   └── env.js
│   │   │
│   │   ├── controllers/
│   │   │   └── chat.controller.js
│   │   │
│   │   ├── routes/
│   │   │   └── chat.routes.js
│   │   │
│   │   └── services/
│   │       ├── agent/
│   │       │   ├── orchestrator.js
│   │       │   └── system-prompt.js
│   │       │
│   │       ├── llm/
│   │       │   └── nvidia.js
│   │       │
│   │       ├── memory/
│   │       │   └── retrieval.js
│   │       │
│   │       └── search/
│   │           └── tavily.js
│   │
│   ├── index.js
│   └── package.json
│
├── .env.example
├── .gitignore
├── DESIGN.md
└── README.md
```

*The tree above describes the intended organization. Adjust filenames if your final repository differs.*

## Getting Started

### 1. Prerequisites

Make sure you have installed:

- Node.js 18 or later.
- npm.
- PostgreSQL 16 or later.
- NVIDIA API key.
- Tavily API key.

### 2. Clone the repository

```bash
git clone https://github.com/sdass1918/minimi_hiring_challenge

cd minimi_hiring_challenge
```

### 3. Install dependencies

```bash
cd server
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root.

```bash
cp .env.example .env
```

Configure the following variables:

```env
# PostgreSQL
DATABASE_URL=postgresql://minimi_app:YOUR_PASSWORD@localhost:5432/minimi_dev

# NVIDIA NIM
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_MODEL=mistralai/mistral-large-4-1t-a52b

# Tavily Web Search
TAVILY_API_KEY=your_tavily_api_key

# Server
PORT=3000
```

**Getting API keys:**

- NVIDIA API: https://build.nvidia.com/
- Tavily API: https://tavily.com/

The NVIDIA model used by default is:

`mistralai/mistral-large-4-1t-a52b`

Never commit your `.env` file or expose API keys in source code.

### 5. Set up PostgreSQL

You can use docker to run the postgres locally.

### 6. Initialize the database schema

From the `server` directory:

```bash
npm run db:init
```

This initializes the following tables:

| Table | Purpose |
|---|---|
| `users` | User information |
| `conversations` | Individual chat sessions |
| `messages` | User messages, assistant responses and tool results |
| `conversation_summaries` | Conversation summary storage |

The schema also creates indexes for conversation retrieval and full-text message search.

### 7. Start the application

From the `server` directory:

```bash
npm run dev
```

Expected output:

```text
Minimi server running on http://localhost:3000
```

The API is now ready.

## API Documentation

Base URL:

```text
http://localhost:3000
```

### 1. Health Check

**GET** `/api/health`

Check whether the server is running.

```bash
curl http://localhost:3000/api/health
```

Example response:

```json
{
  "status": "ok",
  "application": "Minimi AI Agent"
}
```

### 2. Send a Message

**POST** `/api/chat`

Starts a new conversation when `conversationId` is omitted.

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain PostgreSQL and its advantages over MySQL."
  }'
```

Example response:

```json
{
  "conversationId": "YOUR_CONVERSATION_UUID",
  "answer": "PostgreSQL is an open-source relational database...",
  "citations": []
}
```

The returned `conversationId` can be used to continue the conversation.

### 3. Continue an Existing Conversation

**POST** `/api/chat`

Provide the existing conversation ID to maintain conversational context.

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "YOUR_CONVERSATION_UUID",
    "message": "Can you explain its indexing mechanisms in more detail?"
  }'
```

### 4. Trigger Web Search

Ask a question requiring current external information.

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the latest pricing of Neon PostgreSQL? Search the web and cite your sources."
  }'
```

Example response:

```json
{
  "conversationId": "YOUR_CONVERSATION_UUID",
  "answer": "Neon offers several pricing options...",
  "citations": [
    {
      "title": "Neon Pricing",
      "url": "https://neon.com/pricing"
    }
  ]
}
```

Actual answers and citations depend on the latest search results.

### 5. Retrieve All Conversations

**GET** `/api/chat/conversations`

Retrieve the conversation list for the current development user.

```bash
curl http://localhost:3000/api/chat/conversations
```

Example response:

```json
[
  {
    "id": "YOUR_CONVERSATION_UUID",
    "title": "PostgreSQL hosting comparison",
    "created_at": "2026-11-11T10:00:00.000Z",
    "updated_at": "2026-11-11T10:05:00.000Z"
  }
]
```

### 6. Retrieve Conversation Messages

**GET** `/api/chat/conversations/:id/messages`

Retrieve the messages belonging to a particular conversation.

```bash
curl http://localhost:3000/api/chat/conversations/YOUR_CONVERSATION_UUID/messages
```

Example response:

```json
[
  {
    "id": "MESSAGE_UUID",
    "role": "user",
    "content": "Compare Neon and Aiven.",
    "metadata": {},
    "created_at": "2026-11-11T10:00:00.000Z"
  },
  {
    "id": "MESSAGE_UUID",
    "role": "assistant",
    "content": "Neon and Aiven differ in...",
    "metadata": {
      "citations": []
    },
    "created_at": "2026-11-11T10:01:00.000Z"
  }
]
```

## Demonstrating Conversational Memory

One of Minimi's key capabilities is retrieving information from previous conversations.

Unlike ordinary multi-turn context, historical retrieval can search across different conversation sessions.

### Step 1: Store information in a conversation

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "We shortlisted Neon, Aiven and Supabase for PostgreSQL hosting."
  }'
```

### Step 2: Start a new conversation

Do not provide the previous conversation ID.

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What did we discuss about PostgreSQL hosting earlier?"
  }'
```

Minimi retrieves relevant historical messages from PostgreSQL and supplies them as context to Mistral.

Expected behaviour:

- Identifies Neon, Aiven and Supabase.
- Recognizes that they were previously shortlisted.
- Recalls only information supported by the retrieved conversation history.
- Avoids inventing previous discussions.

## Screenshots

![Description of screenshot](./server/public/ss1.png)

![Description of screenshot](./server/public/ss2.png)

![Description of screenshot](./server/public/ss3.png)

![Description of screenshot](./server/public/ss4.png)

## Current Limitations

- Historical retrieval currently relies on PostgreSQL keyword-based full-text search rather than semantic embeddings.
- Recent context is limited to the latest 20 messages in the active conversation.
- Authentication is represented by a development user and is not production-ready.
- Responses are returned after model generation rather than streamed.
- Search accuracy depends on the quality and freshness of external search results.

## Future Improvements

- Hybrid retrieval using PostgreSQL Full-Text Search and pgvector.
- Date-aware historical retrieval.
- Incremental conversation summarization.
- Improved source verification and citation ranking.
- Streaming responses.
- Authentication and multi-user support.
- Automated agent evaluation and observability.

## Design Documentation

For architectural decisions, trade-offs, implementation details and future improvements, see [DESIGN.md](./Design.md).

## Author

Built as part of the Minimi Hiring Challenge.

**Minimi — Remember the past. Research the present. Answer with context.**
