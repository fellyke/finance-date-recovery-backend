// ============================================================
// FINANCE DATE RECOVERY TOOL
// BACKEND - UPLOAD ROUTE
// routes/upload.js
//
// Handles:
// 1. Financial Records uploads
// 2. Repayment uploads
// PostgreSQL / Supabase version
// ============================================================

"use strict";

const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const db = require("../config/database");

const router = express.Router();


// ============================================================
// UPLOAD FOLDER
// ============================================================

const uploadFolder = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, {
        recursive: true
    });
}


// ============================================================
// MULTER CONFIGURATION
// ============================================================

const upload = multer({

    dest: uploadFolder,

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowedExtensions = [
            ".xlsx",
            ".xls",
            ".csv"
        ];

        const extension = path
            .extname(file.originalname)
            .toLowerCase();

        if (allowedExtensions.includes(extension)) {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "Only Excel (.xlsx, .xls) and CSV files are allowed."
                )
            );
        }
    }
});


// ============================================================
// CONVERT EXCEL DATE
// ============================================================

function convertExcelDate(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }


    // JavaScript Date

    if (value instanceof Date) {

        if (isNaN(value.getTime())) {
            return null;
        }

        return value
            .toISOString()
            .split("T")[0];
    }


    // Excel serial number

    if (typeof value === "number") {

        try {

            const date =
                XLSX.SSF.parse_date_code(value);

            if (date) {

                const year =
                    String(date.y);

                const month =
                    String(date.m).padStart(2, "0");

                const day =
                    String(date.d).padStart(2, "0");

                return `${year}-${month}-${day}`;
            }

        } catch (error) {

            console.error(
                "Excel date conversion error:",
                error
            );
        }

        return null;
    }


    // String date

    if (typeof value === "string") {

        const trimmed =
            value.trim();

        if (!trimmed) {
            return null;
        }


        // YYYY-MM-DD

        if (
            /^\d{4}-\d{2}-\d{2}$/.test(
                trimmed
            )
        ) {

            return trimmed;
        }


        const date =
            new Date(trimmed);

        if (!isNaN(date.getTime())) {

            return date
                .toISOString()
                .split("T")[0];
        }

        return null;
    }


    return null;
}


// ============================================================
// CONVERT NUMBER
// ============================================================

function convertNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }


    if (typeof value === "number") {

        return isNaN(value)
            ? 0
            : value;
    }


    const cleaned =
        String(value)
            .replace(/,/g, "")
            .replace(/KES/gi, "")
            .trim();


    const number =
        Number(cleaned);


    return isNaN(number)
        ? 0
        : number;
}


// ============================================================
// GET VALUE FROM ROW
// ============================================================

function getRowValue(row, columnName) {

    if (
        Object.prototype.hasOwnProperty.call(
            row,
            columnName
        )
    ) {

        return row[columnName];
    }

    return "";
}


// ============================================================
// NORMALIZE STATUS
// ============================================================

function normalizeStatus(value) {

    const status =
        String(value || "")
            .trim()
            .toLowerCase();


    if (status === "verified") {
        return "Verified";
    }


    return "Unverified";
}


// ============================================================
// CHECK REQUIRED COLUMNS
// ============================================================

function validateColumns(
    rows,
    requiredColumns
) {

    if (!rows || rows.length === 0) {

        return {
            valid: false,
            missing: requiredColumns
        };
    }


    const actualColumns =
        Object.keys(rows[0]);


    const normalizedActual =
        actualColumns.map(
            column =>
                String(column)
                    .trim()
                    .toLowerCase()
        );


    const missing =
        requiredColumns.filter(
            requiredColumn =>
                !normalizedActual.includes(
                    requiredColumn
                        .trim()
                        .toLowerCase()
                )
        );


    return {
        valid: missing.length === 0,
        missing
    };
}


// ============================================================
// POST /api/upload
// ============================================================

