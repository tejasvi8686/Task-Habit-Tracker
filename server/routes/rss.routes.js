import express from "express";
import { fetchRssNews } from "../controllers/rss.controller.js";

const router = express.Router();

router.post("/fetch", fetchRssNews);

export default router;
