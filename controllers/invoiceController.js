const express = require("express");
const router = express.Router();
const { generateInvoice } = require("../services/invoiceService");

router.get("/", async (req, res) => {
  try {
    const invoicePath = await generateInvoice();
    res.status(201).json({
      message: "invoice generated.",
      invoicePath,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server error: " + err.message);
  }
});
router.get("/view", async (req, res) => {
  try {
    res.render("invoice");
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server error: " + err.message);
  }
});
router.get("/alghawali-trial-paper", async (req, res) => {
  try {
    res.render("trial_papers/alghawali_trial_paper");
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server error: " + err.message);
  }
});
router.get("/indonesia-alghawali-trial-paper", async (req, res) => {
  try {
    res.render("trial_papers/indonesia_alghawali_trial_paper");
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server error: " + err.message);
  }
});
router.get("/swift-trial-paper", async (req, res) => {
  try {
    res.render("trial_papers/swift_trial_paper");
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server error: " + err.message);
  }
});
router.get("/indonesia-swift-trial-paper", async (req, res) => {
  try {
    res.render("trial_papers/indonesia_swift_trial_paper");
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server error: " + err.message);
  }
});

module.exports = router;
