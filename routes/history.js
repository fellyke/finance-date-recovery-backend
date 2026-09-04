
// ============================================================
// FINANCE DATE RECOVERY TOOL
// routes/history.js
// RECOVERY HISTORY API
// ============================================================

"use strict";

const express = require("express");
const db = require("../config/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


// ============================================================
// GET RECOVERY HISTORY
// GET /api/history
// ============================================================

router.get(
    "/history",
    authenticateToken,
    async (req, res) => {

        try {

            // ==================================================
            // GET RECOVERY HISTORY
            // ==================================================
            //
            // recovery_history:
            //
            // id
            // search_term
            // member_number
            // member_name
            // loan_number
            // transaction_reference
            // result
            // records_found
            // searched_by
            // search_date
            //
            // ==================================================

            const [history] = await db.query(`
                SELECT
                    rh.id,

                    rh.search_term,

                    rh.member_number,

                    rh.member_name,

                    rh.loan_number,

                    rh.transaction_reference,

                    rh.result,

                    rh.records_found,

                    COALESCE(
                        u.username,
                        'Unknown'
                    ) AS username,

                    COALESCE(
                        u.name,
                        'Unknown'
                    ) AS user_name,

                    DATE_FORMAT(
                        rh.search_date,
                        '%Y-%m-%d'
                    ) AS recovery_date,

                    DATE_FORMAT(
                        rh.search_date,
                        '%H:%i:%s'
                    ) AS recovery_time,

                    rh.search_date

                FROM recovery_history rh

                LEFT JOIN users u
                    ON rh.searched_by = u.id

                ORDER BY rh.search_date DESC

                LIMIT 100
            `);


            // ==================================================
            // RETURN RESPONSE
            // ==================================================

            return res.status(200).json({

                success: true,

                message:
                    "Recovery history loaded successfully.",

                data: history

            });

        } catch (error) {

            // ==================================================
            // ERROR HANDLING
            // ==================================================

            console.error(
                "Recovery history error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load recovery history."

            });

        }

    }
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;

