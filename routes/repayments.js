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
    created_at
    FROM repayments
        `;

        const values = [];


        // ----------------------------------------------------
        // CUSTOMER
        // ----------------------------------------------------

        if (customer) {

            sql += `
                AND customer LIKE ?
            `;

            values.push(`%${customer}%`);
        }


        // ----------------------------------------------------
        // LOAN NUMBER
        // ----------------------------------------------------

        if (loanNumber) {

            sql += `
                AND loan_number LIKE ?
            `;

            values.push(`%${loanNumber}%`);
        }


        // ----------------------------------------------------
        // REFERENCE NUMBER
        // ----------------------------------------------------

        if (referenceNumber) {

            sql += `
                AND reference_number LIKE ?
            `;

            values.push(`%${referenceNumber}%`);
        }


        // ----------------------------------------------------
        // RECEIPT NUMBER
        // ----------------------------------------------------

        if (receiptNumber) {

            sql += `
                AND receipt_number LIKE ?
            `;

            values.push(`%${receiptNumber}%`);
        }


        // ----------------------------------------------------
        // AMOUNT
        // ----------------------------------------------------

        if (amount) {

            sql += `
                AND amount = ?
            `;

            values.push(amount);
        }


        // ----------------------------------------------------
        // PAYMENT METHOD
        // ----------------------------------------------------

        if (paymentMethod) {

            sql += `
                AND payment_method = ?
            `;

            values.push(paymentMethod);
        }


        // ----------------------------------------------------
        // DATE FROM
        // ----------------------------------------------------

        if (dateFrom) {

            sql += `
                AND repayment_date >= ?
            `;

            values.push(dateFrom);
        }


        // ----------------------------------------------------
        // DATE TO
        // ----------------------------------------------------

        if (dateTo) {

            sql += `
                AND repayment_date <= ?
            `;

            values.push(dateTo);
        }


        // ----------------------------------------------------
        // ORDER
        // ----------------------------------------------------

        sql += `
            ORDER BY repayment_date DESC, id DESC
        `;


        // ----------------------------------------------------
        // EXECUTE QUERY
        // ----------------------------------------------------

        const [rows] = await db.execute(sql, values);


        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {

        console.error(
            "GET REPAYMENTS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load repayment records."
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


        const [rows] = await db.execute(
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
            FROM repayments
            WHERE id = ?
            `,
            [id]
        );


        if (rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Repayment record not found."
            });

        }


        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {

        console.error(
            "GET SINGLE REPAYMENT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load repayment record."
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
                message: "Customer and loan number are required."
            });

        }


        // ----------------------------------------------------
        // INSERT
        // ----------------------------------------------------

        const [result] = await db.execute(
            `
            INSERT INTO repayments (
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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

        res.status(201).json({
            success: true,
            message: "Repayment created successfully.",
            data: {
                id: result.insertId
            }
        });

    } catch (error) {

        console.error(
            "CREATE REPAYMENT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to create repayment record."
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

        const [existing] = await db.execute(
            `
            SELECT id
            FROM repayments
            WHERE id = ?
            `,
            [id]
        );


        if (existing.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Repayment record not found."
            });

        }


        // ----------------------------------------------------
        // UPDATE
        // ----------------------------------------------------

        await db.execute(
            `
            UPDATE repayments
            SET
                customer = ?,
                loan_number = ?,
                repayment_date = ?,
                amount = ?,
                payment_method = ?,
                reference_number = ?,
                receipt_number = ?,
                balance = ?,
                status = ?
            WHERE id = ?
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


        res.json({
            success: true,
            message: "Repayment updated successfully."
        });

    } catch (error) {

        console.error(
            "UPDATE REPAYMENT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to update repayment record."
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


        const [result] = await db.execute(
            `
            DELETE FROM repayments
            WHERE id = ?
            `,
            [id]
        );


        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                message: "Repayment record not found."
            });

        }


        res.json({
            success: true,
            message: "Repayment deleted successfully."
        });

    } catch (error) {

        console.error(
            "DELETE REPAYMENT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to delete repayment record."
        });
    }

});


module.exports = router;