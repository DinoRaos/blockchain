# app.py
import os
import sqlite3
from flask import Flask, request, jsonify, send_from_directory, render_template
from werkzeug.utils import secure_filename
from database.database import Item, Transaction

# Konfiguration
DB_NAME = "marketplace.db"
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Stelle sicher, dass der Upload-Ordner existiert
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/buy")
def buy():
    items = Item.get_all()
    available_items = [item for item in items if item.status == "available"]
    return render_template("buy.html", items=available_items)


# Die statische Profilseite (ohne Query-Parameter)
@app.route("/profile")
def profile():
    return render_template("profile.html")


# Neuer API-Endpunkt, der die Profildaten liefert
@app.route("/api/profile", methods=["POST"])
def api_profile():
    data = request.get_json()
    user_address = data.get("user_address")
    
    if not user_address:
        return jsonify({"error": "Benutzeradresse nicht gefunden"}), 400

    # Verkaufsangebote des Nutzers
    sales = Item.get_all_by_seller(user_address)
    # Käufe des Nutzers
    transactions = Transaction.get_all_by_buyer(user_address)
    purchases = [Item.get_by_id(tx.item_id) for tx in transactions]

    sales_data = [sale.to_dict() for sale in sales]
    # Filtere mögliche None-Werte, falls ein Item nicht gefunden wurde
    purchases_data = [purchase.to_dict() for purchase in purchases if purchase is not None]

    return jsonify({
        "sales": sales_data,
        "purchases": purchases_data
    })


@app.route("/sell")
def sell():
    return render_template("sell.html")


@app.route('/sell/offer', methods=['POST'])
def offer():
    if request.method == 'POST':
        # Formulardaten
        item_name = request.form['itemName']
        item_description = request.form['itemDescription']
        item_price_eth = request.form['itemPrice']
        item_image = request.files['itemImage']

        if item_image and allowed_file(item_image.filename):
            filename = secure_filename(item_image.filename)
            item_image.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            image_url = f"/uploads/{filename}"
        else:
            image_url = None

        # Seller-Adresse aus Metamask extrahieren (dummy, da hier per Form versendet)
        seller_address = request.form['sellerAddress']

        new_item = Item(
            name=item_name,
            description=item_description,
            price_eth=item_price_eth,
            seller_address=seller_address,
            buyer_address=None,
            status="available",
            image_url=image_url
        )
        new_item.save()

        return render_template('sell.html', message=f"Das Angebot für '{item_name}' wurde erfolgreich erstellt!", message_type="success")

    return render_template('sell.html', message="Fehler beim Erstellen des Angebots.", message_type="danger")


@app.route('/buy/offer/<int:item_id>', methods=['POST'])
def buy_item(item_id):
    buyer_address = request.json.get('buyer_address')
    tx_hash = request.json.get('tx_hash')

    item = Item.get_by_id(item_id)
    if not item or item.status != 'available':
        return jsonify({"error": "Item nicht verfügbar oder nicht gefunden."}), 400

    transaction = Transaction(
        item_id=item.id,
        seller_address=item.seller_address,
        buyer_address=buyer_address,
        price_eth=item.price_eth,
        tx_hash=tx_hash
    )
    transaction.save()

    # Aktualisiere den Status des Items auf "sold" und setze die Käuferadresse
    item.status = 'sold'
    item.buyer_address = buyer_address
    item.update()

    return jsonify({
        "message": "Kauf erfolgreich!",
        "transaction_id": transaction.id
    }), 200


@app.route("/get_seller/<int:item_id>", methods=["GET"])
def get_seller(item_id):
    item = Item.get_by_id(item_id)
    if item:
        return jsonify({"seller_address": item.seller_address})
    return jsonify({"error": "Item not found"}), 404


if __name__ == "__main__":
    app.run(debug=True)
