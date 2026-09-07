
"use strict";

const express = require("express");
const db = require("../config/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


// ============================================================
// FINANCE DATE RECOVERY TOOL
// DASHBOARD ROUTES
// routes/dashboard.js
// ============================================================


// ============================================================
// GET DASHBOARD
// GET /api/dashboard
// ============================================================

router.get(
    "/dashboard",
    authenticateToken,
    async (req, res) => {

        try {

            /*
             * ========================================================
             * RUN ALL INDEPENDENT DATABASE QUERIES AT THE SAME TIME
             * ========================================================
             *
             * Previously, each query used "await" separately.
             * That meant:
             *
             * Query 1 → wait
             * Query 2 → wait
             * Query 3 → wait
             * Query 4 → wait
             * Query 5 → wait
             * Query 6 → wait
             * Query 7 → wait
             *
             * Promise.all() allows PostgreSQL to process the
             * independent queries concurrently.
             */

            const [
                totalRecordsResult,
                uploadedFilesResult,
                recoveredRecordsResult,
                pendingRecordsResult,
                recentUploadsResult,
                recentSearchesResult,
                recentRecordsResult
            ] = await Promise.all([

                // ----------------------------------------------------
                // 1. TOTAL FINANCIAL RECORDS
                // ----------------------------------------------------

                db.query(`
                    SELECT COUNT(*) AS "totalRecords"
                    FROM public.financial_records
                `),


                // ----------------------------------------------------
                // 2. TOTAL UPLOADED FILES
                // ----------------------------------------------------

                db.query(`
                    SELECT COUNT(*) AS "uploadedFiles"
                    FROM public.uploaded_files
                `),


                // ----------------------------------------------------
                // 3. TOTAL RECOVERED RECORDS
                //
                // Recovery is recorded in recovery_history
                // with result = 'Recovered'
                // ----------------------------------------------------

                db.query(`
                    SELECT COUNT(*) AS "recoveredRecords"
                    FROM public.recovery_history
                    WHERE result = 'Recovered'
                `),


                // ----------------------------------------------------
                // 4. TOTAL PENDING RECORDS
                // ----------------------------------------------------

                db.query(`
                    SELECT COUNT(*) AS "pendingRecords"
                    FROM public.financial_records
                    WHERE status = 'Pending'
                `),


                // ----------------------------------------------------
                // 5. RECENT UPLOADS
                // ----------------------------------------------------

                db.query(`
                    SELECT
                        uf.id,
                        uf.file_name,
                        uf.records,
                        uf.file_type,
                        uf.file_size,
                        uf.status,

                        TO_CHAR(
                            uf.upload_date,
                            'YYYY-MM-DD HH24:MI:SS'
                        ) AS date,

                        COALESCE(
                            u.username,
                            'Unknown'
                        ) AS "user",

                        COALESCE(
                            u.name,
                            'Unknown'
                        ) AS user_name

                    FROM public.uploaded_files uf

                    LEFT JOIN public.users u
                        ON uf.uploaded_by = u.id

                    ORDER BY uf.upload_date DESC

                    LIMIT 5
                `),


                // ----------------------------------------------------
                // 6. RECENT RECOVERY SEARCHES
                // ----------------------------------------------------

                db.query(`
                    SELECT
                        rh.id,

                        rh.search_term,

                        COALESCE(
                            rh.member_number,
                            ''
                        ) AS member_number,

                        COALESCE(
                            rh.member_name,
                            ''
                        ) AS member_name,

                        COALESCE(
                            rh.loan_number,
                            ''
                        ) AS loan_number,

                        COALESCE(
                            rh.transaction_reference,
                            ''
                        ) AS transaction_reference,

                        COALESCE(
                            rh.result,
                            'No result'
                        ) AS result,

                        COALESCE(
                            rh.records_found,
                            0
                        ) AS records_found,

                        COALESCE(
                            u.username,
                            'Unknown'
                        ) AS "user",

                        COALESCE(
                            u.name,
                            'Unknown'
                        ) AS user_name,

                        TO_CHAR(
                            rh.search_date,
                            'YYYY-MM-DD'
                        ) AS date,

                        TO_CHAR(
                            rh.search_date,
                            'HH24:MI:SS'
                        ) AS time,

                        rh.search_date

                    FROM public.recovery_history rh

                    LEFT JOIN public.users u
                        ON rh.searched_by = u.id

                    ORDER BY rh.search_date DESC

                    LIMIT 5
                `),


                // ----------------------------------------------------
                // 7. RECENT FINANCIAL RECORDS
                // ----------------------------------------------------

                db.query(`
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
                        created_at

                    FROM public.financial_records

                    ORDER BY created_at DESC

                    LIMIT 5
                `)

            ]);


            // ========================================================
            // EXTRACT RESULTS
            // ========================================================

            const totalRecords =
                Number(
                    totalRecordsResult.rows[0]?.totalRecords || 0
                );


            const uploadedFiles =
                Number(
                    uploadedFilesResult.rows[0]?.uploadedFiles || 0
                );


            const recoveredRecords =
                Number(
                    recoveredRecordsResult.rows[0]?.recoveredRecords || 0
                );


            const pendingRecords =
                Number(
                    pendingRecordsResult.rows[0]?.pendingRecords || 0
                );


            const recentUploads =
                recentUploadsResult.rows || [];


            const recentSearches =
                recentSearchesResult.rows || [];


            const recentRecords =
                recentRecordsResult.rows || [];


            // ========================================================
            // SEND RESPONSE
            // ========================================================

            return res.status(200).json({

                success: true,

                message:
                    "Dashboard data loaded successfully.",

                data: {

                    totalRecords,

                    uploadedFiles,

                    recoveredRecords,

                    pendingRecords,

                    recentUploads,

                    recentSearches,

                    recentRecords

                }

            });


        } catch (error) {

            // ========================================================
            // ERROR HANDLING
            // ========================================================

            console.error(
                "Dashboard error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load dashboard data."

            });

        }

    }
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;

