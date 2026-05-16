import { body, validationResult } from "express-validator";


export function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array();
        return res.status(400).json({
            message: formattedErrors[0]?.msg || "Validation failed",
            errors: formattedErrors,
            success: false,
        });
    }
    next();
}

export const registerValidator = [
    body("username")
        .trim()
        .notEmpty().withMessage("Username is required")
        .isLength({ min: 3, max: 30 }).withMessage("Username must be between 3 and 30 characters")
        .matches(/^[a-zA-Z0-9_]+$/).withMessage("Username can only contain letters, numbers, and underscores"),

    body("email")
        .trim()
        .normalizeEmail()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email"),

    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),

    validate
];

export const loginValidator = [
    body("email")
        .trim()
        .normalizeEmail()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email"),

    body("password")
        .notEmpty().withMessage("Password is required"),

    validate
];

export const forgotPasswordValidator = [
    body("email")
        .trim()
        .normalizeEmail()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please provide a valid email"),

    validate
];

export const resetPasswordValidator = [
    body("token")
        .trim()
        .notEmpty().withMessage("Reset token is required"),

    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
        .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/).withMessage("Password must include letters and numbers"),

    body("confirmPassword")
        .notEmpty().withMessage("Confirm password is required")
        .custom((value, { req }) => value === req.body.password)
        .withMessage("Passwords do not match"),

    validate
];

