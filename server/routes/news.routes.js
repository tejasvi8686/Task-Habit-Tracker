import express from "express";
import { createNews, getNews } from "../controllers/news.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

// POST /api/news - Create news manually
router.post("/", optionalAuth, createNews);

// GET /api/news - Fetch news feed
router.get("/", getNews);

export default router;
