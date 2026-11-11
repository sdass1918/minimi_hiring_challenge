
-- ==========================================
-- MINIMI AI AGENT - INITIAL DATABASE SCHEMA
-- ==========================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive email uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx
ON users (LOWER(email));


-- 2. CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL DEFAULT 'New conversation',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Retrieve a user's conversations, newest first.
CREATE INDEX IF NOT EXISTS conversations_user_updated_idx
ON conversations (user_id, updated_at DESC, id DESC);


-- 3. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES conversations(id)
        ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL
        CHECK (role IN ('user', 'assistant', 'tool')),

    content TEXT NOT NULL,

    -- Optional tool name, e.g. web_search.
    tool_name VARCHAR(100),

    -- Structured information such as tool arguments,
    -- search results and execution metadata.
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

    -- Automatically generated searchable representation.
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english'::regconfig, content)
    ) STORED,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Retrieve messages from a conversation chronologically.
CREATE INDEX IF NOT EXISTS messages_conversation_time_idx
ON messages (conversation_id, created_at ASC, id ASC);

-- Full-text search across message content.
CREATE INDEX IF NOT EXISTS messages_search_idx
ON messages USING GIN (search_vector);


-- 4. CONVERSATION SUMMARIES
CREATE TABLE IF NOT EXISTS conversation_summaries (
    conversation_id UUID PRIMARY KEY
        REFERENCES conversations(id)
        ON DELETE CASCADE,

    summary TEXT NOT NULL,

    -- Structured facts extracted from the conversation.
    key_facts JSONB NOT NULL DEFAULT '{}'::JSONB,

    -- The last message included in this summary.
    through_message_id UUID
        REFERENCES messages(id)
        ON DELETE SET NULL,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

