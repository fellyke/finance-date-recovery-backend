// ============================================================
// FINANCE DATE RECOVERY TOOL
// NODE.JS BACKEND
// server.js
// ============================================================

"use strict";

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/database");


// ============================================================
// ROUTES
// ============================================================

const userRoutes = require("./routes/users");
const uploadRoutes = require("./routes/upload");
const dateRecoveryRoutes = require("./routes/date-recovery");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const historyRoutes = require("./routes/history");
const uploadedFilesRoutes = require("./routes/uploaded-files");
const recordsRoutes = require("./routes/records");
// REPAYMENTS ROUTE
const repaymentsRoutes = require("./routes/repayments");


// ============================================================
// APP
// ============================================================

const app = express();


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(express.json());


// ============================================================
// AUTHENTICATION ROUTES
// ============================================================

app.use("/api", authRoutes);
app.use("/api", recordsRoutes);

// ============================================================
// USER ROUTES
// ============================================================

app.use("/api", userRoutes);


// ============================================================
// DASHBOARD ROUTES
// ============================================================

app.use("/api", dashboardRoutes);


// ============================================================
// HISTORY ROUTES
// ============================================================

app.use("/api", historyRoutes);


// ============================================================
// UPLOAD ROUTES
// ============================================================

app.use("/api", uploadRoutes);

app.use("/api", uploadedFilesRoutes);


// ============================================================
// REPAYMENTS ROUTES
// ============================================================

app.use("/api/repayments", repaymentsRoutes);


// ============================================================
// DATE RECOVERY ROUTES
// ============================================================

app.use("/api/recovery", dateRecoveryRoutes);


// ============================================================
// TEST API
// GET /api
// ============================================================

app.get("/api", (req, res) => {

    res.json({
        success: true,
        message: "Finance Date Recovery API is running"
    });

});


// ============================================================
// TEST DATABASE CONNECTION
// GET /api/test-db
// ============================================================

app.get("/api/test-db", async (req, res) => {

    try {

        const result = await db.query(
            "SELECT 1 AS connected"
        );

        res.json({

            success: true,

            message:
                "Supabase PostgreSQL database connected successfully",

            data: result.rows

        });

    } catch (error) {

        console.error(
            "Database error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Database connection failed",

            error: error.message

        });

    }

});


// ============================================================
// SERVER
// ============================================================

const PORT =
    process.env.PORT || 5000;


app.listen(PORT, () => {

    console.log(
        "-----------------------------------------"
    );

    console.log(
        "Finance Date Recovery API"
    );

    console.log(
        "-----------------------------------------"
    );

    console.log(
        `Server running on port ${PORT}`
    );

    console.log(
        `API: http://localhost:${PORT}/api`
    );

    console.log(
        "-----------------------------------------"
    );

});