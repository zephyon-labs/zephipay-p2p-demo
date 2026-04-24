import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  clusterApiUrl,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import fs from "node:fs";
import idl from "../idl/protocol.json" with { type: "json" };

const PROGRAM_ID = new PublicKey(
  "BtP7rVw9sqN4pW5RuzZJ2c4576R5pJU9yRtjrRJ7b5bM"
);

const keypairPath = process.env.HOME + "/.config/solana/id.json";
const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

const receiptArg = process.argv[2];

if (!receiptArg) {
  console.error(
    "Usage: npx ts-node-esm typescript/devnet/receipt_devnet.ts <RECEIPT_PUBKEY>"
  );
  process.exit(1);
}

const RECEIPT = new PublicKey(receiptArg);

function bnLikeToDecimal(value: any): string {
  if (typeof value === "bigint") return value.toString();

  if (value && typeof value === "object" && value.constructor?.name === "BN") {
    return value.toString(10);
  }

  if (value && typeof value === "object" && "toString" in value) {
    return value.toString(10);
  }

  return String(value);
}

function formatTimestamp(value: any): string {
  const raw = Number(bnLikeToDecimal(value));
  if (!Number.isFinite(raw) || raw <= 0) return `${bnLikeToDecimal(value)} (unreadable)`;

  const date = new Date(raw * 1000);
  return `${raw} (${date.toISOString()})`;
}

function labelDirection(value: any): string {
  const n = Number(bnLikeToDecimal(value));
  if (n === 1) return "1 = DEPOSIT";
  if (n === 2) return "2 = WITHDRAW";
  if (n === 3) return "3 = PAY";
  return `${n} = UNKNOWN`;
}

function labelAssetKind(value: any): string {
  const n = Number(bnLikeToDecimal(value));
  if (n === 1) return "1 = SOL";
  if (n === 2) return "2 = SPL";
  return `${n} = UNKNOWN`;
}

function formatValue(value: any): any {
  if (value instanceof PublicKey) return value.toBase58();

  if (typeof value === "bigint") return value.toString();

  if (value && typeof value === "object" && "toBase58" in value) {
    return value.toBase58();
  }

  if (value && typeof value === "object" && value.constructor?.name === "BN") {
    return value.toString(10);
  }

  if (Array.isArray(value)) return value.map(formatValue);

  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = formatValue(v);
    }
    return out;
  }

  return value;
}

async function loadProgram(connection: Connection, walletKp: Keypair) {
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(walletKp),
    {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    }
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
  console.log("=== Zephyon Devnet Receipt Lookup ===\n");
  console.log("Wallet:", payer.publicKey.toBase58());
  console.log("Program ID:", PROGRAM_ID.toBase58());
  console.log("Receipt PDA:", RECEIPT.toBase58());

  const { program } = await loadProgram(connection, payer);
  const programAny = program as any;

  const rawInfo = await connection.getAccountInfo(RECEIPT, "confirmed");
  console.log("\n--- Account Info ---");
  console.log("Raw account info:", rawInfo ? "found" : "missing");

  if (!rawInfo) {
    console.log("Receipt exists: no");
    return;
  }

  console.log("Receipt exists: yes");
  console.log("Owner program:", rawInfo.owner.toBase58());
  console.log("Data length:", rawInfo.data.length);

  let receipt: any;
  try {
    receipt = await programAny.account.receipt.fetch(RECEIPT);
  } catch (e) {
    console.error("Anchor fetch failed:");
    console.error(e);
    process.exit(1);
  }

  console.log("\n--- Decoded Receipt ---");
  console.log("user:", formatValue(receipt.user));
  console.log("direction:", labelDirection(receipt.direction));
  console.log("assetKind:", labelAssetKind(receipt.assetKind));
  console.log("mint:", formatValue(receipt.mint));
  console.log("amount:", bnLikeToDecimal(receipt.amount));
  console.log("fee:", bnLikeToDecimal(receipt.fee));
  console.log("preBalance:", bnLikeToDecimal(receipt.preBalance));
  console.log("postBalance:", bnLikeToDecimal(receipt.postBalance));
  console.log("ts:", formatTimestamp(receipt.ts));
  console.log("txCount:", bnLikeToDecimal(receipt.txCount));
  console.log("bump:", receipt.bump);

  console.log("\n--- Receipt V2 Metadata ---");
  if (receipt.v2) {
    console.log(JSON.stringify(formatValue(receipt.v2), null, 2));
  } else {
    console.log("none");
  }
}

main().catch((err) => {
  console.error("receipt_devnet failed:");
  console.error(err);
  process.exit(1);
});