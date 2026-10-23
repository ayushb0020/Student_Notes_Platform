export function notFound(req, res, _next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(err, _req, res, _next) {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  if (err.name === "MulterError") return res.status(400).json({ message: err.message });
  res.status(err.status || 500).json({ message: err.message || "Internal server error." });
}
