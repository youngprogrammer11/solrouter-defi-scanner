// prices.js — Jupiter price API for token USD values

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

async function fetchTokenPrices(mints = []) {
  const ids = [SOL_MINT, USDC_MINT, ...mints].filter((v, i, a) => a.indexOf(v) === i);
  try {
    const res = await fetch(`https://price.jup.ag/v6/price?ids=${ids.join(",")}`);
    if (!res.ok) return {};
    const data = await res.json();
    const prices = {};
    if (data.data) {
      Object.entries(data.data).forEach(([mint, info]) => {
        prices[mint] = info.price || 0;
      });
    }
    return prices;
  } catch (_) {
    return {};
  }
}

module.exports = { fetchTokenPrices, SOL_MINT, USDC_MINT };
