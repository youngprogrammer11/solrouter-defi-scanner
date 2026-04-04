// rugcheck.js — RugCheck.xyz API for Solana token security scanning

const RUGCHECK_API = 'https://api.rugcheck.xyz/v1';

// Known Solana exploits/rugs - top incidents hardcoded for instant flagging
const KNOWN_EXPLOITS = new Map([
  ['7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', { name: 'Wormhole Bridge Hack', loss: '$320M', date: '2022-02' }],
  ['9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E', { name: 'Solend Oracle Attack', loss: '$1.26M', date: '2022-11' }],
  ['CRX7Thj95VH6yDKx3mzVLT5FSJL2jUNKGHpRnZNmqk9N', { name: 'Cashio Bank Exploit', loss: '$52M', date: '2022-03' }],
  ['SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp',  { name: 'Solend Protocol', loss: 'Near liquidation event', date: '2022-06' }],
  ['mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',  { name: 'Marinade - Monitored', loss: 'No exploit - watch list', date: 'ongoing' }],
]);

async function scanToken(mintAddress) {
  try {
    const res = await fetch(`${RUGCHECK_API}/tokens/${mintAddress}/report/summary`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseRugCheckResult(mintAddress, data);
  } catch (_) {
    return null;
  }
}

function parseRugCheckResult(mint, data) {
  const score = data.score ?? data.rugscore ?? 0;
  const risks = data.risks ?? [];

  let verdict = 'UNKNOWN';
  let verdictColor = 'muted';
  let riskLevel = 'unknown';

  if (score >= 700) {
    verdict = 'GOOD';
    verdictColor = 'success';
    riskLevel = 'low';
  } else if (score >= 400) {
    verdict = 'WARN';
    verdictColor = 'warn';
    riskLevel = 'medium';
  } else if (score < 400) {
    verdict = 'DANGER';
    verdictColor = 'danger';
    riskLevel = 'high';
  }

  // Check known exploits
  const exploit = KNOWN_EXPLOITS.get(mint);

  return {
    mint,
    score,
    verdict,
    verdictColor,
    riskLevel,
    risks: risks.slice(0, 3).map(r => r.name || r.description || String(r)),
    exploit: exploit || null,
    name: data.tokenMeta?.name || data.name || null,
    symbol: data.tokenMeta?.symbol || data.symbol || null,
    mintAuthority: data.mintAuthority ?? null,
    freezeAuthority: data.freezeAuthority ?? null,
    topHoldersPercent: data.topHolders?.[0]?.pct ?? null,
    isRugged: data.rugged ?? false,
  };
}

async function scanAllTokens(mints) {
  if (!mints || !mints.length) return {};
  // Scan up to 8 tokens concurrently to avoid rate limits
  const toScan = mints.slice(0, 8);
  const results = await Promise.allSettled(toScan.map(m => scanToken(m)));
  const out = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) out[toScan[i]] = r.value;
  });
  return out;
}

module.exports = { scanAllTokens, KNOWN_EXPLOITS };
