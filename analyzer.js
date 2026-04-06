// analyzer.js — SolRouter encrypted inference with Claude API fallback

const SOLROUTER_ENDPOINT = 'https://api.solrouter.com/agent';
const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MAX_RETRIES = 2;
const RETRY_DELAY = 8000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Risk scoring engine (always runs for dimensions) ──────────
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
  return Math.round(dims.liquidity*0.30 + dims.concentration*0.20 + dims.activity*0.20 + dims.security*0.18 + dims.reliability*0.12);
}

function scoreToLevel(score) { return score >= 68 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW'; }

// ── Build the analysis prompt ─────────────────────────────────
function buildPrompt(portfolio) {
  return `You are an expert Solana DeFi risk analyst. Analyze this wallet and return ONLY a valid JSON object.

WALLET DATA:
Address: ${portfolio.wallet}
SOL Balance: ${portfolio.solBalance} SOL
Active Token Positions: ${portfolio.activeTokens?.length ?? 0}
Dust/Suspicious Tokens: ${portfolio.dustTokens?.length ?? 0}
Empty Token Accounts: ${portfolio.emptyTokens?.length ?? 0}
Total Token Accounts: ${portfolio.tokenCount}
Total Transactions: ${portfolio.totalTxCount}
Failed Transactions: ${portfolio.failedTxCount}
Wallet Age (days): ${portfolio.walletAgeDays ?? 'unknown'}
Detected Protocols: ${portfolio.detectedProtocols?.map(p => p.name).join(', ') || 'none'}

Return ONLY this JSON (no markdown, no extra text, no code blocks):
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
  "flags": ["<specific flag>", "<specific flag>"],
  "recommendations": ["<actionable recommendation>", "<actionable recommendation>", "<actionable recommendation>"],
  "summary": "<2 sentence summary of the wallet risk profile>"
}`;
}

// ── Try SolRouter encrypted inference ────────────────────────
async function trySolRouter(portfolio, apiKey) {
  const prompt = buildPrompt(portfolio);
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`   SolRouter attempt ${attempt}/${MAX_RETRIES}...`);
    try {
      const res = await fetch(SOLROUTER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ prompt, model: 'gpt-oss:20b', useTools: false }),
        signal: AbortSignal.timeout(25000),
      });
      const text = await res.text();
      if (res.ok) {
        const data = JSON.parse(text);
        if (!data.success) throw new Error('success:false');
        const match = (data.reply || '').match(/\{[\s\S]*\}/);
        if (!match) throw new Error('no JSON in reply');
        const report = JSON.parse(match[0]);
        console.log(`   ✅ SolRouter live on attempt ${attempt}`);
        return { ...report, _source: 'solrouter', _demo: false };
      }
      const cold = text.includes('Nosana') || text.includes('503') || text.includes('starting up') || text.includes('LLM error');
      if (cold && attempt < MAX_RETRIES) {
        console.log(`   ⏳ Cold start — retrying in ${RETRY_DELAY/1000}s...`);
        await sleep(RETRY_DELAY);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (attempt < MAX_RETRIES) { console.log(`   ⚠ ${err.message} — retrying...`); await sleep(RETRY_DELAY); }
    }
  }
  return null;
}

// ── Try Groq API as fallback (free tier available) ───────────
async function tryClaude(portfolio, claudeKey) {
  // Try Groq first (free), then Claude if key exists
  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = claudeKey;

  // Try Groq
  if (groqKey && groqKey !== 'your_groq_key_here') {
    console.log('   Trying Groq API fallback...');
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          max_tokens: 1024,
          temperature: 0.1,
          messages: [
            { role: 'system', content: 'You are a DeFi risk analyst. Always respond with valid JSON only, no markdown, no extra text.' },
            { role: 'user', content: buildPrompt(portfolio) }
          ],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`Groq ${res.status}: ${t.slice(0,100)}`); }
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('no JSON in Groq reply');
      const report = JSON.parse(match[0]);
      console.log('   ✅ Groq API fallback successful');
      return { ...report, _source: 'groq', _demo: false };
    } catch (err) {
      console.log(`   ⚠ Groq failed: ${err.message}`);
    }
  }

  // Try Claude
  if (anthropicKey && anthropicKey !== 'your_claude_key_here') {
    console.log('   Trying Claude API fallback...');
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: buildPrompt(portfolio) }],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`Claude ${res.status}: ${t.slice(0,100)}`); }
      const data = await res.json();
      const raw = data.content?.[0]?.text || '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('no JSON in Claude reply');
      const report = JSON.parse(match[0]);
      console.log('   ✅ Claude API fallback successful');
      return { ...report, _source: 'claude', _demo: false };
    } catch (err) {
      console.log(`   ⚠ Claude failed: ${err.message}`);
    }
  }

  return null;
}

