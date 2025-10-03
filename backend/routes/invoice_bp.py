# routes/invoice_bp.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from extensions import mongo
from flask_cors import CORS, cross_origin
from werkzeug.security import generate_password_hash
import random
import string
from twilio.rest import Client

# ----------------------------
# Blueprint setup
# ----------------------------
invoice_bp = Blueprint("invoice_bp_v1", __name__)
CORS(invoice_bp, origins=[
    "http://localhost:3000",       # laptop React
    "http://192.168.1.4:3000"     # mobile React
], supports_credentials=True)

# ----------------------------
# Helper functions
# ----------------------------
def generate_password(length=6):
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))

def send_sms(mobile_number, username, password):
    """Send SMS using Twilio."""
    account_sid = "AC5cd07d299ff0ba4281975cefe6b41fc1"
    auth_token = "0609975da4c753f72c77547ed1da51f3"
    twilio_number = "+19852431281"

    client = Client(account_sid, auth_token)

    message_body = (
        f"You have successfully purchased your medicine at MediTrack Pharmacy.\n"
        f"Login using the credentials below:\n\n"
        f"Username: {username}\n"
        f"Password: {password}\n\n"
        f"Login here: http://192.168.1.4:3000"
    )

    try:
        client.messages.create(
            body=message_body,
            from_=twilio_number,
            to=f"+91{mobile_number}"
        )
    except Exception as e:
        print("Twilio Error:", e)

# ----------------------------
# Create Invoice Endpoint
# ----------------------------
@invoice_bp.route("/new", methods=["POST"])
@jwt_required()
@cross_origin(origins=["http://localhost:3000"])
def create_invoice():
    user_id = get_jwt_identity()
    data = request.get_json()

    patient_name = data.get("patientName")
    contact_number = data.get("contactNumber")
    items = data.get("items")
    invoice_number = data.get("invoiceNumber")
    invoice_date = data.get("invoiceDate")

    if not patient_name or not contact_number or not items:
        return jsonify({"error": "patientName, contactNumber, and items are required"}), 400
    if len(items) == 0:
        return jsonify({"error": "Invoice must have at least one medicine item"}), 400

    # Calculate total & deduct stock
    total_amount = 0
    for item in items:
        try:
            med = mongo.db.medicines.find_one({"_id": ObjectId(item["medicineId"])})
        except Exception:
            return jsonify({"error": f"Invalid medicineId: {item.get('medicineId')}"}), 400

        if not med:
            return jsonify({"error": f"Medicine not found: {item.get('name', 'Unknown')}"}), 404

        if item["selectedQty"] > med.get("quantity", 0):
            return jsonify({"error": f"Insufficient stock for {med.get('name', 'Unknown')}. Available: {med.get('quantity', 0)}"}), 400

        mongo.db.medicines.update_one(
            {"_id": ObjectId(item["medicineId"])},
            {"$inc": {"quantity": -int(item["selectedQty"])}}
        )

        item["subtotal"] = float(item["price"]) * int(item["selectedQty"])
        total_amount += item["subtotal"]

    username = str(contact_number)
    password = None
    existing_user = mongo.db.users.find_one({"username": username})

    if not existing_user:
        # New user: create and send SMS
        password = generate_password()
        mongo.db.users.insert_one({
            "username": username,
            "password": generate_password_hash(password),
            "role": "user",
            "name": patient_name,
            "created_at": datetime.utcnow()
        })
        try:
            send_sms(contact_number, username, password)
        except Exception as e:
            print("SMS/send error:", e)
    else:
        # Existing user: update name if changed
        if existing_user.get("name") != patient_name:
            mongo.db.users.update_one(
                {"username": username},
                {"$set": {"name": patient_name, "updated_at": datetime.utcnow()}}
            )

    # Insert invoice
    invoice_data = {
        "user_id": ObjectId(user_id),
        "invoice_number": invoice_number,
        "invoice_date": invoice_date,
        "patient_name": patient_name,
        "mobile_number": contact_number,
        "username": username,
        "items": items,
        "total_amount": total_amount,
        "created_at": datetime.utcnow()
    }

    result = mongo.db.invoices.insert_one(invoice_data)

    return jsonify({
        "message": "Invoice created successfully",
        "invoice_id": str(result.inserted_id),
        "username": username,
        "password": password,  # will be None if user existed
        "login_url": "http://192.168.1.4:3000/login"
    }), 201


# ----------------------------
# Get Last Invoice
# ----------------------------
@invoice_bp.route("/last/<username>", methods=["GET"])
@jwt_required()
@cross_origin(origins=[
    "http://localhost:3000",
    "http://192.168.1.4:3000"
])
def get_last_invoice(username):
    last_invoice = mongo.db.invoices.find_one(
        {"username": username},
        sort=[("created_at", -1)]
    )
    if not last_invoice:
        return jsonify({"invoiceNumber": None})
    return jsonify({"invoiceNumber": last_invoice["invoice_number"]})

# ----------------------------
# Get Invoice Details
# ----------------------------
@invoice_bp.route("/details/<invoice_number>", methods=["GET"])
@jwt_required()
def get_invoice_details(invoice_number):
    invoice = mongo.db.invoices.find_one({"invoice_number": invoice_number}, {"_id": 0})
    if not invoice:
        return jsonify({"msg": "Invoice not found"}), 404
    return jsonify(invoice), 200


# ----------------------------
# Get All Invoices for a User
# ----------------------------
@invoice_bp.route("/all/<username>", methods=["GET"])
@jwt_required()
@cross_origin(origins=[
    "http://localhost:3000",
    "http://192.168.1.4:3000"
])
def get_all_invoices(username):
    try:
        invoices = list(mongo.db.invoices.find({"username": username}).sort("created_at", -1))
        for inv in invoices:
            inv["_id"] = str(inv["_id"])  # convert ObjectId to string
        return jsonify(invoices), 200
    except Exception as e:
        print("Error fetching invoices:", e)
        return jsonify({"error": "Failed to fetch invoices"}), 500

