const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "active", "rejected"],
      default: "pending",
    },
    approvalToken: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PLUser", UserSchema);
