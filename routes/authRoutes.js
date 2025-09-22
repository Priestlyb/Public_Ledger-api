// routes/auth.js
const router = require("express").Router();
const {
  register,
  me,
  login,
  logout,
  approveUser,
  rejectUser,
} = require("../controllers/authController");

// 📌 Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// 📌 Session-protected route: check current user
router.get("/me", me);


// 📌 Admin approval/rejection (triggered via email links)
router.get("/approve/:token", approveUser);
router.get("/reject/:token", rejectUser);

module.exports = router;
