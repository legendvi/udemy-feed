const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const User = require("../models/user");
const authController = require("../controllers/auth");
const isAuth = require("../middleware/auth");

router.put(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Not a Valid E-mail")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) return Promise.reject("Not a Valid Email from Promise");
          else return true;
        });
      })
      .normalizeEmail(),
    body("password").isLength({ min: 5 }).trim(),
    body("name").trim().not().isEmpty(),
  ],
  authController.signup
);
router.post("/login", authController.postLogin);

router.get("/status", isAuth, authController.getUserStatus);
router.patch("/status", isAuth, authController.patchUserStatus);
module.exports = router;
