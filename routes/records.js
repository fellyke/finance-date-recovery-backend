// ============================================================
// FINANCE DATE RECOVERY TOOL
// routes/records.js
// FINANCIAL RECORDS API
// ============================================================

"use strict";

const express = require("express");

const db = require("../config/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


// ============================================================
// GET FINANCIAL RECORDS
// GET /api/records
// ============================================================

router.get(
    "/records",
    authenticateToken,
    async (req, res) => {

        try {

            // ==================================================
            // GET FINANCIAL RECORDS
            // ==================================================

            const result = await db.query(`
                SELECT
                    id,
                    member_number,
                    member_name,
                    loan_number,
                    loan_type,
                    loan_amount,
                    loan_date,
                    repayment_date,
                    maturity_date,
                    transaction_date,
                    transaction_reference,
                    status,
                    uploaded_file_id,
                    created_at

                FROM public.financial_records

                ORDER BY created_at DESC

                LIMIT 1000
            `);


            // ==================================================
            // RETURN RECORDS
            // ==================================================

            return res.status(200).json({

                success: true,

                message:
                    "Financial records loaded successfully.",

                data: result.rows

            });

        } catch (error) {

            console.error(
                "Financial records error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load financial records."

            });

        }

    }
);


// ============================================================
// GET SINGLE FINANCIAL RECORD
// GET /api/records/:id
// ============================================================

router.get(
    "/records/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const { id } = req.params;


            const result = await db.query(`
                SELECT
                    id,
                    member_number,
                    member_name,
                    loan_number,
                    loan_type,
                    loan_amount,
                    loan_date,
                    repayment_date,
                    maturity_date,
                    transaction_date,
                    transaction_reference,
                    status,
                    uploaded_file_id,
                    created_at

                FROM public.financial_records

                WHERE id = $1

                LIMIT 1
            `, [id]);


            if (result.rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Financial record not found."

                });

            }


            return res.status(200).json({

                success: true,

                message:
                    "Financial record loaded successfully.",

                data: result.rows[0]

            });

        } catch (error) {

            console.error(
                "Financial record details error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load financial record."

            });

        }

    }
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;