const express = require("express");
const verifySuperClient = require("../middleWares/VerifySuperClient");
const {
  createPost,
  getAllPosts,
  deletePost,
  addComment,
  addReply,
} = require("../controllers/PostController");
const router = express.Router();

router.post("/", verifySuperClient, createPost);
router.post("/:postId/comment", verifySuperClient, addComment);
router.post("/:postId/reply/:commentId", verifySuperClient, addReply);


router.get("/", verifySuperClient, getAllPosts);
router.delete("/:sectionId", deletePost);

module.exports = router;
