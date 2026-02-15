import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import newsRoutes from "./routes/news.routes.js";
import youtubeRoutes from "./routes/youtube.routes.js";
import rssRoutes from "./routes/rss.routes.js";

dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(cors({ origin: true, credentials: true })); // allow any origin (for dev)
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/rss", rssRoutes);

export default app;
