import { fetchLatestVideos } from "../services/youtube.service.js";

export const fetchChannelNews = async (req, res) => {
  try {
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({ message: "Channel ID is required" });
    }

    const createdCount = await fetchLatestVideos(channelId);

    res.status(200).json({
      message: "YouTube news fetched successfully",
      createdCount,
    });
  } catch (error) {
    console.error("YouTube Controller Error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
