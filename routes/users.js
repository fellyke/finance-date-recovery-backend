// ============================================================
// FINANCE DATE RECOVERY TOOL
// routes/users.js
// PostgreSQL User Management
// ============================================================

"use strict";

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

        const result = await db.query(
            `
            SELECT
                id,
                name,
                username,
                role,
                status,
                TO_CHAR(
                    date_created,
                    'YYYY-MM-DD HH24:MI:SS'
                ) AS date_created
            FROM public.users
            ORDER BY id DESC
            `
        );

        return res.status(200).json({
            success: true,
            data: result.rows
        });

    } catch (error) {

        console.error(
            "Get users error:",
            error
        );

        return res.status(500).json({
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

        if (
            !name ||
            !username ||
            !password ||
            !role
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Name, username, password and role are required."
            });
        }


        // ----------------------------------------------------
        // CHECK USERNAME
        // ----------------------------------------------------

        const existingUser =
            await db.query(
                `
                SELECT id
                FROM public.users
                WHERE LOWER(username) = LOWER($1)
                LIMIT 1
                `,
                [username.trim()]
            );


        if (existingUser.rows.length > 0) {

            return res.status(409).json({
                success: false,
                message: "Username already exists."
            });
        }


        // ----------------------------------------------------
        // HASH PASSWORD
        // ----------------------------------------------------

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        // ----------------------------------------------------
        // CREATE USER
        // ----------------------------------------------------

        const result =
            await db.query(
                `
                INSERT INTO public.users
                (
                    name,
                    username,
                    password,
                    role,
                    status
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    'Active'
                )
                RETURNING
                    id,
                    name,
                    username,
                    role,
                    status,
                    TO_CHAR(
                        date_created,
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS date_created
                `,
                [
                    name.trim(),
                    username.trim(),
                    hashedPassword,
                    role.trim()
                ]
            );


        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "User created successfully.",

            user:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "Create user error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create user."
        });
    }
});


// ============================================================
// EDIT USER
// PUT /api/users/:id
// ============================================================

router.put("/users/:id", async (req, res) => {

    try {

        const userId =
            parseInt(req.params.id, 10);

        const {
            name,
            username,
            role,
            status
        } = req.body;


        // ----------------------------------------------------
        // VALIDATE ID
        // ----------------------------------------------------

        if (isNaN(userId)) {

            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }


        // ----------------------------------------------------
        // VALIDATE REQUIRED FIELDS
        // ----------------------------------------------------

        if (
            !name ||
            !username ||
            !role ||
            !status
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Name, username, role and status are required."
            });
        }


        // ----------------------------------------------------
        // CHECK USER EXISTS
        // ----------------------------------------------------

        const userCheck =
            await db.query(
                `
                SELECT id
                FROM public.users
                WHERE id = $1
                LIMIT 1
                `,
                [userId]
            );


        if (userCheck.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }


        // ----------------------------------------------------
        // CHECK IF USERNAME BELONGS TO ANOTHER USER
        // ----------------------------------------------------

        const usernameCheck =
            await db.query(
                `
                SELECT id
                FROM public.users
                WHERE LOWER(username) = LOWER($1)
                AND id <> $2
                LIMIT 1
                `,
                [
                    username.trim(),
                    userId
                ]
            );


        if (usernameCheck.rows.length > 0) {

            return res.status(409).json({
                success: false,
                message:
                    "Username already belongs to another user."
            });
        }


        // ----------------------------------------------------
        // UPDATE USER
        // ----------------------------------------------------

        const result =
            await db.query(
                `
                UPDATE public.users
                SET
                    name = $1,
                    username = $2,
                    role = $3,
                    status = $4
                WHERE id = $5
                RETURNING
                    id,
                    name,
                    username,
                    role,
                    status,
                    TO_CHAR(
                        date_created,
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS date_created
                `,
                [
                    name.trim(),
                    username.trim(),
                    role.trim(),
                    status.trim(),
                    userId
                ]
            );


        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                "User updated successfully.",

            user:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "Update user error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update user."
        });
    }
});


// ============================================================
// CHANGE USER PASSWORD
// PUT /api/users/:id/password
// ============================================================

router.put(
    "/users/:id/password",
    async (req, res) => {

        try {

            const userId =
                parseInt(
                    req.params.id,
                    10
                );

            const {
                password
            } = req.body;


            // ------------------------------------------------
            // VALIDATE ID
            // ------------------------------------------------

            if (isNaN(userId)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid user ID."
                });
            }


            // ------------------------------------------------
            // VALIDATE PASSWORD
            // ------------------------------------------------

            if (
                !password ||
                String(password).length < 6
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 6 characters long."
                });
            }


            // ------------------------------------------------
            // CHECK USER
            // ------------------------------------------------

            const userResult =
                await db.query(
                    `
                    SELECT id
                    FROM public.users
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [userId]
                );


            if (
                userResult.rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "User not found."
                });
            }


            // ------------------------------------------------
            // HASH NEW PASSWORD
            // ------------------------------------------------

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            // ------------------------------------------------
            // UPDATE PASSWORD
            // ------------------------------------------------

            await db.query(
                `
                UPDATE public.users
                SET password = $1
                WHERE id = $2
                `,
                [
                    hashedPassword,
                    userId
                ]
            );


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "Password changed successfully."

            });

        } catch (error) {

            console.error(
                "Change password error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to change password."
            });
        }
    }
);


// ============================================================
// DELETE USER
// DELETE /api/users/:id
// ============================================================

router.delete(
    "/users/:id",
    async (req, res) => {

        try {

            const userId =
                parseInt(
                    req.params.id,
                    10
                );


            // ------------------------------------------------
            // VALIDATE ID
            // ------------------------------------------------

            if (isNaN(userId)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid user ID."
                });
            }


            // ------------------------------------------------
            // CHECK USER EXISTS
            // ------------------------------------------------

            const userResult =
                await db.query(
                    `
                    SELECT
                        id,
                        name,
                        username
                    FROM public.users
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [userId]
                );


            if (
                userResult.rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "User not found."
                });
            }


            // ------------------------------------------------
            // PREVENT DELETING CURRENT USER
            // ------------------------------------------------

            /*
             * If your authentication middleware places
             * the logged-in user's ID inside req.user.id,
             * this check will prevent self-deletion.
             *
             * If req.user is not available, the check
             * is simply skipped.
             */

            if (
                req.user &&
                Number(req.user.id) === userId
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "You cannot delete your own account."
                });
            }


            // ------------------------------------------------
            // DELETE USER
            // ------------------------------------------------

            await db.query(
                `
                DELETE FROM public.users
                WHERE id = $1
                `,
                [userId]
            );


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "User deleted successfully."

            });

        } catch (error) {

            console.error(
                "Delete user error:",
                error
            );


            // ------------------------------------------------
            // FOREIGN KEY ERROR
            // ------------------------------------------------

            if (error.code === "23503") {

                return res.status(409).json({
                    success: false,
                    message:
                        "This user cannot be deleted because other records depend on this account."
                });
            }


            return res.status(500).json({
                success: false,
                message:
                    "Unable to delete user."
            });
        }
    }
);


module.exports = router;