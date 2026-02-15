import express from "express";
import { fetchChannelNews } from "../controllers/youtube.controller.js";

const router = express.Router();

// POST /api/youtube/fetch
router.post("/fetch", fetchChannelNews);

export default router;
