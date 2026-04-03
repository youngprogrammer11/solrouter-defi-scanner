// portfolio.js — fetches on-chain token data from Solana devnet

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");

async function fetchPortfolio(walletAddress, rpcUrl) {
  const connection = new Connection(rpcUrl, "confirmed");
  const pubkey = new PublicKey(walletAddress);

  // Fetch SOL balance
  const lamports = await connection.getBalance(pubkey);
  const solBalance = lamports / LAMPORTS_PER_SOL;

  // Fetch all token accounts
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });

  const tokens = tokenAccounts.value.map((account) => {
    const info = account.account.data.parsed.info;
    return {
      mint: info.mint,
      balance: info.tokenAmount.uiAmount,
      decimals: info.tokenAmount.decimals,
      symbol: "SPL Token", // symbol resolution requires extra lookup
    };
  });

  return {
    wallet: walletAddress,
    solBalance,
    tokenCount: tokens.length,
    tokens,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { fetchPortfolio };
