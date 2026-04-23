import * as anchor from "@coral-xyz/anchor";
import idl from "../idl/protocol.json" with { type: "json" };
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
  getAccount,
} from "@solana/spl-token";
import fs from "node:fs";

// -------------------------
// Config
// -------------------------

const PROGRAM_ID = new PublicKey(
  "BtP7rVw9sqN4pW5RuzZJ2c4576R5pJU9yRtjrRJ7b5bM"
);

const keypairPath = process.env.HOME + "/.config/solana/id.json";
const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Optional mint argument:
//   npx ts-node-esm typescript/devnet/status_devnet.ts <MINT_PUBKEY>
const mintArg = process.argv[2] ?? null;

// -------------------------
// Helpers
// -------------------------

function deriveTreasuryPda(programId: PublicKey): PublicKey {
  const [treasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    programId
  );
  return treasuryPda;
}

function fmt(value: unknown): string {
  if (value instanceof PublicKey) return value.toBase58();
  if (typeof value === "bigint") return value.toString();
  if (value && typeof value === "object" && "toString" in value) {
    try {
      return (value as any).toString();
    } catch {
      return String(value);
    }
  }
  return String(value);
}

async function loadProgram(connection: Connection, wallet: Keypair) {
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
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

async function fetchTreasuryState(
  program: anchor.Program<any>,
  treasuryPda: PublicKey
) {
  return await (program.account as any).treasury.fetch(treasuryPda);
}

async function readTreasuryAtaInfo(
  treasuryPda: PublicKey,
  mint: PublicKey
): Promise<void> {
  const treasuryAta = getAssociatedTokenAddressSync(
    mint,
    treasuryPda,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log("\n--- Treasury ATA ---");
  console.log("Mint:", mint.toBase58());
  console.log("Treasury ATA:", treasuryAta.toBase58());

  const ataInfo = await connection.getAccountInfo(treasuryAta, "confirmed");
  if (!ataInfo) {
    console.log("Treasury ATA exists: no");
    return;
  }

  console.log("Treasury ATA exists: yes");
  console.log("Treasury ATA owner program:", ataInfo.owner.toBase58());

  const tokenAccount = await getAccount(
    connection,
    treasuryAta,
    "confirmed",
    TOKEN_PROGRAM_ID
  );

  console.log("Treasury ATA mint:", tokenAccount.mint.toBase58());
  console.log("Treasury ATA token owner:", tokenAccount.owner.toBase58());
  console.log("Treasury ATA balance (raw):", tokenAccount.amount.toString());
}

// -------------------------
// Main
// -------------------------

async function main() {
  console.log("=== ZephiPay / Zephyon Devnet Status ===\n");
  console.log("RPC:", clusterApiUrl("devnet"));
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program ID:", PROGRAM_ID.toBase58());

  const walletBalance = await connection.getBalance(wallet.publicKey, "confirmed");
  console.log("Wallet SOL:", walletBalance / anchor.web3.LAMPORTS_PER_SOL);

  const { program } = await loadProgram(connection, wallet);
  const treasuryPda = deriveTreasuryPda(PROGRAM_ID);

  console.log("\n--- Treasury PDA ---");
  console.log("Treasury PDA:", treasuryPda.toBase58());

  const treasuryInfo = await connection.getAccountInfo(treasuryPda, "confirmed");
  if (!treasuryInfo) {
    console.log("Treasury account exists: no");
    console.log("\nTreasury is not initialized on devnet yet.");
    return;
  }

  console.log("Treasury account exists: yes");

  const treasury = await fetchTreasuryState(program, treasuryPda);

  console.log("\n--- Treasury State ---");
  console.log("Authority:", fmt(treasury.authority));
  console.log("Paused:", fmt(treasury.paused));
  console.log("Pay Count:", fmt(treasury.payCount));
  console.log("Bump:", fmt(treasury.bump));

  if (mintArg) {
    let mint: PublicKey;
    try {
      mint = new PublicKey(mintArg);
    } catch {
      throw new Error(`Invalid mint pubkey: ${mintArg}`);
    }

    await readTreasuryAtaInfo(treasuryPda, mint);
  } else {
    console.log("\nNo mint argument provided.");
    console.log(
      "To inspect a treasury ATA, run:\n" +
        "npx ts-node-esm typescript/devnet/status_devnet.ts <MINT_PUBKEY>"
    );
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});