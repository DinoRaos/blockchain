import os
import sqlite3
from flask import Flask, request, jsonify, send_from_directory, render_template
from werkzeug.utils import secure_filename
from database.database import Item

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


def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

# Damit die Bilder aus dem uploads-Ordner auch abgerufen werden können


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

# Route für das Rendering von HTML-Dateien


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/buy")
def buy():
    items = Item.get_all()
    available_items = [
        item for item in items if item.status == "available"]  # Filter status
    return render_template("buy.html", items=available_items)


@app.route("/profile")
def profile():
    return render_template("profile.html")


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

        # Seller-Adresse aus Metamask extrahieren (dummy)
        seller_address = request.form['sellerAddress']

        new_item = Item(
            name=item_name,
            description=item_description,
            price_eth=item_price_eth,
            seller_address=seller_address,
            buyer_address=None,  # Käufer auf null
            status="available",
            image_url=image_url
        )
        new_item.save()

        # Erfolgreiche Antwort mit Statusnachricht
        return render_template('sell.html', message=f"Das Angebot für '{item_name}' wurde erfolgreich erstellt!", message_type="success")

    # Fehlerhafte Antwort
    return render_template('sell.html', message="Fehler beim Erstellen des Angebots.", message_type="danger")


if __name__ == "__main__":
    app.run(debug=True)
