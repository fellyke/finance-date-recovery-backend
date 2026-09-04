"use strict";

require("dotenv").config();

const { Pool } = require("pg");

const db = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    },

    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

db.on("connect", () => {
    console.log("Connected to Supabase PostgreSQL");
});

db.on("error", (err) => {
    console.error("Unexpected database error:", err);
});

module.exports = db;