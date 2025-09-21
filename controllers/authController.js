// controllers/authController.js
const User = require("../models/User");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// 📧 Setup transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASS,
  },
});

// 📧 Parse admin emails safely
const adminEmails = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((email) => email.trim())
  : [];

/**
 * REGISTER
 */
exports.register = async (req, res) => {
  try {
    const hashedPass = await argon2.hash(req.body.password);

    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPass,
      status: "pending",
    });

    const user = await newUser.save();

    // 🔑 Generate approval token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Save token in DB (so it can’t be reused after approval/rejection)
    user.approvalToken = token;
    await user.save();

    const approveLink = `${process.env.BASE_URL}/auth/approve/${token}`;
    const rejectLink = `${process.env.BASE_URL}/auth/reject/${token}`;

    // 📧 Send email to all admins
    await transporter.sendMail({
      from: `"Auth System" <${process.env.ADMIN_EMAIL}>`,
      to: adminEmails,
      subject: "New User Registration - Approval Needed",
      html: `
        <p>New user registered:</p>
        <p><strong>${user.username}</strong> (${user.email})</p>
        <p><a href="${approveLink}">✅ Approve User</a></p>
        <p><a href="${rejectLink}">❌ Reject User</a></p>
      `,
    });

    res
      .status(200)
      .json({ message: "Registration successful. Awaiting admin approval." });
  } catch (err) {
    console.error("❌ Error in register:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

/**
 * LOGIN (Session-based)
 */
exports.login = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).json({ message: "Wrong credentials!" });

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Account not approved yet. Please wait for admin approval.",
      });
    }

    const validated = await argon2.verify(user.password, req.body.password);
    if (!validated) return res.status(400).json({ message: "Wrong credentials!" });

    // ✅ Store user object in session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || "user",
    };

    const { password, approvalToken, ...others } = user._doc;
    res.status(200).json({
      message: "Login successful",
      user: others,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * LOGOUT
 */
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.clearCookie("connect.sid"); // default cookie name
    res.json({ message: "Logged out successfully" });
  });
};

/**
 * APPROVE USER (via email JWT link)
 */
exports.approveUser = async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.userId });

    if (!user) return res.status(404).send("User not found.");
    if (user.status !== "pending") return res.status(400).send("User already processed.");
    if (!user.approvalToken) return res.status(400).send("This link has already been used.");

    user.status = "active";
    user.approvalToken = null;
    await user.save();

    // 📧 Notify user
    await transporter.sendMail({
      from: `"Auth System" <${process.env.ADMIN_EMAIL}>`,
      to: user.email,
      subject: "Your Account Has Been Approved 🎉",
      html: `<p>Hello ${user.username},</p><p>✅ Your account has been approved. You can now log in.</p>`,
    });

    res.send("✅ User approved and notified!");
  } catch (err) {
    console.error("Approve error:", err);
    res.status(400).send("Invalid or expired token.");
  }
};

/**
 * REJECT USER (via email JWT link)
 */
exports.rejectUser = async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) return res.status(404).send("User not found.");
    if (user.status !== "pending")
      return res.status(400).send("User already processed.");
    if (!user.approvalToken) return res.status(400).send("This link has already been used.");

    user.status = "rejected";
    user.approvalToken = null;
    await user.save();

    // 📧 Notify user
    await transporter.sendMail({
      from: `"Auth System" <${process.env.ADMIN_EMAIL}>`,
      to: user.email,
      subject: "Your Account Has Been Rejected ❌",
      html: `
        <p>Hello ${user.username},</p>
        <p>❌ Unfortunately, your account has been rejected by the admin.</p>
        <p>If you believe this was a mistake, please contact support.</p>
      `,
    });

    res.send(`❌ User ${user.email} rejected and notified.`);
  } catch (err) {
    res.status(400).send("Invalid or expired token.");
  }
};
