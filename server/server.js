import "dotenv/config";
import app from "./app.js";
import { startNewsRefreshCron } from "./jobs/newsRefresh.cron.js";

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  setTimeout(startNewsRefreshCron, 5000);
});