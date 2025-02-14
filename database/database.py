import sqlite3

DB_NAME = "marketplace.db"


def get_db_connection():
    return sqlite3.connect(DB_NAME)


class Item:
    def __init__(self, id=None, name=None, description=None, price_eth=None, seller_address=None, buyer_address=None, status="available", image_url=None, created_at=None):
        self.id = id
        self.name = name
        self.description = description
        self.price_eth = price_eth
        self.seller_address = seller_address
        self.buyer_address = buyer_address
        self.status = status
        self.image_url = image_url
        self.created_at = created_at

    def save(self):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO items (name, description, price_eth, seller_address, buyer_address, status, image_url) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (self.name, self.description, self.price_eth, self.seller_address,
                 self.buyer_address, self.status, self.image_url)
            )
            conn.commit()
            self.id = cursor.lastrowid

    @classmethod
    def get_by_id(cls, item_id):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT id, name, description, price_eth, seller_address, buyer_address, status, image_url, created_at 
                   FROM items WHERE id = ?""",
                (item_id,))
            data = cursor.fetchone()
            if data:
                return cls(*data)
            return None

    @classmethod
    def get_all(cls):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT id, name, description, price_eth, seller_address, buyer_address, status, image_url, created_at 
                   FROM items""")
            return [cls(*row) for row in cursor.fetchall()]

    def update(self):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """UPDATE items 
                   SET name = ?, description = ?, price_eth = ?, seller_address = ?, buyer_address = ?, status = ?, image_url = ? 
                   WHERE id = ?""",
                (self.name, self.description, self.price_eth, self.seller_address,
                 self.buyer_address, self.status, self.image_url, self.id)
            )
            conn.commit()

    def delete(self):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM items WHERE id = ?", (self.id,))
            conn.commit()

    @classmethod
    def get_all_by_seller(cls, seller_address):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT id, name, description, price_eth, seller_address, buyer_address, status, image_url, created_at 
                   FROM items WHERE seller_address = ?""",
                (seller_address,))
            return [cls(*row) for row in cursor.fetchall()]

    @classmethod
    def get_all_by_buyer(cls, buyer_address):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT id, name, description, price_eth, seller_address, buyer_address, status, image_url, created_at 
                   FROM items WHERE buyer_address = ?""",
                (buyer_address,))
            return [cls(*row) for row in cursor.fetchall()]

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price_eth": self.price_eth,
            "seller_address": self.seller_address,
            "buyer_address": self.buyer_address,
            "status": self.status,
            "image_url": self.image_url,
            "created_at": self.created_at
        }


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
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''  
            CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)
        ''')
        cursor.execute('''  
            CREATE INDEX IF NOT EXISTS idx_items_seller_address ON items(seller_address)
        ''')
        cursor.execute('''  
            CREATE INDEX IF NOT EXISTS idx_items_buyer_address ON items(buyer_address)
        ''')

        conn.commit()


create_tables()
