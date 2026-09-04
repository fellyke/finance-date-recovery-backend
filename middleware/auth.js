
// ============================================================
// FINANCE DATE RECOVERY TOOL
// middleware/auth.js
// JWT AUTHENTICATION MIDDLEWARE
// ============================================================

const jwt = require("jsonwebtoken");


// ============================================================
// JWT SECRET
// ============================================================

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "finance_date_recovery_secret";


// ============================================================
// AUTHENTICATE TOKEN
// ============================================================

function authenticateToken(req, res, next) {

    try {

        // ----------------------------------------------------
        // GET AUTHORIZATION HEADER
        // ----------------------------------------------------

        const authHeader =
            req.headers.authorization;


        // ----------------------------------------------------
        // CHECK FOR TOKEN
        // ----------------------------------------------------

        if (!authHeader) {

            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            });

        }


        // ----------------------------------------------------
        // CHECK BEARER FORMAT
        // ----------------------------------------------------

        if (!authHeader.startsWith("Bearer ")) {

            return res.status(401).json({
                success: false,
                message: "Invalid authorization format."
            });

        }


        // ----------------------------------------------------
        // EXTRACT TOKEN
        // ----------------------------------------------------

        const token =
            authHeader.split(" ")[1];


        if (!token) {

            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            });

        }


        // ----------------------------------------------------
        // VERIFY TOKEN
        // ----------------------------------------------------

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );


        // ----------------------------------------------------
        // SAVE USER INFORMATION
        // ----------------------------------------------------

        req.user = decoded;


        // ----------------------------------------------------
        // CONTINUE TO API
        // ----------------------------------------------------

        next();


    } catch (error) {

        console.error(
            "Authentication error:",
            error.message
        );


        // ----------------------------------------------------
        // TOKEN EXPIRED
        // ----------------------------------------------------

        if (error.name === "TokenExpiredError") {

            return res.status(401).json({
                success: false,
                message: "Token has expired."
            });

        }


        // ----------------------------------------------------
        // INVALID TOKEN
        // ----------------------------------------------------

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });

    }

}


module.exports = authenticateToken;

