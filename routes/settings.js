
// ============================================================
// FINANCE DATE RECOVERY TOOL
// SETTINGS API
// routes/settings.js
// ============================================================

"use strict";

const express = require("express");
const db = require("../config/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


// ============================================================
// GET SETTINGS
// GET /api/settings
// ============================================================

router.get("/", authenticateToken, async (req, res) => {

    try {

        const result = await db.query(`
            SELECT
                id,
                system_name,
                records_per_page,
                created_at
            FROM public.settings
            ORDER BY id DESC
            LIMIT 1
        `);

        if (result.rows.length === 0) {

            return res.status(200).json({
                success: true,
                data: {
                    systemName: "Finance Date Recovery Tool",
                    recordsPerPage: 50
                }
            });
        }

        const settings = result.rows[0];

        return res.status(200).json({

            success: true,

            data: {
                id: settings.id,
                systemName: settings.system_name,
                recordsPerPage: settings.records_per_page,
                createdAt: settings.created_at
            }
        });

    } catch (error) {

        console.error(
            "GET SETTINGS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load settings.",

            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined
        });
    }
});


// ============================================================
// SAVE SETTINGS
// POST /api/settings
// ============================================================

router.post("/", authenticateToken, async (req, res) => {

    try {

        const {
            systemName,
            recordsPerPage
        } = req.body;


        // ====================================================
        // VALIDATION
        // ====================================================

        if (
            !systemName ||
            String(systemName).trim() === ""
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "System name is required."
            });
        }


        const pageSize =
            parseInt(
                recordsPerPage,
                10
            );


        if (
            !Number.isInteger(pageSize) ||
            pageSize < 1
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Records per page must be a valid number."
            });
        }


        // ====================================================
        // CHECK EXISTING SETTINGS
        // ====================================================

        const existing =
            await db.query(`
                SELECT id
                FROM public.settings
                ORDER BY id DESC
                LIMIT 1
            `);


        let result;


        // ====================================================
        // UPDATE EXISTING SETTINGS
        // ====================================================

        if (existing.rows.length > 0) {

            result =
                await db.query(`

                    UPDATE public.settings

                    SET
                        system_name = $1,
                        records_per_page = $2

                    WHERE id = $3

                    RETURNING
                        id,
                        system_name,
                        records_per_page,
                        created_at

                `, [

                    String(systemName).trim(),
                    pageSize,
                    existing.rows[0].id

                ]);

        }


        // ====================================================
        // CREATE SETTINGS
        // ====================================================

        else {

            result =
                await db.query(`

                    INSERT INTO public.settings
                    (
                        system_name,
                        records_per_page
                    )

                    VALUES
                    (
                        $1,
                        $2
                    )

                    RETURNING
                        id,
                        system_name,
                        records_per_page,
                        created_at

                `, [

                    String(systemName).trim(),
                    pageSize

                ]);
        }


        const settings =
            result.rows[0];


        return res.status(200).json({

            success: true,

            message:
                "Settings saved successfully.",

            data: {

                id:
                    settings.id,

                systemName:
                    settings.system_name,

                recordsPerPage:
                    settings.records_per_page,

                createdAt:
                    settings.created_at
            }
        });

    } catch (error) {

        console.error(
            "SAVE SETTINGS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to save settings.",

            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined
        });
    }
});


module.exports = router;

