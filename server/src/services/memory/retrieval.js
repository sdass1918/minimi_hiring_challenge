
const { pool } = require("../../../db/config.js");

const STOP_WORDS = new Set([
  "what", "when", "where", "who", "why", "how",
  "did", "does", "do", "we", "i", "you",
  "the", "a", "an", "is", "was", "were",
  "about", "discuss", "discussed", "earlier",
  "before", "previously", "previous", "tell",
  "me", "our", "my", "your", "can", "could",
  "please", "remember", "said", "talked",
]);

function extractSearchTerms(query) {
  return [
    ...new Set(
      query
        .toLowerCase()
        .match(/[\p{L}\p{N}]+/gu) || []
    ),
  ].filter(
    (word) => word.length > 2 && !STOP_WORDS.has(word)
  );
}

async function searchHistory(userId, query, limit = 8) {
  const terms = extractSearchTerms(query);

  if (!terms.length) {
    return [];
  }

  // OR allows partial keyword matches.
  const searchQuery = terms.join(" OR ");

  const result = await pool.query(
    `
    SELECT
      m.id,
      m.conversation_id,
      c.title AS conversation_title,
      m.role,
      m.content,
      m.created_at,
      ts_rank_cd(
        m.search_vector,
        websearch_to_tsquery('english', $2)
      ) AS relevance

    FROM messages m

    JOIN conversations c
      ON c.id = m.conversation_id

    WHERE
      c.user_id = $1
      AND m.role IN ('user', 'assistant')
      AND m.search_vector @@
        websearch_to_tsquery('english', $2)

    ORDER BY relevance DESC, m.created_at DESC

    LIMIT $3
    `,
    [userId, searchQuery, limit]
  );

  return result.rows;
}

module.exports = {
  searchHistory,
};
