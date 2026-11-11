const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const { router } = require("./routes/chat.routes.js");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    application: "Minimi AI Agent",
  });
});

app.use("/api/chat", router);

module.exports = {
    app
}
