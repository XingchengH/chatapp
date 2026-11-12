import multer from "multer";
import { HttpError } from "../lib/errors.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 3, fieldSize: 12000 },
  fileFilter: (_req, file, done) => {
    if (
      ![
        "audio/webm",
        "audio/ogg",
        "audio/mp4",
        "audio/mpeg",
        "audio/wav",
        "video/webm",
      ].includes(file.mimetype)
    )
      return done(new HttpError(400, "Choose a supported audio recording"));
    done(null, true);
  },
}).single("audio");

export function audioUpload(req, res, next) {
  upload(req, res, (error) => {
    if (error)
      return res
        .status(400)
        .json({
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "Audio must be no larger than 10 MB"
              : error.message,
        });
    if (!req.file)
      return res
        .status(400)
        .json({ message: "An audio recording is required" });
    next();
  });
}
