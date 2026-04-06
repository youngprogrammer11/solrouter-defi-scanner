// prices.js — Jupiter price API for token USD values

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Well-known Solana token metadata (mint -> { name, symbol, logo })
const KNOWN_TOKENS = new Map([
  ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", { name:"USD Coin",        symbol:"USDC",  color:"#2775CA" }],
  ["Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", { name:"Tether USD",       symbol:"USDT",  color:"#26A17B" }],
  ["So11111111111111111111111111111111111111112",    { name:"Wrapped SOL",      symbol:"SOL",   color:"#9945FF" }],
  ["mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",  { name:"Marinade SOL",    symbol:"mSOL",  color:"#00CFDD" }],
  ["7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj", { name:"Lido Staked SOL", symbol:"stSOL", color:"#00A3FF" }],
  ["DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", { name:"Bonk",            symbol:"BONK",  color:"#F7A600" }],
  ["JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",  { name:"Jupiter",         symbol:"JUP",   color:"#C7AE80" }],
  ["hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",  { name:"Helium Network",  symbol:"HNT",   color:"#474DFF" }],
  ["SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y",  { name:"Shadow Token",    symbol:"SHDW",  color:"#7C3AED" }],
  ["4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", { name:"Raydium",         symbol:"RAY",   color:"#3B82F6" }],
  ["orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",   { name:"Orca",            symbol:"ORCA",  color:"#00F0A0" }],
  ["MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTa3gjnznwDgs",  { name:"Marinade",        symbol:"MNDE",  color:"#00CFDD" }],
  ["nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7",  { name:"Nosana",          symbol:"NOS",   color:"#10E80C" }],
]);

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

module.exports = { fetchTokenPrices, SOL_MINT, USDC_MINT, KNOWN_TOKENS };
