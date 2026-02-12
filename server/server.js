import app from "./app.js";

const PORT = process.env.PORT || 5001; // avoid 5000 (often used by macOS AirPlay)

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});