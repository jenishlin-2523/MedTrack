from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from app import mongo  # your MongoDB instance
from flask_cors import CORS, cross_origin
from twilio.rest import Client
import os

# Twilio credentials (use environment variables for security)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE = os.getenv("TWILIO_PHONE")

twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# Blueprint setup
invoice_bp = Blueprint("invoice_bp_v1", __name__)
CORS(invoice_bp, origins=["http://localhost:3000"], supports_credentials=True)

# ----------------------------
# Invoice Creation Endpoint
# ----------------------------
@invoice_bp.route("/new", methods=["POST"])
@jwt_required()
@cross_origin(origins=["http://localhost:3000"])
def create_invoice():
    user_id = get_jwt_identity()
    data = request.get_json()

    # Validate required fields
    required_fields = ["customerName", "mobileNumber", "username", "password", "items"]
    for field in required_fields:
        if field not in data or (field == "items" and len(data["items"]) == 0):
            return jsonify({"error": f"'{field}' is required"}), 400

    # Calculate total and add subtotal to items
    total_amount = 0
    for item in data["items"]:
        if "price" not in item or "quantity" not in item:
            return jsonify({"error": "Each item must have price and quantity"}), 400
        item["subtotal"] = item["price"] * item["quantity"]
        total_amount += item["subtotal"]

    invoice_data = {
        "user_id": ObjectId(user_id),
        "customer_name": data["customerName"],
        "mobile_number": data["mobileNumber"],
        "username": data["username"],
        "password": data["password"],
        "items": data["items"],
        "total_amount": total_amount,
        "created_at": datetime.utcnow()
    }

    try:
        result = mongo.db.invoices.insert_one(invoice_data)
    except Exception as e:
        return jsonify({"error": "Failed to create invoice", "details": str(e)}), 500

    return jsonify({
        "message": "Invoice created successfully",
        "invoice_id": str(result.inserted_id),
        "total_amount": total_amount
    }), 201


# ----------------------------
# Send SMS Endpoint
# ----------------------------
@invoice_bp.route("/send-sms", methods=["POST"])
@jwt_required()
@cross_origin(origins=["http://localhost:3000"])
def send_invoice_sms():
    data = request.get_json()
    mobile = data.get("mobile")
    username = data.get("username")
    password = data.get("password")

    if not mobile or not username or not password:
        return jsonify({"error": "mobile, username, and password are required"}), 400

    message_text = f"Hello! Your invoice account has been created.\nUsername: {username}\nPassword: {password}"

    try:
        sms = twilio_client.messages.create(
            body=message_text,
            from_=TWILIO_PHONE,
            to=mobile
        )
        return jsonify({"message": "SMS sent successfully", "sid": sms.sid}), 200
    except Exception as e:
        return jsonify({"error": "Failed to send SMS", "details": str(e)}), 500
