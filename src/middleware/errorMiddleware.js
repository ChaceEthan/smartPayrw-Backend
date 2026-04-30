export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: Object.values(err.errors)
        .map((error) => error.message)
        .join(", "),
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid resource identifier" });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: "Resource already exists" });
  }

  res.status(statusCode).json({
    message: err.message || "Server error",
    ...(process.env.NODE_ENV === "production" ? {} : { stack: err.stack }),
  });
};
