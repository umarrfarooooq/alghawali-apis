const multer = require("multer");
const path = require("path");

const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'maidVideos/');
    },
    filename: (req, file, cb) => {
      cb(null, 'video_' + Date.now() + path.extname(file.originalname));
    },
  });
  
 const videoUpload = multer({
    storage: videoStorage,
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      if (ext !== ".mp4" && ext !== ".avi" && ext !== ".mkv") {
        cb(new Error("File type is not supported"), false);
        return;
      }
      cb(null, true);
    },
  }).single('videoLink');

module.exports = videoUpload;