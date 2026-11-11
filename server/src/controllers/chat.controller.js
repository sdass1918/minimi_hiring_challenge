const { pool } = require("../../db/config.js");
const { runAgent } = require("../services/agent/orchestrator.js");

const DEV_USER_ID = "11111111-1111-4111-8111-111111111111";

async function sendMessage(req, res) {
  const { message, conversationId } = req.body;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "Message is required",
    });
  }

  if (message.length > 10000) {
    return res.status(400).json({
      error: "Message is too long",
    });
  }

  try {
    // Development user. Replace with authenticated identity later.
    await pool.query(
      `
      INSERT INTO users (id, email, password_hash, display_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
      `,
      [
        DEV_USER_ID,
        "dev@minimi.local",
        "development-only",
        "Minimi User",
      ]
    );

    let activeConversationId = conversationId;

    if (activeConversationId) {
      const existing = await pool.query(
        `
        SELECT id FROM conversations
        WHERE id = $1 AND user_id = $2
        `,
        [activeConversationId, DEV_USER_ID]
      );

      if (existing.rowCount === 0) {
        return res.status(404).json({
          error: "Conversation not found",
        });
      }
    } else {
      const created = await pool.query(
        `
        INSERT INTO conversations (user_id, title)
        VALUES ($1, $2)
        RETURNING id
        `,
        [DEV_USER_ID, message.trim().slice(0, 60)]
      );

      activeConversationId = created.rows[0].id;
    }

    // Run the agent before persisting the current turn.
    const agentResult = await runAgent({
      userId: DEV_USER_ID,
      conversationId: activeConversationId,
      userMessage: message.trim(),
    });

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
        INSERT INTO messages (conversation_id, role, content)
        VALUES ($1, 'user', $2)
        `,
        [activeConversationId, message.trim()]
      );

      // Persist search activity for traceability.
      for (const execution of agentResult.toolExecutions) {
        await client.query(
          `
          INSERT INTO messages
            (conversation_id, role, content, tool_name, metadata)
          VALUES ($1, 'tool', $2, 'web_search', $3)
          `,
          [
            activeConversationId,
            JSON.stringify(execution.results),
            JSON.stringify({
              query: execution.query,
            }),
          ]
        );
      }

      await client.query(
        `
        INSERT INTO messages (conversation_id, role, content, metadata)
        VALUES ($1, 'assistant', $2, $3)
        `,
        [
          activeConversationId,
          agentResult.answer,
          JSON.stringify({
            citations: agentResult.citations,
          }),
        ]
      );

      await client.query(
        `
        UPDATE conversations
        SET updated_at = NOW()
        WHERE id = $1
        `,
        [activeConversationId]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return res.status(200).json({
      conversationId: activeConversationId,
      answer: agentResult.answer,
      citations: agentResult.citations,
    });
  } catch (error) {
    console.error("Chat controller error:", error);
    return res.status(500).json({
      error: "Something went wrong while processing your message.",
    });
  }
}

async function listConversations(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT id, title, created_at, updated_at
      FROM conversations
      WHERE user_id = $1
      ORDER BY updated_at DESC
      `,
      [DEV_USER_ID]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load conversations" });
  }
}


async function getConversationMessages(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        m.id,
        m.role,
        m.content,
        m.metadata,
        m.created_at
      FROM messages m
      JOIN conversations c
        ON c.id = m.conversation_id
      WHERE c.id = $1
        AND c.user_id = $2
        AND m.role IN ('user', 'assistant')
      ORDER BY m.created_at ASC, m.id ASC
      `,
      [req.params.id, DEV_USER_ID]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("History retrieval error:", error);
    return res.status(500).json({
      error: "Could not load messages",
    });
  }
}


module.exports = {
    sendMessage,
    listConversations,
    getConversationMessages
}
