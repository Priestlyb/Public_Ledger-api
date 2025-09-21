require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const authRoute = require("./routes/authRoutes");

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 24 * 60 * 60, 
    }),
    cookie: {
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// 🔄 CORS setup
const corsOptions = {
  origin: "https://thisispublicledger.vercel.app", // http://localhost:5173 https://thisispublicledger.vercel.app
  credentials: true,               
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
