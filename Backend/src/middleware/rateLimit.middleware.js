import rateLimit from "express-rate-limit";

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json(options.message);
    },
  });

export const authRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: "Too many auth requests. Please wait a few minutes and try again.",
});

export const aiMessageRateLimit = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: "Too many AI requests. Please slow down and try again shortly.",
});
