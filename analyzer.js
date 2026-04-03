// analyzer.js — sends portfolio data through SolRouter's encrypted inference

async function analyzePortfolio(portfolio, apiKey) {
  const prompt = `
You are a DeFi risk analyst. Analyze the following Solana wallet portfolio and return a structured risk report.

Wallet: ${portfolio.wallet}
SOL Balance: ${portfolio.solBalance} SOL
Token Accounts: ${portfolio.tokenCount}
Tokens:
${portfolio.tokens.map((t) => `- Mint: ${t.mint} | Balance: ${t.balance}`).join("\n") || "- No SPL tokens found"}
Fetched At: ${portfolio.fetchedAt}

Provide a risk assessment with:
1. Overall risk level (LOW / MEDIUM / HIGH)
2. Key risk flags (e.g. low SOL for gas, empty wallet, high token concentration)
3. Recommendations (2-3 actionable suggestions)
4. A brief summary (2 sentences)

Format your response as JSON like this:
{
  "riskLevel": "LOW|MEDIUM|HIGH",
  "flags": ["flag1", "flag2"],
  "recommendations": ["rec1", "rec2"],
  "summary": "Brief summary here."
}
`;

  // Call SolRouter's encrypted inference API
  // Prompts are encrypted before leaving the device and processed in isolated hardware
  const response = await fetch("https://api.solrouter.com/v1/inference", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "solrouter-default",
      messages: [{ role: "user", content: prompt }],
      encrypted: true, // enables private inference - prompt never hits a public server
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SolRouter API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || data.content || "";

  // Parse the JSON risk report from the response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse risk report from response.");

  return JSON.parse(jsonMatch[0]);
}

module.exports = { analyzePortfolio };
