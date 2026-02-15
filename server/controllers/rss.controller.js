import { fetchFeed } from "../services/rss.service.js";

export const fetchRssNews = async (req, res) => {
  try {
    const { feedUrl } = req.body;

    if (!feedUrl) {
      return res.status(400).json({ message: "feedUrl is required" });
    }

    const { createdCount, feedTitle } = await fetchFeed(feedUrl);

    res.status(200).json({
      message: "RSS news fetched successfully",
      feedTitle,
      createdCount
    });
  } catch (error) {
    console.error("RSS Controller Error:", error);
    res.status(502).json({ message: error.message || "Failed to fetch RSS feed" });
  }
};
