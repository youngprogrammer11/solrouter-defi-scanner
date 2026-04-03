// index.js — SolRouter DeFi Portfolio Risk Scanner
// Built by OlaTech IT | https://thearcadia.netlify.app/
// Uses SolRouter encrypted inference to analyze Solana wallets privately

require("dotenv").config();

const { fetchPortfolio } = require("./portfolio");
const { analyzePortfolio } = require("./analyzer");

const SOLROUTER_API_KEY = process.env.SOLROUTER_API_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;

const RISK_COLORS = {
  LOW: "\x1b[32m",    // green
  MEDIUM: "\x1b[33m", // yellow
  HIGH: "\x1b[31m",   // red
};
const RESET = "\x1b[0m";

async function main() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   🔐 SolRouter DeFi Portfolio Risk Scanner   ║");
  console.log("║      Encrypted inference via SolRouter        ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  if (!SOLROUTER_API_KEY || !WALLET_ADDRESS) {
    console.error("❌ Missing environment variables. Copy .env.example to .env and fill in your values.");
    process.exit(1);
  }

  // Step 1: Fetch portfolio from Solana devnet
  console.log(`📡 Fetching portfolio for wallet:\n   ${WALLET_ADDRESS}\n`);
  const portfolio = await fetchPortfolio(WALLET_ADDRESS, SOLANA_RPC_URL);

  console.log(`✅ Portfolio fetched:`);
  console.log(`   SOL Balance : ${portfolio.solBalance} SOL`);
  console.log(`   Token Count : ${portfolio.tokenCount} SPL token(s)`);
  console.log(`   Fetched At  : ${portfolio.fetchedAt}\n`);

  // Step 2: Send through SolRouter encrypted inference
  console.log("🔐 Sending portfolio to SolRouter encrypted inference...");
  console.log("   (Your query is encrypted before leaving this device)\n");

  const report = await analyzePortfolio(portfolio, SOLROUTER_API_KEY);

  // Step 3: Display the risk report
  const color = RISK_COLORS[report.riskLevel] || RESET;
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║              📊 RISK REPORT                  ║");
  console.log("╚══════════════════════════════════════════════╝\n");
  console.log(`   Risk Level     : ${color}${report.riskLevel}${RESET}`);
  console.log(`\n   🚩 Risk Flags:`);
  report.flags.forEach((f) => console.log(`      - ${f}`));
  console.log(`\n   💡 Recommendations:`);
  report.recommendations.forEach((r) => console.log(`      - ${r}`));
  console.log(`\n   📝 Summary:`);
  console.log(`      ${report.summary}`);
  console.log("\n✅ Analysis complete. Query was fully encrypted via SolRouter.\n");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
