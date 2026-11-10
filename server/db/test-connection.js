const { pool } = require('./config.js');

async function testConnection() {
  try {
    const result = await pool.query(`
      SELECT
        NOW() AS current_time,
        current_database() AS database_name,
        version() AS postgres_version
    `);

    console.log("Successfully connected to Neon!");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testConnection();
