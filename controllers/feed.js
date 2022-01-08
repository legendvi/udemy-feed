const { validationResult } = require("express-validator");
const Post = require("../models/post");
const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const io = require("../socket");
exports.getPost = async (req, res, next) => {
  try {
    const curPage = req.query.page || 1;
    const perPage = 2;
    let totalItems;
    const count = await Post.find().countDocuments();

    totalItems = count;
    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((curPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "All posts Received",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    next(err);
  }
};

exports.postCreatePost = async (req, res, next) => {
  const errors = validationResult(req);
  const { title, content } = req.body;

  if (!errors.isEmpty()) {
    const errorFound = new Error("Validation Failed for the Post");
    errorFound.statusCode = 422;
    throw errorFound;
  }
  if (!req.file) {
    const errorFound = new Error("Validation Failed for the Post");
    errorFound.statusCode = 422;
    throw errorFound;
  }
  const imageUrl = req.file.filename;
  try {
    const post = new Post({
      title: title,
      content: content,
      creator: req.userId,
      imageUrl: imageUrl,
    });
    await post.save();
    const user = await User.findById(req.userId);

    user.posts.push(post);
    const result = await user.save();
    io.getIo().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    });
    res.status(201).json({
      msg: "post Created",
      post: post,
      creator: { userId: result._id, name: result.name },
    });
  } catch (err) {
    next(err);
  }
};

exports.getSinglePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("No Posts Found");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        message: "Post found",
        post: post,
      });
    })
    .catch((err) => next(err));
};

exports.putUpdatePost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorFound = new Error("Validation Failed for the Post");
    errorFound.statusCode = 422;
    throw errorFound;
  }
  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) imageUrl = req.file.filename;
  if (!imageUrl) {
    const error = new Error("No image found");
    error.statusCode = 422;
    throw error;
  }
  try {
    const post = await Post.findById(postId).populate("creator");

    if (!post) {
      const error = new Error("No post found");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("Not Authorized for this action");
      error.statusCode = 403;
      throw error;
    }
    if (imageUrl !== post.imageUrl) clearImage(post.imageUrl);
    post.title = title;
    post.content = content;

    const result = await post.save();
    io.getIo().emit("posts", { action: "update", post: result });
    res.status(201).json({
      message: "Post update Successfully",
      post: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId);

    //check Post
    if (!post) {
      const error = new Error("No post found");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error("Not Authorized for this action");
      error.statusCode = 403;
      throw error;
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);

    const user = await User.findById(req.userId);

    user.posts.pull(postId);
    const result = await user.save();
    io.getIo().emit("posts", { action: "delete", post: postId });
    res.status(200).json({ message: "Deleted Post", post: result });
  } catch (err) {
    next(err);
  }
};

const clearImage = (imageUrl) => {
  const filePath = path.join(__dirname, "..", "images", imageUrl);
  fs.unlink(filePath, (err) => console.log(err));
};
