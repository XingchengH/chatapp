export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function respondWithError(res, error) {
  if (error instanceof HttpError)
    return res.status(error.status).json({ message: error.message });
  if (error?.code === 11000)
    return res
      .status(409)
      .json({ message: "An account with that email already exists" });
  console.error("Request failed:", error?.message);
  return res.status(500).json({ message: "Internal server error" });
}
