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
import * as readline from "node:readline";

const senderPath = process.env.HOME + "/.config/solana/id.json";
const recipientPath = process.env.HOME + "/.config/solana/devnet-recipient.json";

const senderSecretKey = JSON.parse(fs.readFileSync(senderPath, "utf-8"));
const recipientSecretKey = JSON.parse(fs.readFileSync(recipientPath, "utf-8"));

const senderWallet = Keypair.fromSecretKey(Uint8Array.from(senderSecretKey));
const recipientWallet = Keypair.fromSecretKey(Uint8Array.from(recipientSecretKey));

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function getSolBalance(pubkey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(pubkey);
  return balance / LAMPORTS_PER_SOL;
}

async function showBalances(): Promise<void> {
  const senderBalance = await getSolBalance(senderWallet.publicKey);
  const recipientBalance = await getSolBalance(recipientWallet.publicKey);

  console.log("\n--- Current Devnet Balances ---");
  console.log(`Sender (${senderWallet.publicKey.toBase58()}): ${senderBalance} SOL`);
  console.log(`Recipient (${recipientWallet.publicKey.toBase58()}): ${recipientBalance} SOL`);
}

async function sendSol(amountSol: number): Promise<void> {
  if (Number.isNaN(amountSol) || amountSol <= 0) {
    console.log("Transfer cancelled: amount must be greater than 0.");
    return;
  }

  const senderBalance = await getSolBalance(senderWallet.publicKey);

  if (senderBalance < amountSol) {
    console.log("Transfer failed: sender does not have enough SOL.");
    return;
  }

  console.log("\n--- Confirm Transaction ---");
  console.log(`From: ${senderWallet.publicKey.toBase58()}`);
  console.log(`To:   ${recipientWallet.publicKey.toBase58()}`);
  console.log(`Amount: ${amountSol} SOL`);

  const confirm = (await ask("Confirm? (y/n): ")).trim().toLowerCase();

  if (confirm !== "y") {
    console.log("Transaction cancelled.");
    return;
  }

  const lamportsToSend = Math.round(amountSol * LAMPORTS_PER_SOL);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderWallet.publicKey,
      toPubkey: recipientWallet.publicKey,
      lamports: lamportsToSend,
    })
  );

  console.log("\nSending transaction to devnet...");

  const signature = await sendAndConfirmTransaction(connection, transaction, [senderWallet]);

  console.log("Transaction signature:", signature);
  console.log("Transfer complete.");
}

async function mainMenu(): Promise<void> {
  console.log("=== ZephiPay Devnet CLI ===");
  console.log("Real SOL transfer test on Solana devnet.");

  while (true) {
    console.log("\nChoose an option:");
    console.log("1. Show balances");
    console.log("2. Send SOL");
    console.log("3. Exit");

    const choice = (await ask("Enter choice (1-3): ")).trim();

    if (choice === "1") {
      await showBalances();
    } else if (choice === "2") {
      const amountInput = (await ask("Amount to send (SOL): ")).trim();
      const amountSol = Number(amountInput);
      await sendSol(amountSol);
    } else if (choice === "3") {
      console.log("Exiting ZephiPay devnet CLI.");
      rl.close();
      break;
    } else {
      console.log("Invalid choice. Please enter 1, 2, or 3.");
    }
  }
}

mainMenu().catch((err) => {
  console.error("Error:", err);
  rl.close();
});