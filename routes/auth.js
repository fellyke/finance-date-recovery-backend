
// ============================================================
// FINANCE DATE RECOVERY TOOL
// routes/auth.js
// PostgreSQL / Supabase Authentication
// ============================================================

"use strict";

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../config/database");

const router = express.Router();


// ============================================================
// JWT SECRET
// ============================================================

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "finance_date_recovery_secret";


// ============================================================
// LOGIN
// POST /api/login
// ============================================================

router.post("/login", async (req, res) => {

    try {

        const { username, password } = req.body;


        // ----------------------------------------------------
        // VALIDATE INPUT
        // ----------------------------------------------------

        if (!username || !password) {

            return res.status(400).json({
                success: false,
                message: "Username and password are required."
            });

        }


        // ----------------------------------------------------
        // FIND ACTIVE USER
        // ----------------------------------------------------

        const result = await db.query(
            `SELECT
                id,
                name,
                username,
                password,
                role,
                status
             FROM public.users
             WHERE username = $1
             AND status = 'Active'
             LIMIT 1`,
            [username]
        );


        // ----------------------------------------------------
        // USER NOT FOUND
        // ----------------------------------------------------

        if (result.rows.length === 0) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });

        }


        const user = result.rows[0];


        // ----------------------------------------------------
        // CHECK PASSWORD
        // ----------------------------------------------------

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });

        }


        // ----------------------------------------------------
        // CREATE JWT TOKEN
        // ----------------------------------------------------

        const token = jwt.sign(

            {
                id: user.id,
                username: user.username,
                role: user.role
            },

            JWT_SECRET,

            {
                expiresIn: "8h"
            }

        );


        // ----------------------------------------------------
        // LOGIN SUCCESSFUL
        // ----------------------------------------------------

        return res.status(200).json({

            success: true,

            message: "Login successful.",

            token: token,

            user: {

                id: user.id,

                name: user.name,

                username: user.username,

                role: user.role,

                status: user.status

            }

        });


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Server error during login."

        });

    }

});


module.exports = router;

