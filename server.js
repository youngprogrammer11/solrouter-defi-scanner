// server.js — SolRouter DeFi Risk Scanner v2.1

require('dotenv').config();
const express = require('express');
const path = require('path');
const { fetchPortfolio } = require('./portfolio');
const { analyzePortfolio } = require('./analyzer');
const { fetchTokenPrices, SOL_MINT, KNOWN_TOKENS } = require('./prices');
const { scanAllTokens } = require('./rugcheck');
const { fetchApprovals } = require('./approvals');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const API_KEY = process.env.SOLROUTER_API_KEY;
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

app.get('/api/health', (_, res) => res.json({ ok: true, rpc: RPC_URL }));

// ── Single wallet scan ──────────────────────
app.post('/api/scan', async (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'Wallet address required' });
  if (!API_KEY || API_KEY === 'sk_solrouter_YOURKEYHERE')
    return res.status(500).json({ error: 'SolRouter API key not configured in .env' });

  try {
    const portfolio = await fetchPortfolio(wallet, RPC_URL);
    const mints = portfolio.tokens.map(t => t.mint);

    // Run all enrichment in parallel
    const [report, prices, rugResults, approvals] = await Promise.all([
      analyzePortfolio(portfolio, API_KEY),
      fetchTokenPrices(mints),
      scanAllTokens(mints),
      fetchApprovals(wallet, RPC_URL),
    ]);

    const solPrice = prices[SOL_MINT] || 0;
    const enrichedTokens = portfolio.tokens.map(t => ({
      ...t,
      usdPrice: prices[t.mint] || 0,
      usdValue: (prices[t.mint] || 0) * (t.balance || 0),
      rugcheck: rugResults[t.mint] || null,
      meta: KNOWN_TOKENS.get(t.mint) || null,
    }));

    const totalUsd = (solPrice * portfolio.solBalance) +
      enrichedTokens.reduce((s, t) => s + (t.usdValue || 0), 0);

    res.json({
      portfolio: {
        ...portfolio,
        tokens: enrichedTokens,
        solUsdValue: solPrice * portfolio.solBalance,
        solPrice,
        totalUsd,
      },
      report,
      approvals,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Compare two wallets ─────────────────────
app.post('/api/compare', async (req, res) => {
  const { walletA, walletB } = req.body;
  if (!walletA || !walletB) return res.status(400).json({ error: 'Both wallet addresses required' });
  if (!API_KEY || API_KEY === 'sk_solrouter_YOURKEYHERE')
    return res.status(500).json({ error: 'SolRouter API key not configured in .env' });

  try {
    const [pA, pB] = await Promise.all([
      fetchPortfolio(walletA, RPC_URL),
      fetchPortfolio(walletB, RPC_URL),
    ]);
    const [rA, rB] = await Promise.all([
      analyzePortfolio(pA, API_KEY),
      analyzePortfolio(pB, API_KEY),
    ]);
    const allMints = [...pA.tokens, ...pB.tokens].map(t => t.mint);
    const prices = await fetchTokenPrices(allMints);
    const solPrice = prices[SOL_MINT] || 0;

    const enrich = (p) => ({
      ...p,
      solUsdValue: solPrice * p.solBalance,
      solPrice,
      totalUsd: (solPrice * p.solBalance) + p.tokens.reduce((s, t) => s + ((prices[t.mint] || 0) * (t.balance || 0)), 0),
    });

    res.json({
      a: { portfolio: enrich(pA), report: rA },
      b: { portfolio: enrich(pB), report: rB },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  🔐 SolRouter DeFi Risk Scanner v2.1    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n✅ Running at: http://localhost:${PORT}\n`);
});
