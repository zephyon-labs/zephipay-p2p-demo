import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  Connection,
  clusterApiUrl,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  getAccount,
} from "@solana/spl-token";
import fs from "node:fs";
import idl from "../idl/protocol.json" with { type: "json" };

const mintArg = process.argv[2];
const recipientArg = process.argv[3];
const amountArg = process.argv[4];

if (!mintArg || !recipientArg || !amountArg) {
  console.error(
    "Usage: npx ts-node-esm typescript/devnet/run_devnet_flow.ts <MINT> <RECIPIENT> <AMOUNT>"
  );
  process.exit(1);
}

const MINT = new PublicKey(mintArg);
const RECIPIENT = new PublicKey(recipientArg);
const AMOUNT = Number(amountArg);

if (!Number.isFinite(AMOUNT) || AMOUNT <= 0 || !Number.isInteger(AMOUNT)) {
  console.error("Amount must be a positive integer.");
  process.exit(1);
}

const PROGRAM_ID = new PublicKey(
  "BtP7rVw9sqN4pW5RuzZJ2c4576R5pJU9yRtjrRJ7b5bM"
);

const TREASURY_PDA = new PublicKey(
  "CuqGCfnkHN5APYdL2UkCMYbVxXxqKrwrmWXw24WeQDbE"
);



const keypairPath = process.env.HOME + "/.config/solana/id.json";
const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

function deriveReceiptPda(payCount: BN): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("receipt"),
      TREASURY_PDA.toBuffer(),
      payCount.toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  );
  return pda;
}

async function loadProgram() {
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(payer),
    { commitment: "confirmed" }
  );

  anchor.setProvider(provider);

  const idlWithMeta = {
    ...(idl as any),
    metadata: {
      ...((idl as any).metadata ?? {}),
      address: PROGRAM_ID.toBase58(),
    },
  };

  const program = new anchor.Program(idlWithMeta as any, provider);
  return { provider, program };
}

async function main() {
  console.log("=== Zephyon Devnet Flow ===\n");

  const { provider, program } = await loadProgram();
  const programAny = program as any;

  const treasury = await programAny.account.treasury.fetch(TREASURY_PDA);

  console.log("Paused:", treasury.paused);
  console.log("Pay Count:", treasury.payCount.toString());

  if (treasury.paused) {
    throw new Error("Treasury is paused. Unpause first.");
  }

  const treasuryAta = getAssociatedTokenAddressSync(
    MINT,
    TREASURY_PDA,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const recipientAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    MINT,
    RECIPIENT,
    false,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const payCountBefore = new BN(treasury.payCount.toString());
  const receiptPda = deriveReceiptPda(payCountBefore);

  const treasuryBefore = await getAccount(connection, treasuryAta);
  const recipientBefore = await getAccount(connection, recipientAta.address);

  console.log("\n--- Before ---");
  console.log("Treasury:", treasuryBefore.amount.toString());
  console.log("Recipient:", recipientBefore.amount.toString());

  const tx = await programAny.methods
    .splPay(new BN(AMOUNT), null, null)
    .accounts({
      treasuryAuthority: provider.wallet.publicKey,
      treasury: TREASURY_PDA,
      mint: MINT,
      treasuryAta,
      recipient: RECIPIENT,
      recipientAta: recipientAta.address,
      receipt: receiptPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  console.log("\nTX:", tx);

  const treasuryAfter = await getAccount(connection, treasuryAta);
  const recipientAfter = await getAccount(connection, recipientAta.address);

  console.log("\n--- After ---");
  console.log("Treasury:", treasuryAfter.amount.toString());
  console.log("Recipient:", recipientAfter.amount.toString());

  const receipt = await programAny.account.receipt.fetch(receiptPda);

  console.log("\n--- Receipt ---");
  console.log("Amount:", receipt.amount.toString());
  console.log("Direction:", receipt.direction.toString());
  console.log("Mint:", receipt.mint.toBase58());
}

main().catch((err) => {
  console.error("Flow failed:");
  console.error(err);
  console.log("Mint:", MINT.toBase58());
console.log("Recipient:", RECIPIENT.toBase58());
console.log("Amount:", AMOUNT);
});