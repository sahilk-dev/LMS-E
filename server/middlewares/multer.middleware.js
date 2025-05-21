import multer from "multer";
import path from "path";

const storage = multer.memoryStorage(); // ✅ Store files in memory for Cloudinary

const upload = multer({
  storage: storage, // ✅ Explicitly define storage
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    fieldSize: 50 * 1024 * 1024 // ✅ Allow large text fields in FormData
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".webp", ".png", ".mp4"];

    if (!allowedExtensions.includes(ext)) {
        console.error(`❌ Unsupported file type attempted: ${ext}`);
        return cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowedExtensions.join(", ")}`), false);
    }

    cb(null, true);
  },
});

export default upload;
