import {
  Connection,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import fs from "fs";

// 🔐 Load your wallet (same one used for Anchor/devnet)
const keypairPath = process.env.HOME + "/.config/solana/id.json";
const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));

// 🌐 Connect to devnet
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

async function main() {
  console.log("=== ZephiPay Devnet Bridge Test ===\n");

  console.log("Wallet:", wallet.publicKey.toBase58());

  const balance = await connection.getBalance(wallet.publicKey);

  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");

  console.log("\nConnection successful.");
}

main().catch((err) => {
  console.error("Error:", err);
});