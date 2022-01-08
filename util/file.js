const path = require("path");
const fs = require("fs");

const clearImage = (imageUrl) => {
  const filePath = path.join(__dirname, "..", "images", imageUrl);
  fs.unlink(filePath, (err) => console.log(err));
};

module.exports = clearImage;
