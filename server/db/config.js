const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

const { Pool } = pg;

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Check your environment file.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

module.exports = {
  pool
}
