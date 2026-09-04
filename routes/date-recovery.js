
// ============================================================
// FINANCE DATE RECOVERY TOOL
// DATE RECOVERY API
// routes/date-recovery.js
// ============================================================

"use strict";

const express = require("express");
const router = express.Router();

const db = require("../config/database");
const authenticateToken = require("../middleware/auth");

// ============================================================
// SEARCH / RECOVER FINANCIAL RECORD
// ============================================================
// GET /api/recovery/search
//
// Examples:
//
// /api/recovery/search?memberNumber=MEM001
// /api/recovery/search?memberName=John
// /api/recovery/search?loanNumber=LN001
// /api/recovery/search?transactionNumber=TX001
//
// ============================================================

router.get(
    "/search",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                memberNumber,
                memberName,
                loanNumber,
                transactionNumber
            } = req.query;


            // ----------------------------------------------------
            // CHECK SEARCH INPUT
            // ----------------------------------------------------

            if (
                !memberNumber &&
                !memberName &&
                !loanNumber &&
                !transactionNumber
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Please provide a search value."
                });

            }


            // ----------------------------------------------------
            // BUILD SEARCH QUERY
            // ----------------------------------------------------

            let conditions = [];
            let values = [];


            if (memberNumber) {

                conditions.push(
                    "member_number LIKE ?"
                );

                values.push(
                    `%${memberNumber}%`
                );

            }


            if (memberName) {

                conditions.push(
                    "member_name LIKE ?"
                );

                values.push(
                    `%${memberName}%`
                );

            }


            if (loanNumber) {

                conditions.push(
                    "loan_number LIKE ?"
                );

                values.push(
                    `%${loanNumber}%`
                );

            }


            // IMPORTANT:
            // financial_records uses transaction_reference,
            // NOT transaction_number.

            if (transactionNumber) {

                conditions.push(
                    "transaction_reference LIKE ?"
                );

                values.push(
                    `%${transactionNumber}%`
                );

            }


            // ----------------------------------------------------
            // SEARCH DATABASE
            // ----------------------------------------------------

            const sql = `
                SELECT
                    id,
                    member_number AS memberNumber,
                    member_name AS memberName,
                    loan_number AS loanNumber,
                    loan_type AS loanType,
                    loan_amount AS loanAmount,
                    loan_date AS loanDate,
                    transaction_date AS transactionDate,
                    repayment_date AS repaymentDate,
                    maturity_date AS maturityDate,
                    transaction_reference AS transactionReference,
                    status
                FROM financial_records
                WHERE ${conditions.join(" OR ")}
                ORDER BY id DESC
            `;


            const [rows] = await db.query(
                sql,
                values
            );


            // ----------------------------------------------------
            // DETERMINE SEARCH TERM
            // ----------------------------------------------------

            const searchTerm =
                memberNumber ||
                memberName ||
                loanNumber ||
                transactionNumber;


            // ----------------------------------------------------
            // NO RESULTS
            // ----------------------------------------------------

            if (rows.length === 0) {

                // Save unsuccessful search in history

                await db.query(
                    `
                    INSERT INTO recovery_history
                    (
                        search_term,
                        result,
                        records_found,
                        searched_by
                    )
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        searchTerm,
                        "Not Found",
                        0,
                        req.user.id
                    ]
                );


                return res.status(404).json({
                    success: false,
                    message:
                        "No matching financial records were found.",
                    data: []
                });

            }


            // ----------------------------------------------------
            // SAVE SUCCESSFUL SEARCH TO HISTORY
            // ----------------------------------------------------

            const firstRecord = rows[0];

            await db.query(
                `
                INSERT INTO recovery_history
                (
                    search_term,
                    member_number,
                    member_name,
                    loan_number,
                    transaction_reference,
                    result,
                    records_found,
                    searched_by
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    searchTerm,
                    firstRecord.memberNumber,
                    firstRecord.memberName,
                    firstRecord.loanNumber,
                    firstRecord.transactionReference,
                    "Found",
                    rows.length,
                    req.user.id
                ]
            );


            // ----------------------------------------------------
            // RETURN RESULTS
            // ----------------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "Financial records found successfully.",

                data: rows

            });

        } catch (error) {

            console.error(
                "Recovery search error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to search financial records.",

                error: error.message

            });

        }

    }
);