// ── On-device demo analysis (always works) ────────────────────
function generateDemo(portfolio) {
  const dims = calcDimensions(portfolio);
  const riskScore = calcScore(dims);
  const riskLevel = scoreToLevel(riskScore);
  const sol = portfolio.solBalance;
  const flags = [], recs = [];

  if (sol === 0) { flags.push('Zero SOL balance — wallet cannot pay transaction fees'); recs.push('Fund wallet with at least 0.05 SOL to cover network fees'); }
  else if (sol < 0.05) { flags.push(`Low SOL balance (${sol.toFixed(4)} SOL) — risk of failed transactions`); recs.push('Top up SOL to at least 0.1 SOL for safe DeFi interactions'); }
  if ((portfolio.activeTokens?.length ?? 0) === 0) { flags.push('No active SPL token positions found'); recs.push('Consider diversifying into established Solana DeFi protocols'); }
  else if ((portfolio.activeTokens?.length ?? 0) === 1) { flags.push('Single active token — high concentration risk'); recs.push('Spread across 3–5 assets to reduce single-position exposure'); }
  if ((portfolio.dustTokens?.length ?? 0) > 0) { flags.push(`${portfolio.dustTokens.length} dust/potential scam token(s) detected`); recs.push('Audit and close dust token accounts to reclaim SOL rent (~0.002 SOL per account)'); }
  if ((portfolio.totalTxCount ?? 0) < 5 && (portfolio.totalTxCount ?? 0) > 0) { flags.push('Low transaction history — wallet is relatively new or inactive'); recs.push('Build on-chain history before committing significant capital'); }
  if ((portfolio.failedTxCount ?? 0) > 0) { flags.push(`${portfolio.failedTxCount} failed transaction(s) in recent history`); recs.push('Review gas settings and slippage tolerances to reduce failed transactions'); }
  if ((portfolio.emptyTokens?.length ?? 0) > 3) { flags.push(`${portfolio.emptyTokens.length} empty token accounts consuming SOL rent`); recs.push('Close empty token accounts via sol-incinerator.app to recover SOL'); }
  if (flags.length === 0) flags.push('No critical risk flags detected in current portfolio');
  recs.push('Set price alerts for all active positions before executing DeFi strategies');

  const summaries = {
    HIGH: 'This wallet presents significant risk factors that require immediate attention before any DeFi interaction.',
    MEDIUM: 'Moderate risk profile detected. Address flagged issues to improve portfolio safety before scaling positions.',
    LOW: 'Portfolio appears healthy with no critical risks. Continue monitoring positions and maintaining adequate SOL.',
  };

  return { riskScore, riskLevel, dimensions: dims, flags, recommendations: recs, summary: summaries[riskLevel], _source: 'ondevice', _demo: true };
}

// ── Main export ───────────────────────────────────────────────
async function analyzePortfolio(portfolio, solrouterKey) {
  const claudeKey = process.env.ANTHROPIC_API_KEY;

  // 1. Try SolRouter (encrypted inference, highest priority)
  const solrouterResult = await trySolRouter(portfolio, solrouterKey);
  if (solrouterResult) return solrouterResult;

  // 2. Try Claude API (live AI, good fallback)
  const claudeResult = await tryClaude(portfolio, claudeKey);
  if (claudeResult) return claudeResult;

  // 3. On-device analysis (always works)
  console.log('   ⚠ All live inference unavailable — using on-device analysis');
  return generateDemo(portfolio);
}

module.exports = { analyzePortfolio };
