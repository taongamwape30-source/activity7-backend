require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const url = process.env.DATABASE_URL || "";
const local = /localhost|127\.0\.0\.1/.test(url);
const pool = new Pool({
  connectionString: url,
  ssl: local ? false : { rejectUnauthorized: false }
});
pool.on("error", err => console.error("Database pool error:", err.message));

// Creates the table if needed and inserts the starting records once, when the table is first created.
pool.init = async function init() {
  const existed = (await pool.query("SELECT to_regclass('public.records') AS t")).rows[0].t !== null;
  await pool.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
  if (!existed) {
    await pool.query(fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8"));
    console.log("Created records table and inserted starting records.");
  }
};

module.exports = pool;
