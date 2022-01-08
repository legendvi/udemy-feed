const bcrypt = require("bcryptjs");
const validator = require("validator");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const Post = require("../models/post");
const clearImage = require("../util/file");

module.exports = {
  createUser: async function ({ userInput }, req) {
    //   const email = args.userInput.email;
    const errors = [];
    console.log(userInput.email);
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: "Enter Valid E-mail" });
    }
    if (!validator.isLength(userInput.password, { min: 5 })) {
      errors.push({ message: "Enter Valid Password" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      const error = new Error("User exists already!");
      throw error;
    }
    const hashedPw = await bcrypt.hash(userInput.password, 12);
    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPw,
    });
    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  login: async function (args) {
    const user = await User.findOne({ email: args.email });
    if (!user) throw (new Error("No user Found").code = 401);
    const isEqual = await bcrypt.compare(args.password, user.password);
    if (!isEqual) throw (new Error("Invalid E-mail or Password").code = 401);
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      "somesupersecretstring",
      { expiresIn: "1h" }
    );
    return { token: token, userId: user._id.toString() };
  },
  createPost: async function ({ postInput }, req) {
    const errors = [];
    // console.log(req.isAuth, req.userId);
    if (!req.isAuth) {
      const error = new Error("Authetication Failed");
      error.data = errors;
      error.code = 401;
      throw error;
    }
    if (
      !validator.isLength(postInput.title, { min: 5 }) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: "Lengeth is too short" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found");
      error.data = errors;
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user,
    });

    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  posts: async function ({ page }, req) {
    if (!req.isAuth) {
      const error = new Error("Authetication Failed");
      error.code = 401;
      throw error;
    }
    if (!page) page = 1;
    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");

    return {
      posts: posts.map((p) => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
      totalPosts,
    };
  },
  post: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error("Authetication Failed");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id).populate("creator");
    if (!post) throw (new Error("No Post Found").code = 404);

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  updatePost: async function ({ id, postInput }, req) {
    const errors = [];
    if (!req.isAuth) {
      const error = new Error("Authetication Failed");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id).populate("creator");
    if (!post) throw (new Error("No Post Found").code = 404);
    if (post.creator._id.toString() !== req.userId.toString())
      throw (new Error("Not Authenticated").code = 403);
    console.log(post, postInput);
    if (
      !validator.isLength(postInput.title, { min: 5 }) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: "Lengeth is too short" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    post.title = postInput.title;
    post.content = postInput.content;
    if (postInput.imageUrl !== "undefined") {
      clearImage(post.imageUrl);
      post.imageUrl = postInput.imageUrl;
    }
    updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
  deletePost: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error("Authetication Failed");
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id);
    if (!post) throw (new Error("No Post Found").code = 404);
    if (post.creator.toString() !== req.userId.toString())
      throw (new Error("Not Authenticated").code = 403);
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(id);
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    return true;
  },
  user: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error("Authetication Failed");
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) throw (new Error("No Post Found").code = 404);
    return { ...user._doc, _id: user._id.toString() };
  },
  updateStatus: async function ({ status }, req) {
    if (!req.isAuth) {
      const error = new Error("Authetication Failed");
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) throw (new Error("No Post Found").code = 404);
    user.status = status;
    await user.save();
    return { ...user._doc, _id: user._id.toString() };
  },
};
