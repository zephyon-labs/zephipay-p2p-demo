class User:
    def __init__(self, name, balance):
        self.name = name
        self.balance = balance


class Transaction:
    def __init__(self, sender, receiver, amount, status):
        self.sender = sender
        self.receiver = receiver
        self.amount = amount
        self.status = status


transaction_history = []

users = {
    "Matt": User("Matt", 100),
    "Jake": User("Jake", 0),
    "Alex": User("Alex", 50),
}


def send_money(sender, receiver, amount):
    if amount <= 0:
        print("Transfer failed: amount must be greater than 0.")
        transaction_history.append(Transaction(sender.name, receiver.name, amount, "FAILED"))
        return

    if sender.balance < amount:
        print(f"Transfer failed: {sender.name} does not have enough funds.")
        transaction_history.append(Transaction(sender.name, receiver.name, amount, "FAILED"))
        return

    sender.balance -= amount
    receiver.balance += amount

    print(f"{sender.name} sent ${amount} to {receiver.name}")
    print("Transaction complete")
    transaction_history.append(Transaction(sender.name, receiver.name, amount, "SUCCESS"))


def send_money_by_name(sender_name, receiver_name, amount):
    sender = users.get(sender_name)
    receiver = users.get(receiver_name)

    if sender is None:
        print(f"Transfer failed: sender '{sender_name}' not found.")
        transaction_history.append(Transaction(sender_name, receiver_name, amount, "FAILED"))
        return

    if receiver is None:
        print(f"Transfer failed: receiver '{receiver_name}' not found.")
        transaction_history.append(Transaction(sender_name, receiver_name, amount, "FAILED"))
        return

    send_money(sender, receiver, amount)


print("Starting balances:")
for user in users.values():
    print(f"{user.name}: ${user.balance}")

print("\n--- Transactions ---\n")

send_money_by_name("Matt", "Jake", 10)
send_money_by_name("Jake", "Alex", 5)
send_money_by_name("Alex", "Matt", 20)
send_money_by_name("Jake", "Matt", 100)   # fail: insufficient funds
send_money_by_name("Matt", "Nova", 15)    # fail: receiver not found

print("\n--- Updated balances ---")
for user in users.values():
    print(f"{user.name}: ${user.balance}")

print("\n--- Transaction History ---")
for tx in transaction_history:
    print(f"{tx.sender} -> {tx.receiver} | ${tx.amount} | {tx.status}")