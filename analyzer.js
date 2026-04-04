// analyzer.js — sends portfolio data through SolRouter's encrypted inference

const SOLROUTER_ENDPOINT = "https://api.solrouter.com/agent";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Demo fallback when SolRouter nodes are cold/unavailable
function generateDemoReport(portfolio) {
  const solBal = portfolio.solBalance;
  const tokenCount = portfolio.tokenCount;

  let riskLevel = "LOW";
  const flags = [];
  const recommendations = [];

  if (solBal === 0) {
    riskLevel = "HIGH";
    flags.push("Zero SOL balance — wallet cannot pay transaction fees");
    recommendations.push("Fund wallet with at least 0.1 SOL to cover gas fees");
  } else if (solBal < 0.05) {
    riskLevel = "MEDIUM";
    flags.push("Very low SOL balance — risk of failed transactions due to insufficient gas");
    recommendations.push("Top up SOL balance to at least 0.1 SOL for safe DeFi interactions");
  }

  if (tokenCount === 0) {
    flags.push("No SPL token positions found — portfolio is empty");
    recommendations.push("Consider diversifying into established Solana DeFi protocols");
  } else if (tokenCount === 1) {
    flags.push("Single token position — highly concentrated portfolio risk");
    recommendations.push("Spread positions across 3-5 assets to reduce concentration risk");
  }

  if (tokenCount > 10) {
    flags.push("High number of token accounts may include dust or scam tokens");
    recommendations.push("Audit token accounts and close empty ones to reclaim SOL rent");
  }

  recommendations.push("Set up price alerts for all active positions before executing DeFi strategies");

  if (flags.length === 0) flags.push("No critical risk flags detected for current portfolio");
  if (riskLevel === "LOW" && tokenCount > 0) riskLevel = "LOW";

  return {
    riskLevel,
    flags,
    recommendations,
    summary: `Wallet analysis complete. ${riskLevel === "HIGH" ? "Immediate action required — critical issues detected." : riskLevel === "MEDIUM" ? "Moderate risk detected — review recommendations before proceeding." : "Portfolio appears healthy with no critical risks at this time."}`,
    _demo: true
  };
}

async function analyzePortfolio(portfolio, apiKey) {
  const prompt = `
You are a DeFi risk analyst. Analyze the following Solana wallet portfolio and return a structured risk report.

Wallet: ${portfolio.wallet}
SOL Balance: ${portfolio.solBalance} SOL
Token Accounts: ${portfolio.tokenCount}
Tokens:
${portfolio.tokens.map((t) => `- Mint: ${t.mint} | Balance: ${t.balance}`).join("\n") || "- No SPL tokens found"}
Fetched At: ${portfolio.fetchedAt}

Respond ONLY with a JSON object, no extra text:
{
  "riskLevel": "LOW|MEDIUM|HIGH",
  "flags": ["flag1", "flag2"],
  "recommendations": ["rec1", "rec2"],
  "summary": "Two sentence summary."
}
`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`   SolRouter attempt ${attempt}/${MAX_RETRIES}...`);
    try {
      const response = await fetch(SOLROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          model: "gpt-oss:20b",
          useTools: false,
        }),
      });

      const text = await response.text();

      if (response.ok) {
        const data = JSON.parse(text);
        if (!data.success) throw new Error("success: false");
        const raw = data.reply || "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in reply");
        console.log(`   ✅ SolRouter live response on attempt ${attempt}`);
        return JSON.parse(jsonMatch[0]);
      }

      const isColdStart = text.includes("Nosana") || text.includes("503") || text.includes("starting up");
      if (isColdStart && attempt < MAX_RETRIES) {
        console.log(`   ⏳ Nosana cold start — retrying in ${RETRY_DELAY_MS/1000}s...`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        console.log(`   ⚠ Error: ${err.message} — retrying...`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
    }
  }

  // SolRouter node unavailable — use on-device demo analysis
  console.log("   ⚠ SolRouter nodes unavailable — running on-device demo analysis");
  return generateDemoReport(portfolio);
}

module.exports = { analyzePortfolio };
