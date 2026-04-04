// approvals.js — Check token delegated approvals (security risk)

const { Connection, PublicKey } = require('@solana/web3.js');

async function fetchApprovals(walletAddress, rpcUrl) {
  const connection = new Connection(rpcUrl, 'confirmed');
  const pubkey = new PublicKey(walletAddress);

  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    const approvals = [];
    for (const account of tokenAccounts.value) {
      const info = account.account.data.parsed.info;
      const delegate = info.delegate;
      const delegatedAmount = info.delegatedAmount;

      if (delegate && delegatedAmount && delegatedAmount.uiAmount > 0) {
        approvals.push({
          mint: info.mint,
          delegate: delegate,
          shortDelegate: delegate.slice(0, 6) + '…' + delegate.slice(-6),
          amount: delegatedAmount.uiAmount,
          decimals: delegatedAmount.decimals,
        });
      }
    }
    return approvals;
  } catch (_) {
    return [];
  }
}

module.exports = { fetchApprovals };
