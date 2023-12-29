const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'videoLink') {
      cb(null, 'uploads/videos/');
    } else {
      cb(null, 'uploads/images/');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'videoLink') {
      if (!file.originalname.match(/\.(mp4|avi|mkv)$/)) {
        return cb(new Error('Only video files (mp4, avi, mkv) are allowed!'), false);
      }
    } else {
      if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
      }
    }
    cb(null, true);
  }
});

module.exports = upload;
