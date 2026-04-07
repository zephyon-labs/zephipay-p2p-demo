import * as readline from "node:readline";

class User {
  name: string;
  balance: number;

  constructor(name: string, balance: number) {
    this.name = name;
    this.balance = balance;
  }
}

class Transaction {
  id: number;
  sender: string;
  receiver: string;
  amount: number;
  status: string;
  reason: string;
  timestamp: string;

  constructor(
    id: number,
    sender: string,
    receiver: string,
    amount: number,
    status: string,
    reason: string
  ) {
    this.id = id;
    this.sender = sender;
    this.receiver = receiver;
    this.amount = amount;
    this.status = status;
    this.reason = reason;
    this.timestamp = new Date().toISOString();
  }
}

const users: Record<string, User> = {
  Matt: new User("Matt", 100),
  Jake: new User("Jake", 0),
  Alex: new User("Alex", 50),
};

const transactionHistory: Transaction[] = [];
let nextTransactionId = 1;

function logTransaction(
  sender: string,
  receiver: string,
  amount: number,
  status: string,
  reason: string
): void {
  const tx = new Transaction(
    nextTransactionId,
    sender,
    receiver,
    amount,
    status,
    reason
  );

  transactionHistory.push(tx);
  nextTransactionId++;
}

function sendMoney(sender: User, receiver: User, amount: number): void {
  if (amount <= 0) {
    console.log("Transfer failed: amount must be greater than 0.");
    logTransaction(sender.name, receiver.name, amount, "FAILED", "Invalid amount");
    return;
  }

  if (sender.balance < amount) {
    console.log(`Transfer failed: ${sender.name} does not have enough funds.`);
    logTransaction(sender.name, receiver.name, amount, "FAILED", "Insufficient funds");
    return;
  }

  sender.balance -= amount;
  receiver.balance += amount;

  console.log(`${sender.name} sent $${amount} to ${receiver.name}`);
  console.log("Transaction complete");
  logTransaction(sender.name, receiver.name, amount, "SUCCESS", "Transfer completed");
}

function sendMoneyByName(senderName: string, receiverName: string, amount: number): void {
  const sender = users[senderName];
  const receiver = users[receiverName];

  if (!sender) {
    console.log(`Transfer failed: sender '${senderName}' not found.`);
    logTransaction(senderName, receiverName, amount, "FAILED", "Sender not found");
    return;
  }

  if (!receiver) {
    console.log(`Transfer failed: receiver '${receiverName}' not found.`);
    logTransaction(senderName, receiverName, amount, "FAILED", "Receiver not found");
    return;
  }

  sendMoney(sender, receiver, amount);
}

function showBalances(): void {
  console.log("\n--- Current Balances ---");
  for (const user of Object.values(users)) {
    console.log(`${user.name}: $${user.balance}`);
  }
}

function showHistory(): void {
  console.log("\n--- Transaction History ---");

  if (transactionHistory.length === 0) {
    console.log("No transactions yet.");
    return;
  }

  for (const tx of transactionHistory) {
    console.log(
      `#${tx.id} | ${tx.sender} -> ${tx.receiver} | $${tx.amount} | ${tx.status} | ${tx.reason} | ${tx.timestamp}`
    );
  }
}

function listUsers(): void {
  console.log("\nAvailable users:");
  for (const user of Object.values(users)) {
    console.log(`- ${user.name} ($${user.balance})`);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function handleSendMoney(): Promise<void> {
  listUsers();

  const senderName = (await ask("\nSender name: ")).trim();
  const receiverName = (await ask("Receiver name: ")).trim();
  const amountInput = (await ask("Amount: $")).trim();
  const amount = Number(amountInput);

  if (Number.isNaN(amount) || amount <= 0) {
    console.log("Invalid amount. Transaction cancelled.");
    return;
  }

  console.log("\n--- Confirm Transaction ---");
  console.log(`From: ${senderName}`);
  console.log(`To: ${receiverName}`);
  console.log(`Amount: $${amount}`);

  const confirm = (await ask("Confirm? (y/n): ")).trim().toLowerCase();

  if (confirm !== "y") {
    console.log("Transaction cancelled.");
    return;
  }

  sendMoneyByName(senderName, receiverName, amount);
}

async function mainMenu(): Promise<void> {
  console.log("\n=== ZephiPay Interactive P2P Demo ===");

  while (true) {
    console.log("\nChoose an option:");
    console.log("1. Show balances");
    console.log("2. Send money");
    console.log("3. Show transaction history");
    console.log("4. Exit");

    const choice = (await ask("Enter choice (1-4): ")).trim();

    if (choice === "1") {
      showBalances();
    } else if (choice === "2") {
      await handleSendMoney();
    } else if (choice === "3") {
      showHistory();
    } else if (choice === "4") {
      console.log("Exiting ZephiPay demo.");
      rl.close();
      break;
    } else {
      console.log("Invalid choice. Please enter 1, 2, 3, or 4.");
    }
  }
}

mainMenu();