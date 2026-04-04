// server.js — SolRouter DeFi Risk Scanner web server

require("dotenv").config();
const express = require("express");
const path = require("path");
const { fetchPortfolio } = require("./portfolio");
const { analyzePortfolio } = require("./analyzer");
const { fetchTokenPrices, SOL_MINT } = require("./prices");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const API_KEY = process.env.SOLROUTER_API_KEY;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

// ── Health ──────────────────────────────────
app.get("/api/health", (_, res) => res.json({ ok: true, rpc: RPC_URL }));

// ── Single wallet scan ──────────────────────
app.post("/api/scan", async (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Wallet address required" });
  if (!API_KEY || API_KEY === "sk_solrouter_YOURKEYHERE")
    return res.status(500).json({ error: "SolRouter API key not configured in .env" });

  try {
    const portfolio = await fetchPortfolio(wallet, RPC_URL);
    const [report, prices] = await Promise.all([
      analyzePortfolio(portfolio, API_KEY),
      fetchTokenPrices(portfolio.tokens.map(t => t.mint)),
    ]);

    // Enrich tokens with USD prices
    const solPrice = prices[SOL_MINT] || 0;
    const enrichedTokens = portfolio.tokens.map(t => ({
      ...t,
      usdPrice: prices[t.mint] || 0,
      usdValue: (prices[t.mint] || 0) * (t.balance || 0),
    }));

    res.json({
      portfolio: { ...portfolio, tokens: enrichedTokens, solUsdValue: solPrice * portfolio.solBalance, solPrice },
      report,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Compare two wallets ─────────────────────
app.post("/api/compare", async (req, res) => {
  const { walletA, walletB } = req.body;
  if (!walletA || !walletB) return res.status(400).json({ error: "Both wallet addresses required" });
  if (!API_KEY || API_KEY === "sk_solrouter_YOURKEYHERE")
    return res.status(500).json({ error: "SolRouter API key not configured in .env" });

  try {
    const [portfolioA, portfolioB] = await Promise.all([
      fetchPortfolio(walletA, RPC_URL),
      fetchPortfolio(walletB, RPC_URL),
    ]);
    const [reportA, reportB] = await Promise.all([
      analyzePortfolio(portfolioA, API_KEY),
      analyzePortfolio(portfolioB, API_KEY),
    ]);
    const allMints = [...portfolioA.tokens, ...portfolioB.tokens].map(t => t.mint);
    const prices = await fetchTokenPrices(allMints);
    const solPrice = prices[SOL_MINT] || 0;

    res.json({
      a: { portfolio: { ...portfolioA, solUsdValue: solPrice * portfolioA.solBalance, solPrice }, report: reportA },
      b: { portfolio: { ...portfolioB, solUsdValue: solPrice * portfolioB.solBalance, solPrice }, report: reportB },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║  🔐 SolRouter DeFi Risk Scanner v2.0    ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\n✅ Running at: http://localhost:${PORT}\n`);
});
