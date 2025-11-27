// server.js - UKSS bulk SMS backend using Beem
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ===== ENV VARS =====
const PORT            = process.env.PORT || 4000;
const BEEM_API_KEY    = process.env.BEEM_API_KEY;
const BEEM_SECRET_KEY = process.env.BEEM_SECRET_KEY;
const BEEM_SOURCE_ADDR = process.env.BEEM_SOURCE_ADDR || "UKSS";

if (!BEEM_API_KEY || !BEEM_SECRET_KEY) {
  console.warn("⚠️  BEEM_API_KEY or BEEM_SECRET_KEY haijawekwa kwenye env.");
}

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.json({ ok: true, message: "UKSS Beem SMS backend running" });
});

// ===== BULK SMS ENDPOINT =====
// expects: { messages: [{ phone, message }, ...] }
app.post("/api/send-sms", async (req, res) => {
  try {
    const messages = req.body.messages || [];
    if (!messages.length) {
      return res.status(400).json({ ok: false, error: "No messages provided" });
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
          {
            recipient_id: i + 1,
            dest_addr: dest
          }
        ]
      };

      const auth = Buffer.from(
        BEEM_API_KEY + ":" + BEEM_SECRET_KEY
      ).toString("base64");

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

    return res.json({ ok: true, count: results.length, results });

  } catch (err) {
    // Hapa tunajaribu kutoa details halisi kutoka Beem
    const status = err.response?.status || 500;
    const details = err.response?.data || err.message;

    console.error("Beem send-sms error status:", status);
    console.error("Beem send-sms error details:", details);

    return res.status(status).json({
      ok: false,
      error: "Failed to send SMS via Beem",
      status,
      details
    });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log("🚀 UKSS Beem SMS backend running on port", PORT);
});
