const { body } = require("express-validator");
const express = require("express");
const router = express.Router();
const getPost = require("../controllers/feed").getPost;
const postCreatePost = require("../controllers/feed").postCreatePost;
const feedController = require("../controllers/feed");
const isAuth = require("../middleware/is-auth");

router.get("/posts", isAuth, getPost);
router.post(
  "/posts",
  isAuth,
  [
    body("title", "Title Validation Failed").trim().isLength({ min: 5 }),
    body("content", "Title Validation Failed").isLength({ min: 5 }),
  ],
  postCreatePost
);
module.exports = router;

router.get("/post/:postId", isAuth, feedController.getSinglePost);
router.put(
  "/post/:postId",
  isAuth,
  [
    body("title", "Title Validation Failed").trim().isLength({ min: 5 }),
    body("content", "Title Validation Failed").isLength({ min: 5 }),
  ],
  feedController.putUpdatePost
);

router.delete("/post/:postId", isAuth, feedController.deletePost);
