# app.py
import os
import sys
from flask import Flask, request, jsonify, send_from_directory, render_template
from werkzeug.utils import secure_filename
from database.database import Item

os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding="utf-8")

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
    items = Item.get_all()
    available_items = [item for item in items if item.status == "available"]
    return render_template("index.html", products=available_items)



@app.route("/buy")
def buy():
    items = Item.get_all()
    available_items = [item for item in items if item.status == "available"]
    return render_template("buy.html", items=available_items)


# Die statische Profilseite (ohne Query-Parameter)
@app.route("/profile")
def profile():
    return render_template("profile.html")


@app.route("/api/profile", methods=["POST"])
def api_profile():
    data = request.get_json()
    user_address = data.get("user_address")

    if not user_address:
        return jsonify({"error": "Benutzeradresse nicht gefunden"}), 400

    sales = Item.get_all_by_seller(user_address)
    purchases = Item.get_all_by_buyer(user_address)

    sales_data = [sale.to_dict() for sale in sales]
    purchases_data = [purchase.to_dict()
                      for purchase in purchases if purchase is not None]

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
            item_image.save(os.path.join(
                app.config['UPLOAD_FOLDER'], filename))
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

    item = Item.get_by_id(item_id)
    if not item or item.status != 'available':
        return jsonify({"error": "Item nicht verfügbar oder nicht gefunden."}), 400

    item.status = 'sold'
    item.buyer_address = buyer_address
    item.update()

    return jsonify({
        "message": "Kauf erfolgreich!"
    }), 200


@app.route("/get_seller/<int:item_id>", methods=["GET"])
def get_seller(item_id):
    item = Item.get_by_id(item_id)
    if item:
        return jsonify({"seller_address": item.seller_address})
    return jsonify({"error": "Item not found"}), 404


@app.route('/api/item/<int:item_id>/delete', methods=['DELETE'])
def delete_item(item_id):
    # Lies die Adresse aus dem Request aus (oder nutze Signer-Adresse, je nach Konzept)
    user_address = request.json.get('user_address')

    item = Item.get_by_id(item_id)
    if not item:
        return jsonify({"error": "Item nicht gefunden."}), 404

    # Prüfen, ob der Benutzer der Verkäufer ist und der Artikel verfügbar ist
    if item.seller_address.lower() != user_address.lower():
        return jsonify({"error": "Keine Berechtigung, diesen Artikel zu löschen."}), 403

    if item.status != 'available':
        return jsonify({"error": "Nur verfügbare Artikel können gelöscht werden."}), 400

    # Jetzt löschen
    item.delete()
    return jsonify({"message": f"Item {item_id} erfolgreich gelöscht."}), 200


@app.route('/api/item/<int:item_id>/update', methods=['POST'])
def update_item_with_image(item_id):
    """
    Bearbeitet einen verfügbaren Artikel mit Text- und (optional) Bild-Update.
    multipart/form-data nötig, da wir Bild hochladen können.
    """
    # Lies Form-Daten (Text-Felder)
    item_name = request.form.get('itemName')
    item_description = request.form.get('itemDescription')
    item_price_eth = request.form.get('itemPrice')
    # Aktuelle User-Adresse (Verkäufer)
    user_address = request.form.get('userAddress')

    # Finde den Artikel
    item = Item.get_by_id(item_id)
    if not item:
        return jsonify({"error": "Artikel nicht gefunden."}), 404

    # Berechtigungsprüfung (Seller + status=available)
    if item.seller_address.lower() != user_address.lower():
        return jsonify({"error": "Keine Berechtigung, diesen Artikel zu bearbeiten."}), 403
    if item.status != 'available':
        return jsonify({"error": "Nur verfügbare Artikel können bearbeitet werden."}), 400

    # Optional: Falls ein neues Bild hochgeladen wurde
    file = request.files.get('itemImage')
    if file and allowed_file(file.filename):
        # Altes Bild löschen, wenn vorhanden
        if item.image_url:
            old_filename = os.path.basename(item.image_url)  # z.B. 'bild.png'
            old_path = os.path.join(app.config['UPLOAD_FOLDER'], old_filename)
            if os.path.exists(old_path):
                os.remove(old_path)

        # Neues Bild speichern
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        new_image_url = f"/uploads/{filename}"
        item.image_url = new_image_url

    # Neue Felder zuweisen
    if item_name:
        item.name = item_name
    if item_description is not None:
        item.description = item_description
    if item_price_eth:
        item.price_eth = item_price_eth

    item.update()
    return jsonify({"message": f"Artikel '{item.name}' wurde erfolgreich aktualisiert."}), 200


@app.route("/api/transactions", methods=["POST"])
def get_transactions():
    data = request.get_json()
    user_address = data.get("user_address")

    if not user_address:
        return jsonify({"error": "Benutzeradresse fehlt"}), 400

    transactions = Item.get_all_by_buyer(user_address)

    transaction_data = [
        {
            "item_name": tx.name,
            "seller_address": tx.seller_address,
            "date": tx.created_at,
            "price_eth": tx.price_eth,
            "image_url": tx.image_url
        }
        for tx in transactions
    ]

    return jsonify(transaction_data)


if __name__ == "__main__":
    app.run(debug=True)
