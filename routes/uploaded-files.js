
"use strict";

const express = require("express");
const db = require("../config/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


// ============================================================
// GET UPLOADED FILES
// GET /api/uploaded-files
// ============================================================

router.get(
    "/uploaded-files",
    authenticateToken,
    async (req, res) => {

        try {

            // ----------------------------------------------------
            // GET UPLOADED FILES
            // ----------------------------------------------------

            const [files] = await db.query(`
                SELECT
                    uf.id,

                    uf.file_name,

                    uf.file_path,

                    uf.file_type,

                    uf.file_size,

                    uf.records,

                    uf.status,

                    uf.description,

                    uf.uploaded_by,

                    DATE_FORMAT(
                        uf.upload_date,
                        '%Y-%m-%d %H:%i:%s'
                    ) AS upload_date,

                    COALESCE(
                        u.username,
                        'Unknown'
                    ) AS username,

                    COALESCE(
                        u.name,
                        'Unknown'
                    ) AS user_name

                FROM uploaded_files uf

                LEFT JOIN users u
                    ON uf.uploaded_by = u.id

                ORDER BY
                    uf.upload_date DESC

                LIMIT 100
            `);


            // ----------------------------------------------------
            // SUCCESS RESPONSE
            // ----------------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "Uploaded files loaded successfully.",

                data: files

            });


        } catch (error) {

            // ----------------------------------------------------
            // ERROR
            // ----------------------------------------------------

            console.error(
                "Uploaded files error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load uploaded files."

            });
        }
    }
);


module.exports = router;

