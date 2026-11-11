const { Router } = require("express");
const {
  sendMessage,
  listConversations,
  getConversationMessages,
} = require("../controllers/chat.controller.js");

const router = Router();

router.post("/", sendMessage);
router.get("/conversations", listConversations);
router.get("/conversations/:id/messages", getConversationMessages);

module.exports = {
    router
}