router.post(
    "/upload",
    upload.single("excelFile"),
    async (req, res) => {

        let client = null;

        try {

            // ==================================================
            // CHECK FILE
            // ==================================================

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select an Excel or CSV file."

                });
            }


            console.log(
                "-----------------------------------------"
            );

            console.log(
                "UPLOAD REQUEST"
            );

            console.log(
                "File:",
                req.file.originalname
            );

            console.log(
                "Upload Type:",
                req.body.uploadType
            );

            console.log(
                "-----------------------------------------"
            );


            // ==================================================
            // GET UPLOAD TYPE
            // ==================================================

            const uploadType =
                String(
                    req.body.uploadType || ""
                ).trim();


            if (
                uploadType !== "financial_records" &&
                uploadType !== "repayments"
            ) {

                throw new Error(
                    "Please select a valid upload type."
                );
            }


            // ==================================================
            // READ EXCEL / CSV
            // ==================================================

            const workbook =
                XLSX.readFile(
                    req.file.path,
                    {
                        cellDates: true
                    }
                );


            if (
                !workbook.SheetNames ||
                workbook.SheetNames.length === 0
            ) {

                throw new Error(
                    "The uploaded file does not contain a worksheet."
                );
            }


            const sheet =
                workbook.Sheets[
                    workbook.SheetNames[0]
                ];


            const rows =
                XLSX.utils.sheet_to_json(
                    sheet,
                    {
                        defval: "",
                        raw: true
                    }
                );


            // ==================================================
            // CHECK RECORDS
            // ==================================================

            if (rows.length === 0) {

                throw new Error(
                    "The uploaded Excel file contains no records."
                );
            }


            console.log(
                `Records found: ${rows.length}`
            );


            // ==================================================
            // REQUIRED COLUMNS
            // ==================================================

            const financialRecordColumns = [

                "Member Number",
                "Member Name",
                "Loan Number",
                "Loan Type",
                "Loan Amount",
                "Loan Date",
                "Repayment Date",
                "Maturity Date",
                "Transaction Date",
                "Transaction Reference",
                "Status"

            ];


            const repaymentColumns = [

                "Customer",
                "Loan Number",
                "Repayment Date",
                "Amount",
                "Payment Method",
                "Reference Number",
                "Receipt Number",
                "Balance",
                "Status"

            ];


            const requiredColumns =
                uploadType === "financial_records"
                    ? financialRecordColumns
                    : repaymentColumns;


            // ==================================================
            // VALIDATE COLUMNS
            // ==================================================

            const columnValidation =
                validateColumns(
                    rows,
                    requiredColumns
                );


            if (!columnValidation.valid) {

                throw new Error(
                    `Missing required column(s): ${columnValidation.missing.join(", ")}`
                );
            }


            // ==================================================
            // GET POSTGRESQL CLIENT
            // ==================================================

            client = await db.connect();


            // ==================================================
            // START TRANSACTION
            // ==================================================

            await client.query("BEGIN");


            console.log(
                "PostgreSQL transaction started."
            );


            // ==================================================
            // SAVE UPLOADED FILE
            // ==================================================

            const fileResult =
                await client.query(

                    `
                    INSERT INTO public.uploaded_files
                    (
                        file_name,
                        file_path,
                        file_type,
                        file_size,
                        records,
                        status,
                        description
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7
                    )
                    RETURNING id
                    `,

                    [
                        req.file.originalname,
                        req.file.path,
                        req.file.mimetype,
                        req.file.size,
                        rows.length,
                        "Completed",
                        req.body.description || null
                    ]
                );


            const uploadedFileId =
                fileResult.rows[0].id;


            console.log(
                "Uploaded file ID:",
                uploadedFileId
            );


            // ==================================================
            // FINANCIAL RECORDS
            // ==================================================

            if (
                uploadType === "financial_records"
            ) {

                console.log(
                    "Processing Financial Records..."
                );


                for (
                    const row of rows
                ) {

                    const memberNumber =
                        getRowValue(
                            row,
                            "Member Number"
                        );


                    const memberName =
                        getRowValue(
                            row,
                            "Member Name"
                        );


                    const loanNumber =
                        getRowValue(
                            row,
                            "Loan Number"
                        );


                    const loanType =
                        getRowValue(
                            row,
                            "Loan Type"
                        );


                    const loanAmount =
                        convertNumber(
                            getRowValue(
                                row,
                                "Loan Amount"
                            )
                        );


                    const loanDate =
                        convertExcelDate(
                            getRowValue(
                                row,
                                "Loan Date"
                            )
                        );


                    const repaymentDate =
                        convertExcelDate(
                            getRowValue(
                                row,
                                "Repayment Date"
                            )
                        );


                    const maturityDate =
                        convertExcelDate(
                            getRowValue(
                                row,
                                "Maturity Date"
                            )
                        );


                    const transactionDate =
                        convertExcelDate(
                            getRowValue(
                                row,
                                "Transaction Date"
                            )
                        );


                    const transactionReference =
                        getRowValue(
                            row,
                            "Transaction Reference"
                        );


                    const status =
                        normalizeStatus(
                            getRowValue(
                                row,
                                "Status"
                            )
                        );


                    await client.query(

                        `
                        INSERT INTO public.financial_records
                        (
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
                            uploaded_file_id
                        )
                        VALUES
                        (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6,
                            $7,
                            $8,
                            $9,
                            $10,
                            $11,
                            $12
                        )
                        `,

                        [
                            memberNumber || null,
                            memberName || null,
                            loanNumber || null,
                            loanType || null,
                            loanAmount,
                            loanDate,
                            repaymentDate,
                            maturityDate,
                            transactionDate,
                            transactionReference || null,
                            status,
                            uploadedFileId
                        ]
                    );
                }


                console.log(
                    "Financial records imported successfully."
                );
            }


            // ==================================================
            // REPAYMENTS
            // ==================================================

            if (
                uploadType === "repayments"
            ) {

                console.log(
                    "Processing Repayments..."
                );


                for (
                    const row of rows
                ) {

                    const customer =
                        getRowValue(
                            row,
                            "Customer"
                        );


                    const loanNumber =
                        getRowValue(
                            row,
                            "Loan Number"
                        );


                    const repaymentDate =
                        convertExcelDate(
                            getRowValue(
                                row,
                                "Repayment Date"
                            )
                        );


                    const amount =
                        convertNumber(
                            getRowValue(
                                row,
                                "Amount"
                            )
                        );


                    const paymentMethod =
                        getRowValue(
                            row,
                            "Payment Method"
                        );


                    const referenceNumber =
                        getRowValue(
                            row,
                            "Reference Number"
                        );


                    const receiptNumber =
                        getRowValue(
                            row,
                            "Receipt Number"
                        );


                    const balance =
                        convertNumber(
                            getRowValue(
                                row,
                                "Balance"
                            )
                        );


                    const status =
                        normalizeStatus(
                            getRowValue(
                                row,
                                "Status"
                            )
                        );


                    // ==================================================
                    // FIND FINANCIAL RECORD
                    // ==================================================

                    let financialRecordId = null;


                    if (
                        loanNumber !== null &&
                        loanNumber !== undefined &&
                        String(loanNumber).trim() !== ""
                    ) {

                        const financialResult =
                            await client.query(

                                `
                                SELECT id
                                FROM public.financial_records
                                WHERE loan_number = $1
                                ORDER BY id DESC
                                LIMIT 1
                                `,

                                [
                                    String(
                                        loanNumber
                                    ).trim()
                                ]
                            );


                        if (
                            financialResult.rows.length > 0
                        ) {

                            financialRecordId =
                                financialResult.rows[0].id;
                        }
                    }


                    // ==================================================
                    // INSERT REPAYMENT
                    // ==================================================

                    await client.query(

                        `
                        INSERT INTO public.repayments
                        (
                            customer,
                            loan_number,
                            repayment_date,
                            amount,
                            payment_method,
                            reference_number,
                            receipt_number,
                            balance,
                            status,
                            financial_record_id
                        )
                        VALUES
                        (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6,
                            $7,
                            $8,
                            $9,
                            $10
                        )
                        `,

                        [
                            customer || null,
                            loanNumber || null,
                            repaymentDate,
                            amount,
                            paymentMethod || null,
                            referenceNumber || null,
                            receiptNumber || null,
                            balance,
                            status,
                            financialRecordId
                        ]
                    );
                }


                console.log(
                    "Repayments imported successfully."
                );
            }


            // ==================================================
            // COMMIT TRANSACTION
            // ==================================================

            await client.query("COMMIT");


            console.log(
                "PostgreSQL transaction committed."
            );


            // ==================================================
            // SUCCESS RESPONSE
            // ==================================================

            return res.status(201).json({

                success: true,

                message:
                    uploadType === "repayments"
                        ? "Repayment file uploaded successfully."
                        : "Financial records file uploaded successfully.",

                data: {

                    fileId:
                        uploadedFileId,

                    fileName:
                        req.file.originalname,

                    records:
                        rows.length,

                    uploadType:
                        uploadType

                }

            });


        } catch (error) {

            // ==================================================
            // ERROR
            // ==================================================

            console.error(
                "UPLOAD ERROR:",
                error
            );


            // ==================================================
            // ROLLBACK
            // ==================================================

            if (client) {

                try {

                    await client.query("ROLLBACK");

                    console.log(
                        "PostgreSQL transaction rolled back."
                    );

                } catch (rollbackError) {

                    console.error(
                        "ROLLBACK ERROR:",
                        rollbackError
                    );
                }
            }


            // ==================================================
            // DELETE FAILED UPLOAD FILE
            // ==================================================

            if (
                req.file &&
                req.file.path &&
                fs.existsSync(
                    req.file.path
                )
            ) {

                try {

                    fs.unlinkSync(
                        req.file.path
                    );

                } catch (deleteError) {

                    console.error(
                        "FILE DELETE ERROR:",
                        deleteError
                    );
                }
            }


            // ==================================================
            // SEND ERROR
            // ==================================================

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to process the uploaded file."

            });

        } finally {

            // ==================================================
            // RELEASE POSTGRESQL CLIENT
            // ==================================================

            if (client) {

                client.release();

            }
        }
    }
);


// ============================================================
// MULTER / UPLOAD ERROR HANDLER
// ============================================================

router.use(
    (error, req, res, next) => {

        console.error(
            "Upload middleware error:",
            error
        );


        // ----------------------------------------------------
        // FILE TOO LARGE
        // ----------------------------------------------------

        if (
            error instanceof multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "File is too large. Maximum size is 10 MB."

                });
            }


            return res.status(400).json({

                success: false,

                message:
                    error.message

            });
        }


        // ----------------------------------------------------
        // OTHER UPLOAD ERRORS
        // ----------------------------------------------------

        return res.status(400).json({

            success: false,

            message:
                error.message ||
                "File upload failed."

        });
    }
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;