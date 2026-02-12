import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";

dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(cors({ origin: true, credentials: true })); // allow any origin (for dev)
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

export default app;