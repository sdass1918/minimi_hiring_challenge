const dotenv = require("dotenv");
const { app } = require("./src/app.js");

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Minimi server running on http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("Server error:", error);
});
