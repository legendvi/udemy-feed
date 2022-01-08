const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const clearImage = require("./util/file");
// const feedRoutes = require("./routes/feed");
// const authRoutes = require("./routes/auth");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
// const socketio = require("./socket.js");
const { graphqlHTTP } = require("express-graphql");
const graphSchema = require("./graphql/schema");
const graphResolver = require("./graphql/resolvers");
const auth = require("./middleware/auth");
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const filterName = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else cb(null, false);
};
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access-log"),
  { flags: "a" }
);
app.use(helmet());
app.use(compression());
app.use(morgan("combined", { stream: accessLogStream }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(bodyParser.json());
app.use(
  multer({ storage: fileStorage, fileFilter: filterName }).single("image")
);
app.use(auth);
app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) throw new Error("Not Authenticated").code(422);
  if (!req.file) return res.status(200).json({ message: "No Image Provided" });
  // if (req.body.oldPath) clearImage(req.body.oldPath);

  return res
    .status(201)
    .json({ message: "File Update Successful", filePath: req.file.filename });
});
app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphSchema,
    rootValue: graphResolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) return err;
      const data = err.originalError.data;
      const message = err.originalError.message || "Some Error Occured";
      const status = err.originalError.code || 500;
      return { message, status, data };
    },
  })
);
// app.use("/feeds", feedRoutes);
// app.use("/auth", authRoutes);
app.use("/images", express.static(path.join(__dirname, "images")));
app.get("/", (req, res) => res.send("Hi"));
app.use((err, req, res, next) => {
  console.log(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message,
    data: err.data,
  });
});
mongoose.connect(process.env.MONGO_URL).then(() => {
  app.listen(process.env.PORT || 8080);
});
