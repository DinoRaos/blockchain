import sqlite3

DB_NAME = "marketplace.db"


def get_db_connection():
    """
    Erstellt und gibt eine Verbindung zur SQLite-Datenbank zurück.

    :return: Eine SQLite-Datenbankverbindung.
    """
    return sqlite3.connect(DB_NAME)


class Item:
    """
    Repräsentiert einen Artikel im Marktplatz.

    Attribute:
        id (int): Eindeutige ID des Artikels.
        name (str): Name des Artikels.
        description (str): Beschreibung des Artikels.
        price_eth (float): Preis des Artikels in Ether.
        seller_address (str): Adresse des Verkäufers.
        buyer_address (str): Adresse des Käufers (falls bereits gekauft).
        status (str): Status des Artikels ("available" oder "sold").
        image_url (str): URL des Bildes des Artikels.
        created_at (str): Zeitstempel, wann der Artikel erstellt wurde.
    """

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
        """
        Speichert den Artikel in der Datenbank.
        Falls der Artikel neu ist, wird eine neue Zeile erstellt und die ID aktualisiert.
        """
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
        """
        Ruft einen Artikel anhand der Artikel-ID aus der Datenbank ab.

        :param item_id: Die ID des gesuchten Artikels.
        :return: Ein Item-Objekt, falls gefunden, ansonsten None.
        """
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
        """
        Ruft alle Artikel aus der Datenbank ab.

        :return: Eine Liste von Item-Objekten.
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT id, name, description, price_eth, seller_address, buyer_address, status, image_url, created_at 
                   FROM items""")
            return [cls(*row) for row in cursor.fetchall()]

    def update(self):
        """
        Aktualisiert die Informationen dieses Artikels in der Datenbank.
        """
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
        """
        Löscht den Artikel aus der Datenbank.
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM items WHERE id = ?", (self.id,))
            conn.commit()

    @classmethod
    def get_all_by_seller(cls, seller_address):
        """
        Ruft alle Artikel ab, die von einem bestimmten Verkäufer erstellt wurden.

        :param seller_address: Die Adresse des Verkäufers.
        :return: Eine Liste von Item-Objekten.
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT id, name, description, price_eth, seller_address, buyer_address, status, image_url, created_at 
                   FROM items WHERE seller_address = ?""",
                (seller_address,))
            return [cls(*row) for row in cursor.fetchall()]

    @classmethod
    def get_all_by_buyer(cls, buyer_address):
        """
        Ruft alle Artikel ab, die von einem bestimmten Käufer erworben wurden.

        :param buyer_address: Die Adresse des Käufers.
        :return: Eine Liste von Item-Objekten.
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT id, name, description, price_eth, seller_address, buyer_address, status, image_url, created_at 
                   FROM items WHERE buyer_address = ?""",
                (buyer_address,))
            return [cls(*row) for row in cursor.fetchall()]

    def to_dict(self):
        """
        Wandelt das Item-Objekt in ein Dictionary um, um es beispielsweise als JSON zurückzugeben.

        :return: Ein Dictionary mit den Artikelattributen.
        """
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
    """
    Erstellt die erforderlichen Tabellen in der Datenbank, falls diese noch nicht existieren.
    Zusätzlich werden Indizes für häufig abgefragte Felder erstellt.
    """
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
