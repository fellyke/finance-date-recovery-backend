// ============================================================
// FINANCE DATE RECOVERY TOOL
// routes/users.js
// ============================================================

const express = require("express");
const bcrypt = require("bcryptjs");

const db = require("../config/database");

const router = express.Router();


// ============================================================
// GET ALL USERS
// GET /api/users
// ============================================================

router.get("/users", async (req, res) => {

    try {

        const [users] = await db.query(
            `SELECT 
                id, 
                name, 
                username, 
                role, 
                status, 
                DATE_FORMAT(date_created, '%Y-%m-%d %H:%i:%s') AS date_created 
             FROM users 
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            data: users
        });

    } catch (error) {

        console.error("Get users error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load users."
        });
    }
});


// ============================================================
// CREATE USER
// POST /api/users
// ============================================================

router.post("/users", async (req, res) => {

    try {

        const {
            name,
            username,
            password,
            role
        } = req.body;


        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!name || !username || !password || !role) {

            return res.status(400).json({
                success: false,
                message:
                    "Name, username, password and role are required."
            });
        }


        // ----------------------------------------------------
        // CHECK USERNAME
        // ----------------------------------------------------

        const [existingUsers] = await db.query(
            "SELECT id FROM users WHERE username = ? LIMIT 1",
            [username]
        );

        if (existingUsers.length > 0) {

            return res.status(409).json({
                success: false,
                message: "Username already exists."
            });
        }


        // ----------------------------------------------------
        // HASH PASSWORD
        // ----------------------------------------------------

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );


        // ----------------------------------------------------
        // SAVE USER
        // ----------------------------------------------------

        const [result] = await db.query(
            `INSERT INTO users
            (name, username, password, role, status)
            VALUES (?, ?, ?, ?, 'Active')`,
            [
                name,
                username,
                hashedPassword,
                role
            ]
        );


        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        res.status(201).json({

            success: true,

            message: "User created successfully.",

            user: {
                id: result.insertId,
                name: name,
                username: username,
                role: role,
                status: "Active"
            }

        });

    } catch (error) {

        console.error(
            "Create user error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to create user."
        });
    }
});


module.exports = router;