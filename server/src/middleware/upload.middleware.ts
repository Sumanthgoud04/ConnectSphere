import multer from "multer";
import path from "node:path";
import fs from "node:fs";

const uploadDirectory = path.resolve("uploads");

// Create uploads directory if it doesn't exist.
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1_000_000_000,
    )}${extension}`;

    cb(null, uniqueName);
  },
});

// Only allow common image formats.
const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  cb,
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    // Maximum file size: 5 MB
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;