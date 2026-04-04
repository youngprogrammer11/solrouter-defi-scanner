# 🔐 SolRouter DeFi Portfolio Risk Intelligence

> The first encrypted DeFi risk scanner on Solana — powered by SolRouter's private inference engine. Your wallet data is encrypted before leaving your device, processed inside isolated hardware, and never logged anywhere.

**Built by [OlaTech IT](https://x.com/Olamiayan) · [Live Demo](https://thearcadia.netlify.app/)**

---

## 🧠 What It Does

This tool scans any Solana wallet and generates a comprehensive risk intelligence report using **SolRouter's encrypted inference** — so your wallet address, token balances, and strategy are never exposed to any public server.

### Features
- **Risk Score (0–100)** — quantitative score across 5 risk dimensions
- **5-Dimension Radar Chart** — Liquidity, Concentration, Activity, Security, Reliability
- **Live Token USD Values** — via Jupiter Price API
- **Transaction History** — last 10 txs with status, timestamp, explorer links
- **Protocol Detection** — identifies interactions with Marinade, Jupiter, Orca, Raydium, Solend, and more
- **Dust Token Detection** — flags potential scam/airdrop tokens
- **Wallet Age & Activity Score** — on-chain history analysis
- **Compare Two Wallets** — side-by-side risk comparison
- **Export Report** — download full report as `.txt`
- **Shareable URL** — pre-load any wallet via `?wallet=...`
- **Recent Scans** — localStorage history as quick-access chips
- **Light / Dark Mode** — full theme support
- **Fully Responsive** — works on all screen sizes

### Why Private Inference Matters for DeFi
When you analyze a portfolio using a standard AI API, your wallet address, token balances, and strategy are sent as **plaintext to a centralized server**. This means:
- Your positions could be front-run
- Your strategy could be leaked or logged
- Your wallet is permanently tied to your queries

SolRouter solves this by encrypting your query before it leaves your device, processing it inside a **Trusted Execution Environment (TEE)** on [Nosana's](https://nosana.io) decentralized GPU network, and routing through Solana — so inference is both private and verifiable.

---

## ⚙️ Setup

### Prerequisites
- Node.js v18+
- SolRouter account → [solrouter.com](https://solrouter.com)
- Free devnet USDC → [faucet.circle.com](https://faucet.circle.com) (select Solana Devnet)

### Install

```bash
git clone https://github.com/youngprogrammer11/solrouter-defi-scanner
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

### Run Web UI (recommended)

```bash
npm start
```
Open **http://localhost:3000** in your browser.

### Run CLI (terminal only)

```bash
npm run scan
```

---

## 🗂 Project Structure

```
solrouter-defi-scanner/
├── server.js        ← Express web server (UI + API endpoints)
├── index.js         ← CLI runner
├── portfolio.js     ← Solana on-chain data fetcher
│                      (SOL balance, SPL tokens, txs, protocol detection)
├── analyzer.js      ← SolRouter encrypted inference + risk scoring engine
├── prices.js        ← Jupiter Price API for live USD token values
├── public/
│   └── index.html   ← Full web dashboard (single file, no framework)
├── .env.example     ← Environment variables template
└── README.md
```

---

## 🔌 API Endpoints

```
POST /api/scan
  Body: { wallet: string }
  Returns: { portfolio, report }

POST /api/compare
  Body: { walletA: string, walletB: string }
  Returns: { a: { portfolio, report }, b: { portfolio, report } }

GET /api/health
  Returns: { ok: true, rpc: string }
```

---

## 📸 Demo Output

```
╔══════════════════════════════════════════════╗
║  🔐 SolRouter DeFi Portfolio Risk Scanner    ║
╚══════════════════════════════════════════════╝

Risk Score:  61 / 100
Risk Level:  MEDIUM

SOL Balance: 0.0000 SOL
Tokens:      1 SPL token(s)
Txs:         3 (0 failed)
Wallet Age:  5 days

Risk Flags:
  • Zero SOL balance — wallet cannot pay transaction fees
  • Single active token — high concentration risk
  • Low transaction history — wallet is relatively new

Recommendations:
  • Fund wallet with at least 0.05 SOL to cover network fees
  • Spread across 3–5 assets to reduce concentration risk
  • Build on-chain history before committing significant capital

✅ Analysis complete — encrypted via SolRouter
```

---

## 🔒 How Encryption Works

1. **Client-side** — Your wallet data is composed into a prompt
2. **SolRouter SDK** — Prompt is encrypted before leaving your device
3. **Nosana Network** — Processed inside a TEE (Trusted Execution Environment)
4. **Solana** — Results routed through decentralized infrastructure
5. **Zero logs** — No centralized server ever sees your raw query

---

## 🔗 Resources

- [SolRouter](https://solrouter.com) — Private AI inference on Solana
- [SolRouter Docs](https://www.solrouter.com/docs)
- [SolRouter on X](https://x.com/SolRouterAI)
- [SolRouter Telegram](https://t.me/+uEgTRV5CivVmYTRi)
- [Nosana Network](https://nosana.io)
- [Circle Faucet](https://faucet.circle.com) — Free devnet USDC
- [Jupiter Price API](https://price.jup.ag)

---

## 📜 License

MIT — Built by [OlaTech IT](https://x.com/Olamiayan)
