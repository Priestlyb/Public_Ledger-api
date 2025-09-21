// routes/auth.js
const router = require("express").Router();
const {
  register,
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
router.get("/me", (req, res) => {
  if (req.session.user) {
    return res.json({ loggedIn: true, ...req.session.user });
  }
  res.json({ loggedIn: false });
});


// 📌 Admin approval/rejection (triggered via email links)
router.get("/approve/:token", approveUser);
router.get("/reject/:token", rejectUser);

module.exports = router;
