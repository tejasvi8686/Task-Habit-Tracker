import mongoose from "mongoose";

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  whyItMatters: {
    type: String,
    required: true
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    enum: ["youtube", "rss", "manual", "url"],
    default: "manual"
  },
  sourceName: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
}, {
  timestamps: true
});

const News = mongoose.model("News", newsSchema);

export default News;
