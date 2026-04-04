// analyzer.js — SolRouter encrypted inference + smart demo fallback

const SOLROUTER_ENDPOINT = "https://api.solrouter.com/agent";
const MAX_RETRIES = 3;
const RETRY_DELAY = 10000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Risk scoring engine ──────────────────────────────────────
function calcDimensions(portfolio) {
  const sol = portfolio.solBalance;
  const active = portfolio.activeTokens?.length ?? 0;
  const dust = portfolio.dustTokens?.length ?? 0;
  const txCount = portfolio.totalTxCount ?? 0;
  const failed = portfolio.failedTxCount ?? 0;
  const ageDays = portfolio.walletAgeDays ?? 0;
  const total = portfolio.tokenCount ?? 0;

  const liquidity = sol === 0 ? 95 : sol < 0.01 ? 80 : sol < 0.05 ? 55 : sol < 0.1 ? 30 : sol < 1 ? 15 : 5;
  const concentration = active === 0 ? 85 : active === 1 ? 65 : active <= 3 ? 42 : active <= 7 ? 22 : 10;
  const activity = txCount === 0 ? 90 : txCount < 5 ? 65 : txCount < 20 ? 38 : txCount < 100 ? 18 : 8;
  const dustRatio = total > 0 ? dust / total : 0;
  const security = dustRatio > 0.7 ? 85 : dustRatio > 0.4 ? 62 : dustRatio > 0.1 ? 38 : 10;
  const failRate = txCount > 0 ? failed / txCount : 0;
  const reliability = failRate > 0.3 ? 80 : failRate > 0.1 ? 50 : failRate > 0 ? 25 : ageDays < 7 ? 40 : 8;

  return { liquidity, concentration, activity, security, reliability };
}

function calcScore(dims) {
  const w = { liquidity: 0.30, concentration: 0.20, activity: 0.20, security: 0.18, reliability: 0.12 };
  return Math.round(
    dims.liquidity * w.liquidity +
    dims.concentration * w.concentration +
    dims.activity * w.activity +
    dims.security * w.security +
    dims.reliability * w.reliability
  );
}

function scoreToLevel(score) {
  return score >= 68 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";
}

function generateDemoReport(portfolio) {
  const dims = calcDimensions(portfolio);
  const riskScore = calcScore(dims);
  const riskLevel = scoreToLevel(riskScore);
  const sol = portfolio.solBalance;
  const flags = [], recommendations = [];

  if (sol === 0) { flags.push("Zero SOL balance — wallet cannot pay transaction fees"); recommendations.push("Fund wallet with at least 0.05 SOL to cover network fees"); }
  else if (sol < 0.05) { flags.push(`Low SOL balance (${sol.toFixed(4)} SOL) — risk of failed transactions`); recommendations.push("Top up SOL to at least 0.1 SOL for safe DeFi interactions"); }

  if (portfolio.activeTokens?.length === 0) { flags.push("No active SPL token positions found"); recommendations.push("Consider diversifying into established Solana DeFi protocols"); }
  else if (portfolio.activeTokens?.length === 1) { flags.push("Single active token — high concentration risk"); recommendations.push("Spread across 3–5 assets to reduce single-position exposure"); }

  if (portfolio.dustTokens?.length > 0) { flags.push(`${portfolio.dustTokens.length} dust/potential scam token(s) detected in wallet`); recommendations.push("Audit and close dust token accounts to reclaim SOL rent (~0.002 SOL per account)"); }

  if (portfolio.totalTxCount < 5 && portfolio.totalTxCount > 0) { flags.push("Low transaction history — wallet is relatively new or inactive"); recommendations.push("Build on-chain history before committing significant capital to DeFi"); }

  if (portfolio.failedTxCount > 0) { flags.push(`${portfolio.failedTxCount} failed transaction(s) in recent history`); recommendations.push("Review gas settings and slippage tolerances to reduce failed transactions"); }

  if (portfolio.emptyTokens?.length > 3) { flags.push(`${portfolio.emptyTokens.length} empty token accounts draining SOL in rent`); recommendations.push("Close empty token accounts via a tool like sol-incinerator.app to recover SOL"); }

  if (flags.length === 0) flags.push("No critical risk flags detected in current portfolio");
  recommendations.push("Enable price alerts for all active positions before executing DeFi strategies");

  const summaries = {
    HIGH: "This wallet presents significant risk factors requiring immediate attention. Review all flags before interacting with DeFi protocols.",
    MEDIUM: "Moderate risk profile detected. Address the flagged issues to improve your portfolio safety before scaling positions.",
    LOW: "Portfolio appears healthy with no critical risks detected. Continue monitoring positions and maintaining adequate SOL for gas.",
  };

  return { riskScore, riskLevel, dimensions: dims, flags, recommendations, summary: summaries[riskLevel], _demo: true };
}

// ── SolRouter live inference ──────────────────────────────────
async function analyzePortfolio(portfolio, apiKey) {
  const prompt = `You are an expert DeFi risk analyst on Solana. Analyze this wallet and return ONLY a JSON object with no extra text.

WALLET DATA:
Address: ${portfolio.wallet}
SOL Balance: ${portfolio.solBalance} SOL
Active Token Positions: ${portfolio.activeTokens?.length ?? 0}
Dust Tokens: ${portfolio.dustTokens?.length ?? 0}
Total Token Accounts: ${portfolio.tokenCount}
Total Transactions: ${portfolio.totalTxCount}
Failed Transactions: ${portfolio.failedTxCount}
Wallet Age (days): ${portfolio.walletAgeDays ?? "unknown"}
Detected Protocols: ${portfolio.detectedProtocols?.map(p => p.name).join(", ") || "none"}

Return ONLY this JSON (no markdown, no extra text):
{
  "riskScore": <integer 0-100>,
  "riskLevel": "<LOW|MEDIUM|HIGH>",
  "dimensions": {
    "liquidity": <0-100>,
    "concentration": <0-100>,
    "activity": <0-100>,
    "security": <0-100>,
    "reliability": <0-100>
  },
  "flags": ["<flag1>","<flag2>"],
  "recommendations": ["<rec1>","<rec2>","<rec3>"],
  "summary": "<2 sentence summary>"
}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`   SolRouter attempt ${attempt}/${MAX_RETRIES}...`);
    try {
      const res = await fetch(SOLROUTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ prompt, model: "gpt-oss:20b", useTools: false }),
      });
      const text = await res.text();
      if (res.ok) {
        const data = JSON.parse(text);
        if (!data.success) throw new Error("success: false");
        const raw = data.reply || "";
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No JSON in reply");
        const report = JSON.parse(match[0]);
        console.log(`   ✅ SolRouter live on attempt ${attempt}`);
        return { ...report, _demo: false };
      }
      const cold = text.includes("Nosana") || text.includes("503") || text.includes("starting up");
      if (cold && attempt < MAX_RETRIES) {
        console.log(`   ⏳ Cold start — retrying in ${RETRY_DELAY/1000}s...`);
        await sleep(RETRY_DELAY);
      }
    } catch (err) {
      if (attempt < MAX_RETRIES) { console.log(`   ⚠ ${err.message} — retrying...`); await sleep(RETRY_DELAY); }
    }
  }
  console.log("   ⚠ Nodes unavailable — using on-device analysis");
  return generateDemoReport(portfolio);
}

module.exports = { analyzePortfolio };
