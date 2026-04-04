// server.js — Web server for SolRouter DeFi Risk Scanner
// Run: node server.js → open http://localhost:3000

require("dotenv").config();
const express = require("express");
const path = require("path");
const { fetchPortfolio } = require("./portfolio");
const { analyzePortfolio } = require("./analyzer");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SOLROUTER_API_KEY = process.env.SOLROUTER_API_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", rpc: SOLANA_RPC_URL });
});

// Main scan endpoint
app.post("/api/scan", async (req, res) => {
  const { wallet } = req.body;

  if (!wallet) {
    return res.status(400).json({ error: "Wallet address is required" });
  }

  if (!SOLROUTER_API_KEY || SOLROUTER_API_KEY === "sk_solrouter_YOURKEYHERE") {
    return res.status(500).json({ error: "SolRouter API key not configured in .env" });
  }

  try {
    // Step 1: Fetch portfolio from Solana
    const portfolio = await fetchPortfolio(wallet, SOLANA_RPC_URL);

    // Step 2: Analyze via SolRouter encrypted inference
    const report = await analyzePortfolio(portfolio, SOLROUTER_API_KEY);

    res.json({ portfolio, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   🔐 SolRouter DeFi Portfolio Risk Scanner   ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\n✅ Server running at: http://localhost:${PORT}`);
  console.log("   Open that URL in your browser to use the app.\n");
});
