require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const authRoute = require("./routes/authRoutes");

const app = express();

// 🛠 Trust proxy (needed for secure cookies on Vercel/Render/Heroku)
app.set("trust proxy", 1);

// 🔐 Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Secure only in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Important for cross-origin
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// 🔄 CORS setup
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://thisispublicledger.vercel.app", 
  ],
  credentials: true, // allow cookies to be sent
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};
app.use(cors(corsOptions));

// 📦 JSON body parsing
app.use(express.json());

// 🛣 Routes
app.use("/auth", authRoute);

// 🗄 Database connection & server start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to Database");
    app.listen(process.env.PORT || 3005, () =>
      console.log(`🚀 Server running on port ${process.env.PORT || 3005}`)
    );
  })
  .catch((err) => console.error("❌ DB Connection Error:", err));
