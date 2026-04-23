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

// Usage:
// npx ts-node-esm typescript/devnet/receipt_devnet.ts <RECEIPT_PUBKEY>
const receiptArg = process.argv[2];

if (!receiptArg) {
  console.error(
    "Usage: npx ts-node-esm typescript/devnet/receipt_devnet.ts <RECEIPT_PUBKEY>"
  );
  process.exit(1);
}

const RECEIPT = new PublicKey(receiptArg);

function fmt(value: unknown): string {
  if (value instanceof PublicKey) return value.toBase58();
  if (typeof value === "bigint") return value.toString();

  if (value && typeof value === "object" && "toBase58" in value) {
    try {
      return (value as any).toBase58();
    } catch {
      return String(value);
    }
  }

  if (value && typeof value === "object" && "toString" in value) {
    try {
      return (value as any).toString();
    } catch {
      return String(value);
    }
  }

  return String(value);
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
  console.log("Raw account info:", rawInfo ? "found" : "missing");

  if (!rawInfo) {
    console.log("Receipt exists: no");
    return;
  }

  console.log("Receipt exists: yes");
  console.log("Owner program:", rawInfo.owner.toBase58());
  console.log("Data length:", rawInfo.data.length);
  console.log("Attempting Anchor decode...");

  let receipt: any;
  try {
    receipt = await programAny.account.receipt.fetch(RECEIPT);
  } catch (e) {
    console.error("Anchor fetch failed:");
    console.error(e);
    process.exit(1);
  }

  console.log("\n--- Decoded Receipt ---");
  for (const [key, value] of Object.entries(receipt)) {
    if (value === null || value === undefined) {
      console.log(`${key}:`, value);
      continue;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      try {
        console.log(
          `${key}:`,
          JSON.stringify(
            value,
            (_, v) => {
              if (v && typeof v === "object" && "toBase58" in v) {
                try {
                  return (v as any).toBase58();
                } catch {
                  return v;
                }
              }
              if (v && typeof v === "object" && "toString" in v) {
                try {
                  return (v as any).toString();
                } catch {
                  return v;
                }
              }
              return v;
            },
            2
          )
        );
      } catch {
        console.log(`${key}:`, fmt(value));
      }
      continue;
    }

    console.log(`${key}:`, fmt(value));
  }
}

main().catch((err) => {
  console.error("receipt_devnet failed:");
  console.error(err);
  process.exit(1);
});