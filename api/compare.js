const { fetchPortfolio } = require('../portfolio');
const { analyzePortfolio } = require('../analyzer');
const { fetchTokenPrices, SOL_MINT } = require('../prices');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletA, walletB } = req.body;
  if (!walletA || !walletB) return res.status(400).json({ error: 'Both wallet addresses required' });

  const API_KEY = process.env.SOLROUTER_API_KEY;
  const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

  try {
    const [pA, pB] = await Promise.all([fetchPortfolio(walletA, RPC_URL), fetchPortfolio(walletB, RPC_URL)]);
    const [rA, rB] = await Promise.all([analyzePortfolio(pA, API_KEY), analyzePortfolio(pB, API_KEY)]);
    const allMints = [...pA.tokens, ...pB.tokens].map(t => t.mint);
    const prices = await fetchTokenPrices(allMints);
    const solPrice = prices[SOL_MINT] || 0;
    const enrich = (p) => ({
      ...p, solUsdValue: solPrice * p.solBalance, solPrice,
      totalUsd: (solPrice * p.solBalance) + p.tokens.reduce((s, t) => s + ((prices[t.mint] || 0) * (t.balance || 0)), 0),
    });
    res.status(200).json({ a: { portfolio: enrich(pA), report: rA }, b: { portfolio: enrich(pB), report: rB } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
