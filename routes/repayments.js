// ============================================================
// FINANCE DATE RECOVERY TOOL
// REPAYMENTS API
// routes/repayments.js
// ============================================================

"use strict";

const express = require("express");
const db = require("../config/database");

const router = express.Router();


// ============================================================
// GET ALL REPAYMENTS
// GET /api/repayments
// ============================================================

router.get("/", async (req, res) => {

    try {

        const {
            customer,
            loanNumber,
            referenceNumber,
            receiptNumber,
            amount,
            paymentMethod,
            dateFrom,
            dateTo
        } = req.query;


        // ----------------------------------------------------
        // BASE QUERY
        // ----------------------------------------------------

        let sql = `
            SELECT
                id,
                customer,
                loan_number,
                repayment_date,
                amount,
                payment_method,
                reference_number,
                receipt_number,
                balance,
                status,
                created_at,
                updated_at
            FROM public.repayments
            WHERE 1 = 1
        `;

        const values = [];


        // ----------------------------------------------------
        // CUSTOMER
        // ----------------------------------------------------

        if (customer) {

            values.push(`%${customer}%`);

            sql += `
                AND customer ILIKE $${values.length}
            `;
        }


        // ----------------------------------------------------
        // LOAN NUMBER
        // ----------------------------------------------------

        if (loanNumber) {

            values.push(`%${loanNumber}%`);

            sql += `
                AND loan_number ILIKE $${values.length}
            `;
        }


        // ----------------------------------------------------
        // REFERENCE NUMBER
        // ----------------------------------------------------

        if (referenceNumber) {

            values.push(`%${referenceNumber}%`);

            sql += `
                AND reference_number ILIKE $${values.length}
            `;
        }


        // ----------------------------------------------------
        // RECEIPT NUMBER
        // ----------------------------------------------------

        if (receiptNumber) {

            values.push(`%${receiptNumber}%`);

            sql += `
                AND receipt_number ILIKE $${values.length}
            `;
        }


        // ----------------------------------------------------
        // AMOUNT
        // ----------------------------------------------------

        if (amount !== undefined && amount !== "") {

            values.push(amount);

            sql += `
                AND amount = $${values.length}
            `;
        }


        // ----------------------------------------------------
        // PAYMENT METHOD
        // ----------------------------------------------------

        if (paymentMethod) {

            values.push(paymentMethod);

            sql += `
                AND payment_method = $${values.length}
            `;
        }


        // ----------------------------------------------------
        // DATE FROM
        // ----------------------------------------------------

        if (dateFrom) {

            values.push(dateFrom);

            sql += `
                AND repayment_date >= $${values.length}
            `;
        }


        // ----------------------------------------------------
        // DATE TO
        // ----------------------------------------------------

        if (dateTo) {

            values.push(dateTo);

            sql += `
                AND repayment_date <= $${values.length}
            `;
        }


        // ----------------------------------------------------
        // ORDER
        // ----------------------------------------------------

        sql += `
            ORDER BY
                repayment_date DESC NULLS LAST,
                id DESC
        `;


        // ----------------------------------------------------
        // EXECUTE QUERY
        // ----------------------------------------------------

        const result = await db.query(sql, values);


        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(200).json({

            success: true,

            data: result.rows

        });

    } catch (error) {

        console.error(
            "GET REPAYMENTS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load repayment records."

        });
    }

});


// ============================================================
// GET SINGLE REPAYMENT
// GET /api/repayments/:id
// ============================================================

router.get("/:id", async (req, res) => {

    try {

        const { id } = req.params;


        const result = await db.query(
            `
            SELECT
                id,
                customer,
                loan_number,
                repayment_date,
                amount,
                payment_method,
                reference_number,
                receipt_number,
                balance,
                status,
                created_at,
                updated_at
            FROM public.repayments
            WHERE id = $1
            `,
            [id]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Repayment record not found."

            });

        }


        return res.status(200).json({

            success: true,

            data: result.rows[0]

        });

    } catch (error) {

        console.error(
            "GET SINGLE REPAYMENT ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load repayment record."

        });
    }

});


