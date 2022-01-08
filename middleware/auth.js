const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    req.isAuth = false;

    return next();
  }
  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = jwt.verify(token, "somesupersecretstring");
    if (!decodedToken) {
      req.isAuth = false;

      return next();
    }

    req.userId = decodedToken.userId;
    req.isAuth = true;

    next();
  } catch (err) {
    {
      req.isAuth = false;
      return next();
    }
  }
};
