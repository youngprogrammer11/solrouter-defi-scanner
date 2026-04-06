module.exports = (req, res) => {
  res.status(200).json({ ok: true, rpc: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com' });
};
