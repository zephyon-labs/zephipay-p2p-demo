import {
  Connection,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import fs from "node:fs";

const senderPath = process.env.HOME + "/.config/solana/id.json";
const senderSecretKey = JSON.parse(fs.readFileSync(senderPath, "utf-8"));
const senderWallet = Keypair.fromSecretKey(Uint8Array.from(senderSecretKey));

const recipientPath = process.env.HOME + "/.config/solana/devnet-recipient.json";
const recipientSecretKey = JSON.parse(fs.readFileSync(recipientPath, "utf-8"));
const recipientWallet = Keypair.fromSecretKey(Uint8Array.from(recipientSecretKey));

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

async function getSolBalance(pubkey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(pubkey);
  return balance / LAMPORTS_PER_SOL;
}

async function main() {
  console.log("=== ZephiPay Devnet Transfer Test ===\n");

  console.log("Sender:", senderWallet.publicKey.toBase58());
  console.log("Recipient:", recipientWallet.publicKey.toBase58());

  const senderBalanceBefore = await getSolBalance(senderWallet.publicKey);
  const recipientBalanceBefore = await getSolBalance(recipientWallet.publicKey);

  console.log("\n--- Balances Before ---");
  console.log("Sender:", senderBalanceBefore, "SOL");
  console.log("Recipient:", recipientBalanceBefore, "SOL");

  const lamportsToSend = 0.01 * LAMPORTS_PER_SOL;

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderWallet.publicKey,
      toPubkey: recipientWallet.publicKey,
      lamports: lamportsToSend,
    })
  );

  console.log("\nSending 0.01 SOL...");

  const signature = await sendAndConfirmTransaction(connection, transaction, [senderWallet]);

  console.log("Transaction signature:", signature);

  const senderBalanceAfter = await getSolBalance(senderWallet.publicKey);
  const recipientBalanceAfter = await getSolBalance(recipientWallet.publicKey);

  console.log("\n--- Balances After ---");
  console.log("Sender:", senderBalanceAfter, "SOL");
  console.log("Recipient:", recipientBalanceAfter, "SOL");

  console.log("\nTransfer complete.");
}

main().catch((err) => {
  console.error("Error:", err);
});