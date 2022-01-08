const { validationResult } = require("express-validator");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation Failed");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  bcrypt
    .hash(password, 12)
    .then((hashedPw) => {
      const user = new User({
        name: name,
        email: email,
        password: hashedPw,
      });
      return user.save();
    })
    .then((result) => {
      res.status(201).json({
        message: "User Created",
        userId: result._id,
      });
    })
    .catch((err) => next(err));
};

exports.postLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    if (!user) throw (new Error("E-mail does not exists").statusCode = 401);

    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) throw (new Error("password Wrong").statusCode = 401);
    const token = jwt.sign(
      { email: user.email, userId: user._id.toString() },
      "secretpasswordhere",
      { expiresIn: "1h" }
    );
    res.status(200).json({
      token: token,
      userId: user._id.toString(),
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) throw (new Error("Authentication Error").statusCode = 404);
    res.status(200).json({ status: user.status });
  } catch (err) {
    next(err);
  }
};

exports.patchUserStatus = async (req, res, next) => {
  const user = await User.findById(req.userId);

  try {
    if (!user) throw (new Error("Authentication Error").statusCode = 404);
    user.status = req.body.status;
    await user.save();
    res.status(200).json({ message: "status changed" });
  } catch (err) {
    next(err);
  }
};