// ============================================================
// CREATE REPAYMENT
// POST /api/repayments
// ============================================================

router.post("/", async (req, res) => {

    try {

        const {
            customer,
            loan_number,
            repayment_date,
            amount,
            payment_method,
            reference_number,
            receipt_number,
            balance,
            status
        } = req.body;


        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!customer || !loan_number) {

            return res.status(400).json({

                success: false,

                message:
                    "Customer and loan number are required."

            });

        }


        // ----------------------------------------------------
        // INSERT
        // ----------------------------------------------------

        const result = await db.query(
            `
            INSERT INTO public.repayments (
                customer,
                loan_number,
                repayment_date,
                amount,
                payment_method,
                reference_number,
                receipt_number,
                balance,
                status
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9
            )
            RETURNING
                id,
                customer,
                loan_number,
                repayment_date,
                amount,
                payment_method,
                reference_number,
                receipt_number,
                balance,
                status,
                created_at,
                updated_at
            `,
            [
                customer,
                loan_number,
                repayment_date || null,
                amount || 0,
                payment_method || null,
                reference_number || null,
                receipt_number || null,
                balance || 0,
                status || "Unverified"
            ]
        );


        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "Repayment created successfully.",

            data: result.rows[0]

        });

    } catch (error) {

        console.error(
            "CREATE REPAYMENT ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to create repayment record."

        });
    }

});


// ============================================================
// UPDATE REPAYMENT
// PUT /api/repayments/:id
// ============================================================

router.put("/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            customer,
            loan_number,
            repayment_date,
            amount,
            payment_method,
            reference_number,
            receipt_number,
            balance,
            status
        } = req.body;


        // ----------------------------------------------------
        // CHECK RECORD
        // ----------------------------------------------------

        const existing = await db.query(
            `
            SELECT id
            FROM public.repayments
            WHERE id = $1
            `,
            [id]
        );


        if (existing.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Repayment record not found."

            });

        }


        // ----------------------------------------------------
        // UPDATE
        // ----------------------------------------------------

        const result = await db.query(
            `
            UPDATE public.repayments
            SET
                customer = $1,
                loan_number = $2,
                repayment_date = $3,
                amount = $4,
                payment_method = $5,
                reference_number = $6,
                receipt_number = $7,
                balance = $8,
                status = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING
                id,
                customer,
                loan_number,
                repayment_date,
                amount,
                payment_method,
                reference_number,
                receipt_number,
                balance,
                status,
                created_at,
                updated_at
            `,
            [
                customer,
                loan_number,
                repayment_date || null,
                amount || 0,
                payment_method || null,
                reference_number || null,
                receipt_number || null,
                balance || 0,
                status || "Unverified",
                id
            ]
        );


        return res.status(200).json({

            success: true,

            message:
                "Repayment updated successfully.",

            data: result.rows[0]

        });

    } catch (error) {

        console.error(
            "UPDATE REPAYMENT ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to update repayment record."

        });
    }

});


// ============================================================
// DELETE REPAYMENT
// DELETE /api/repayments/:id
// ============================================================

router.delete("/:id", async (req, res) => {

    try {

        const { id } = req.params;


        // ----------------------------------------------------
        // DELETE
        // ----------------------------------------------------

        const result = await db.query(
            `
            DELETE FROM public.repayments
            WHERE id = $1
            `,
            [id]
        );


        // ----------------------------------------------------
        // CHECK IF RECORD EXISTED
        // ----------------------------------------------------

        if (result.rowCount === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Repayment record not found."

            });

        }


        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                "Repayment deleted successfully."

        });

    } catch (error) {

        console.error(
            "DELETE REPAYMENT ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to delete repayment record."

        });
    }

});


module.exports = router;