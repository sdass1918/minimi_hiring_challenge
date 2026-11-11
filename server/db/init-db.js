const fs = require("node:fs/promises");
const path = require("node:path");
const { pool } = require("./config.js");

async function initializeDatabase() {
  const client = await pool.connect();

  try {
    const schema = await fs.readFile(
      path.join(__dirname, "schema.sql"),
      "utf-8"
    );

    await client.query("BEGIN");
    await client.query(schema);
    await client.query("COMMIT");

    console.log("Database schema initialized successfully!");

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log("Created tables:");

    result.rows.forEach((row) => {
      console.log(`- ${row.table_name}`);
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Schema initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase();
