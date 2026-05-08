require("dotenv").config();
const app = require("./app");
const { migrate } = require("./db");

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await migrate();
    app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

start();
