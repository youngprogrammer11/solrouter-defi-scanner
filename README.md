# 🔐 SolRouter DeFi Portfolio Risk Scanner

> A private DeFi risk analyzer built on SolRouter's encrypted inference — your wallet data never hits a public server.

Built by **OlaTech IT** | [thearcadia.netlify.app](https://thearcadia.netlify.app/)

---

## 🧠 What It Does

This tool scans a Solana wallet's DeFi positions (SOL balance + SPL tokens) and runs them through **SolRouter's encrypted inference** to generate a structured risk report — flagging issues like low gas reserves, token concentration risk, or empty wallets.

The key difference from a regular AI query: **the prompt is encrypted before it leaves your device**, processed inside isolated hardware, and routed through decentralized infrastructure on Solana. Your strategy and wallet details are never exposed to any public server.

---

## 🔒 Why Private Inference Matters for DeFi

When you analyze a portfolio using a standard AI API (OpenAI, Anthropic, etc.), your wallet address, token balances, and strategy are sent as plaintext to a centralized server. For a trader or fund manager, this is a real risk:

- Your positions could be front-run
- Your strategy could be leaked
- Your wallet is permanently linked to your queries in server logs

SolRouter solves this by encrypting queries at the client level, processing inside a Trusted Execution Environment (TEE), and routing via Solana — so the inference is both private and verifiable.

---

## ⚙️ Setup

### Prerequisites
- Node.js v18+
- A SolRouter account → [solrouter.com](https://solrouter.com)
- Free devnet USDC → [faucet.circle.com](https://faucet.circle.com) (select Solana Devnet)

### Install

```bash
git clone https://github.com/YOUR_USERNAME/solrouter-defi-scanner
cd solrouter-defi-scanner
npm install
```

### Configure

```bash
cp .env.example .env
```

Edit `.env`:

```env
SOLROUTER_API_KEY=sk_solrouter_YOURKEYHERE
SOLANA_RPC_URL=https://api.devnet.solana.com
WALLET_ADDRESS=YOUR_SOLANA_WALLET_ADDRESS
```

### Run

```bash
node index.js
```

---

## 📸 Demo Output

```
╔══════════════════════════════════════════════╗
║   🔐 SolRouter DeFi Portfolio Risk Scanner   ║
║      Encrypted inference via SolRouter        ║
╚══════════════════════════════════════════════╝

📡 Fetching portfolio for wallet:
   7iM3vNN15rTa9b2B1Rg1UCZUEwSA1eRswja6a4gjFjb9

✅ Portfolio fetched:
   SOL Balance : 0.5 SOL
   Token Count : 2 SPL token(s)
   Fetched At  : 2026-04-04T12:00:00.000Z

🔐 Sending portfolio to SolRouter encrypted inference...
   (Your query is encrypted before leaving this device)

╔══════════════════════════════════════════════╗
║              📊 RISK REPORT                  ║
╚══════════════════════════════════════════════╝

   Risk Level     : MEDIUM

   🚩 Risk Flags:
      - Low SOL balance may cause failed transactions
      - Only 2 token positions — limited diversification

   💡 Recommendations:
      - Top up SOL to at least 0.1 SOL for gas headroom
      - Consider spreading across more DeFi protocols
      - Set price alerts for concentrated positions

   📝 Summary:
      Wallet shows moderate risk due to low SOL reserves and limited diversification.
      Recommended to increase gas reserves before executing any DeFi actions.

✅ Analysis complete. Query was fully encrypted via SolRouter.
```

---

## 🗂 Project Structure

```
solrouter-defi-scanner/
├── index.js        ← Main runner — orchestrates fetch + analyze + report
├── portfolio.js    ← Fetches SOL + SPL token data from Solana devnet
├── analyzer.js     ← Sends encrypted query to SolRouter, parses risk report
├── .env.example    ← Template for environment variables
├── .gitignore      ← Keeps .env and node_modules out of git
└── README.md       ← This file
```

---

## 🔗 Resources

- [SolRouter](https://solrouter.com) — Private AI inference on Solana
- [SolRouter Docs](https://www.solrouter.com/docs)
- [Circle Faucet](https://faucet.circle.com) — Free devnet USDC
- [ArcScan Explorer](https://testnet.arcscan.app) — Verify on-chain

---

## 📜 License

MIT
