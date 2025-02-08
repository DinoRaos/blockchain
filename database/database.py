import sqlite3

DB_NAME = "marketplace.db"

def get_db_connection():
    return sqlite3.connect(DB_NAME)

class Item:
    def __init__(self, id=None, name=None, description=None, price_eth=None, seller_address=None, buyer_address=None, status="available"):
        self.id = id
        self.name = name
        self.description = description
        self.price_eth = price_eth
        self.seller_address = seller_address
        self.buyer_address = buyer_address
        self.status = status

    def save(self):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO items (name, description, price_eth, seller_address, buyer_address, status) VALUES (?, ?, ?, ?, ?, ?)",
                (self.name, self.description, self.price_eth, self.seller_address, self.buyer_address, self.status)
            )
            conn.commit()
            self.id = cursor.lastrowid
            print(f"Item '{self.name}' was saved.")

    def update(self):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE items SET name = ?, description = ?, price_eth = ?, seller_address = ?, buyer_address = ?, status = ? WHERE id = ?",
                (self.name, self.description, self.price_eth, self.seller_address, self.buyer_address, self.status, self.id)
            )
            conn.commit()
            print(f"Item with ID {self.id} was updated.")

    def delete(self):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM items WHERE id = ?", (self.id,))
            conn.commit()
            print(f"Item with ID {self.id} was deleted.")

    @classmethod
    def get_by_id(cls, item_id):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, description, price_eth, seller_address, buyer_address, status FROM items WHERE id = ?", (item_id,))
            data = cursor.fetchone()
            if data:
                return cls(*data)
            return None

    @classmethod
    def get_all(cls):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, description, price_eth, seller_address, buyer_address, status FROM items")
            return [cls(*row) for row in cursor.fetchall()]


class Transaction:
    def __init__(self, id=None, item_id=None, seller_address=None, buyer_address=None, price_eth=None, tx_hash=None):
        self.id = id
        self.item_id = item_id
        self.seller_address = seller_address
        self.buyer_address = buyer_address
        self.price_eth = price_eth
        self.tx_hash = tx_hash

    def save(self):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO transactions (item_id, seller_address, buyer_address, price_eth, tx_hash) VALUES (?, ?, ?, ?, ?)",
                (self.item_id, self.seller_address, self.buyer_address, self.price_eth, self.tx_hash)
            )
            conn.commit()
            self.id = cursor.lastrowid
            print(f"Transaction with TX-Hash {self.tx_hash} was saved.")

    def delete(self):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM transactions WHERE id = ?", (self.id,))
            conn.commit()
            print(f"Transaction with ID {self.id} was deleted.")

    @classmethod
    def get_by_id(cls, transaction_id):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,))
            data = cursor.fetchone()
            if data:
                return cls(*data)
            return None

    @classmethod
    def get_all(cls):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM transactions")
            return [cls(*row) for row in cursor.fetchall()]

def create_tables():
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price_eth REAL NOT NULL,
                seller_address TEXT NOT NULL,
                buyer_address TEXT,
                status TEXT CHECK(status IN ('available', 'sold')) DEFAULT 'available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER NOT NULL,
                seller_address TEXT NOT NULL,
                buyer_address TEXT NOT NULL,
                price_eth REAL NOT NULL,
                tx_hash TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES items(id)
            )
        ''')

        conn.commit()
        print("Tables were created successfully.")

if __name__ == "__main__":
    create_tables()

    item1 = Item(name="Laptop", description="Gaming Laptop mit RTX 3080", price_eth=1.5, seller_address="0x123abc")
    item1.save()

    item = Item.get_by_id(item1.id)
    print(f"Gefundenes Item: {item.name}, Preis: {item.price_eth} ETH")

    item.description = "Gaming Laptop mit RTX 4090"
    item.update()

    items = Item.get_all()
    for i in items:
        print(f"{i.id}: {i.name} - {i.description}")

    item.delete()