// ============================================================
// GET RECOVERY DETAILS
// ============================================================
// GET /api/recovery/:id
//
// Example:
//
// /api/recovery/1
//
// ============================================================

router.get(
    "/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const { id } = req.params;


            // ----------------------------------------------------
            // VALIDATE ID
            // ----------------------------------------------------

            if (!id || isNaN(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A valid record ID is required."

                });

            }


            // ----------------------------------------------------
            // GET RECORD
            // ----------------------------------------------------

            const sql = `
                SELECT
                    id,
                    member_number AS memberNumber,
                    member_name AS memberName,
                    loan_number AS loanNumber,
                    loan_type AS loanType,
                    loan_amount AS loanAmount,
                    loan_date AS loanDate,
                    transaction_date AS transactionDate,
                    repayment_date AS repaymentDate,
                    maturity_date AS maturityDate,
                    transaction_reference AS transactionReference,
                    status
                FROM financial_records
                WHERE id = ?
                LIMIT 1
            `;


            const [rows] = await db.query(
                sql,
                [id]
            );


            // ----------------------------------------------------
            // RECORD NOT FOUND
            // ----------------------------------------------------

            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Financial record not found."

                });

            }


            // ----------------------------------------------------
            // RETURN RECORD
            // ----------------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "Financial record retrieved successfully.",

                data: rows[0]

            });

        } catch (error) {

            console.error(
                "Recovery details error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to retrieve recovery details.",

                error: error.message

            });

        }

    }
);


// ============================================================
// RECOVER DATES FOR A RECORD
// ============================================================
// GET /api/recovery/:id/dates
//
// Example:
//
// /api/recovery/1/dates
//
// This endpoint returns the financial dates and records the
// successful recovery in recovery_history.
// ============================================================

router.get(
    "/:id/dates",
    authenticateToken,
    async (req, res) => {

        try {

            const { id } = req.params;


            // ----------------------------------------------------
            // VALIDATE ID
            // ----------------------------------------------------

            if (!id || isNaN(id)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A valid record ID is required."

                });

            }


            // ----------------------------------------------------
            // GET FINANCIAL RECORD
            // ----------------------------------------------------

            const sql = `
                SELECT
                    id,
                    member_number AS memberNumber,
                    member_name AS memberName,
                    loan_number AS loanNumber,
                    loan_date AS loanDate,
                    transaction_date AS transactionDate,
                    repayment_date AS repaymentDate,
                    maturity_date AS maturityDate,
                    transaction_reference AS transactionReference,
                    status
                FROM financial_records
                WHERE id = ?
                LIMIT 1
            `;


            const [rows] = await db.query(
                sql,
                [id]
            );


            // ----------------------------------------------------
            // RECORD NOT FOUND
            // ----------------------------------------------------

            if (rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "No financial record found for recovery."

                });

            }


            const record = rows[0];


            // ----------------------------------------------------
            // SAVE RECOVERY ACTION
            // ----------------------------------------------------
            //
            // This records that the officer actually recovered
            // the dates for this financial record.
            //
            // ----------------------------------------------------

            await db.query(
                `
                INSERT INTO recovery_history
                (
                    search_term,
                    member_number,
                    member_name,
                    loan_number,
                    transaction_reference,
                    result,
                    records_found,
                    searched_by
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    record.memberNumber ||
                    record.loanNumber ||
                    record.transactionReference,

                    record.memberNumber,

                    record.memberName,

                    record.loanNumber,

                    record.transactionReference,

                    "Recovered",

                    1,

                    req.user.id
                ]
            );


            // ----------------------------------------------------
            // RETURN RECOVERED DATES
            // ----------------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "Financial dates recovered successfully.",

                data: {

                    recordId:
                        record.id,

                    memberNumber:
                        record.memberNumber,

                    memberName:
                        record.memberName,

                    loanNumber:
                        record.loanNumber,

                    transactionReference:
                        record.transactionReference,

                    loanDate:
                        record.loanDate,

                    transactionDate:
                        record.transactionDate,

                    repaymentDate:
                        record.repaymentDate,

                    maturityDate:
                        record.maturityDate,

                    status:
                        record.status

                }

            });

        } catch (error) {

            console.error(
                "Date recovery error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to recover financial dates.",

                error: error.message

            });

        }

    }
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;

