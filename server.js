// server.js - UKSS bulk SMS backend using Beem
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ENV
const PORT = process.env.PORT || 4000;
const BEEM_API_KEY = process.env.BEEM_API_KEY;
const BEEM_SECRET_KEY = process.env.BEEM_SECRET_KEY;
const BEEM_SOURCE_ADDR = process.env.BEEM_SOURCE_ADDR || "UKSS";

if (!BEEM_API_KEY || !BEEM_SECRET_KEY) {
  console.log("⚠️ Missing BEEM API credentials");
}

// Health check
app.get("/", (req, res) => {
  res.json({ ok: true, message: "UKSS BEEM backend running" });
});

// Bulk SMS endpoint
app.post("/api/send-sms", async (req, res) => {
  try {
    const messages = req.body.messages || [];
    if (!messages.length) {
      return res.status(400).json({ ok: false, error: "No messages" });
    }

    const results = [];

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!m.phone || !m.message) continue;

      const dest = String(m.phone).replace(/[\s\-]/g, "");

      const payload = {
        source_addr: BEEM_SOURCE_ADDR,
        schedule_time: "",
        encoding: 0,
        message: m.message,
        recipients: [
          { recipient_id: i + 1, dest_addr: dest }
        ]
      };

      const auth = Buffer
        .from(BEEM_API_KEY + ":" + BEEM_SECRET_KEY)
        .toString("base64");

      const resp = await axios.post(
        "https://apisms.beem.africa/v1/send",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic " + auth
          }
        }
      );

      results.push({
        phone: dest,
        beemResponse: resp.data
      });
    }

    res.json({ ok: true, count: results.length, results });

  } catch (err) {
    console.error("Beem Error:", err.response?.data || err.message);
    res.status(500).json({
      ok: false,
      error: "Gateway failed",
      details: err.response?.data || err.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log("🚀 Backend running on port", PORT);
});
