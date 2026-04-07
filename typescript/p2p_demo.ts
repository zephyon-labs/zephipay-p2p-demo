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

const transactionHistory: Transaction[] = [];
let nextTransactionId = 1;

const users: Record<string, User> = {
  Matt: new User("Matt", 100),
  Jake: new User("Jake", 0),
  Alex: new User("Alex", 50),
};

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

console.log("Starting balances:");
for (const user of Object.values(users)) {
  console.log(`${user.name}: $${user.balance}`);
}

console.log("\n--- Transactions ---\n");

sendMoneyByName("Matt", "Jake", 10);
sendMoneyByName("Jake", "Alex", 5);
sendMoneyByName("Alex", "Matt", 20);
sendMoneyByName("Jake", "Matt", 100);
sendMoneyByName("Matt", "Nova", 15);

console.log("\n--- Updated balances ---");
for (const user of Object.values(users)) {
  console.log(`${user.name}: $${user.balance}`);
}

console.log("\n--- Transaction History ---");
for (const tx of transactionHistory) {
  console.log(
    `#${tx.id} | ${tx.sender} -> ${tx.receiver} | $${tx.amount} | ${tx.status} | ${tx.reason} | ${tx.timestamp}`
  );
}