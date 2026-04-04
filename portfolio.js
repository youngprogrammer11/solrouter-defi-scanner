// portfolio.js — comprehensive on-chain data fetching

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");

const KNOWN_PROTOCOLS = new Map([
  ["MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD", { name: "Marinade Finance", type: "Liquid Staking", risk: "Low", icon: "🌊" }],
  ["9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", { name: "Raydium", type: "DEX / AMM", risk: "Medium", icon: "⚡" }],
  ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", { name: "Jupiter Aggregator", type: "DEX Aggregator", risk: "Low", icon: "🪐" }],
  ["whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", { name: "Orca Whirlpools", type: "Concentrated Liquidity", risk: "Medium", icon: "🐋" }],
  ["So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo", { name: "Solend", type: "Lending", risk: "Medium", icon: "🏦" }],
  ["MEisE1HzehtrDpAAT8PnLHjpSSkRYakotTuJRPjTpo8", { name: "Meteora", type: "Dynamic Pools", risk: "Medium", icon: "☄️" }],
  ["6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBymjook", { name: "Pump.fun", type: "Token Launch", risk: "High", icon: "🚀" }],
  ["MFv2hWf31Z9kbCa1snEPdcgp168QCUG2y4tFDA5hyat", { name: "Mango Markets", type: "Perps / Margin", risk: "High", icon: "🥭" }],
  ["DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1", { name: "Orca Legacy", type: "DEX", risk: "Low", icon: "🐋" }],
  ["srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX", { name: "Serum DEX", type: "Order Book DEX", risk: "Medium", icon: "📊" }],
]);

async function fetchPortfolio(walletAddress, rpcUrl) {
  const connection = new Connection(rpcUrl, "confirmed");
  const pubkey = new PublicKey(walletAddress);

  const [lamports, tokenAccountsResult] = await Promise.all([
    connection.getBalance(pubkey),
    connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    }),
  ]);

  const solBalance = lamports / LAMPORTS_PER_SOL;

  const tokens = tokenAccountsResult.value.map((account) => {
    const info = account.account.data.parsed.info;
    return {
      mint: info.mint,
      balance: info.tokenAmount.uiAmount,
      decimals: info.tokenAmount.decimals,
      rawAmount: info.tokenAmount.amount,
    };
  });

  const dustTokens = tokens.filter(t => t.balance !== null && t.balance > 0 && t.balance < 0.001);
  const emptyTokens = tokens.filter(t => t.balance === 0 || t.balance === null);
  const activeTokens = tokens.filter(t => t.balance !== null && t.balance >= 0.001);

  let recentTxs = [], walletAge = null, walletAgeDays = null;
  let totalTxCount = 0, failedTxCount = 0, detectedProtocols = [];

  try {
    const sigs = await connection.getSignaturesForAddress(pubkey, { limit: 20 });
    totalTxCount = sigs.length;
    failedTxCount = sigs.filter(s => s.err).length;

    if (sigs.length > 0) {
      const oldest = sigs[sigs.length - 1];
      if (oldest.blockTime) {
        const firstDate = new Date(oldest.blockTime * 1000);
        walletAge = firstDate.toISOString();
        walletAgeDays = Math.floor((Date.now() - firstDate.getTime()) / 86400000);
      }

      recentTxs = sigs.slice(0, 10).map(sig => ({
        signature: sig.signature,
        shortSig: sig.signature.slice(0, 8) + "…" + sig.signature.slice(-6),
        blockTime: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : null,
        status: sig.err ? "failed" : "success",
        memo: sig.memo || null,
      }));

      try {
        const details = await Promise.allSettled(
          sigs.slice(0, 5).map(s => connection.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 }))
        );
        const found = new Set();
        details.forEach(r => {
          if (r.status === "fulfilled" && r.value) {
            (r.value.transaction?.message?.accountKeys || []).forEach(acc => {
              const addr = acc.pubkey?.toString() || acc.toString();
              if (KNOWN_PROTOCOLS.has(addr)) found.add(addr);
            });
          }
        });
        detectedProtocols = Array.from(found).map(addr => KNOWN_PROTOCOLS.get(addr));
      } catch (_) {}
    }
  } catch (_) {}

  return {
    wallet: walletAddress,
    shortWallet: walletAddress.slice(0, 6) + "…" + walletAddress.slice(-6),
    solBalance,
    tokenCount: tokens.length,
    tokens,
    activeTokens,
    dustTokens,
    emptyTokens,
    walletAge,
    walletAgeDays,
    totalTxCount,
    failedTxCount,
    recentTxs,
    detectedProtocols,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { fetchPortfolio };
