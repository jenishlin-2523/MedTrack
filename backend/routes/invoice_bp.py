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

# ----------------------------
# Blueprint setup
# ----------------------------
invoice_bp = Blueprint("invoice_bp_v1", __name__)
CORS(invoice_bp, origins=["http://localhost:3000", "*"], supports_credentials=True)

import os
from dotenv import load_dotenv
load_dotenv()


# ----------------------------
# Helper functions
# ----------------------------
def generate_password(length=8):
    """Return a random temporary password."""
    letters = string.ascii_letters + string.digits
    return ''.join(random.choice(letters) for i in range(length))

# ----------------------------
# Create Invoice
# ----------------------------
@invoice_bp.route("/new", methods=["POST"])
@jwt_required()
def create_invoice():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    patient_name = data.get("patientName")
    contact_number = data.get("contactNumber")
    items = data.get("items", [])
    invoice_number = data.get("invoiceNumber")
    invoice_date = data.get("invoiceDate")

    if not patient_name or not contact_number or not items:
        return jsonify({"error": "patientName, contactNumber, and items are required"}), 400
    if len(items) == 0:
        return jsonify({"error": "Invoice must have at least one medicine item"}), 400

    total_amount = 0
    for item in items:
        try:
            med = mongo.db.medicines.find_one({"_id": ObjectId(item["medicineId"])})
        except Exception:
            return jsonify({"error": f"Invalid medicineId: {item.get('medicineId')}"}), 400

        if not med:
            return jsonify({"error": f"Medicine not found: {item.get('name', 'Unknown')}"}), 404

        if item["selectedQty"] > med.get("quantity", 0):
            return jsonify({"error": f"Insufficient stock for {med.get('name', 'Unknown')}"}), 400

        # Deduct stock
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
        # New user created
        password = generate_password()
        mongo.db.users.insert_one({
            "username": username,
            "password": generate_password_hash(password),
            "role": "user",
            "name": patient_name,
            "created_at": datetime.utcnow()
        })
    else:
        # Update patient name if changed
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
        "password": password,
        "login_url": os.getenv("FRONTEND_URL", "http://localhost:3000") + "/login"
    }), 201


# ----------------------------
# Get Last Invoice
# ----------------------------
@invoice_bp.route("/last/<username>", methods=["GET"])
@jwt_required()
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
        
    if "user_id" in invoice:
        invoice["user_id"] = str(invoice["user_id"])
    if "created_at" in invoice and isinstance(invoice["created_at"], datetime):
        invoice["created_at"] = invoice["created_at"].isoformat()
        
    return jsonify(invoice), 200


# ----------------------------
# Get All Invoices for User
# ----------------------------
@invoice_bp.route("/all/<username>", methods=["GET"])
@jwt_required()
def get_all_invoices(username):
    try:
        invoices = list(mongo.db.invoices.find({"username": username}).sort("created_at", -1))
        for inv in invoices:
            inv["_id"] = str(inv["_id"])
            if "user_id" in inv:
                inv["user_id"] = str(inv["user_id"])
            if "created_at" in inv and isinstance(inv["created_at"], datetime):
                inv["created_at"] = inv["created_at"].isoformat()
        return jsonify(invoices), 200
    except Exception as e:
        print("Error fetching invoices:", e)
        return jsonify({"error": "Failed to fetch invoices"}), 500


# ----------------------------
# Update Quantity of Medicine in Invoice
# ----------------------------
@invoice_bp.route("/update-quantity/<invoice_number>/<medicine_id>", methods=["PATCH"])
@jwt_required()
def update_medicine_quantity(invoice_number, medicine_id):
    data = request.get_json() or {}
    reduce_by = int(data.get("reduceBy", 1))

    invoice = mongo.db.invoices.find_one({"invoice_number": invoice_number})
    if not invoice:
        return jsonify({"error": "Invoice not found"}), 404

    updated_items = []
    out_of_stock = []

    for item in invoice["items"]:
        if item.get("medicineId") == medicine_id:
            item["selectedQty"] = max(0, item["selectedQty"] - reduce_by)
            if item["selectedQty"] == 0:
                out_of_stock.append(item)
        updated_items.append(item)

    mongo.db.invoices.update_one(
        {"invoice_number": invoice_number},
        {"$set": {"items": updated_items}}
    )

    return jsonify({
        "message": "Quantity updated",
        "outOfStock": out_of_stock
    }), 200


# ----------------------------
# Reduce Stock + Mark Out-of-stock
# ----------------------------
@invoice_bp.route("/reduce-stock", methods=["POST"])
@jwt_required()
def reduce_stock():
    data = request.get_json() or {}
    medicine_id = data.get("medicineId")
    username = data.get("username")
    quantity = int(data.get("quantity", 1))

    if not medicine_id or not username:
        return jsonify({"error": "medicineId and username required"}), 400

    invoice = mongo.db.invoices.find_one({"username": username, "items.medicineId": medicine_id})
    if not invoice:
        return jsonify({"error": "Invoice or medicine not found"}), 404

    updated_items = []
    for item in invoice["items"]:
        if item["medicineId"] == medicine_id:
            item["selectedQty"] = max(0, item.get("selectedQty", 0) - quantity)
            if item["selectedQty"] <= 0:
                item["outOfStock"] = True
        updated_items.append(item)

    mongo.db.invoices.update_one(
        {"_id": ObjectId(invoice["_id"])},
        {"$set": {"items": updated_items}}
    )

    return jsonify({"message": "Stock reduced", "items": updated_items})


# ----------------------------
# Get Out-of-stock Medicines for a User
# ----------------------------
@invoice_bp.route("/out-of-stock/<username>", methods=["GET"])
@jwt_required()
def get_out_of_stock(username):
    invoices = list(mongo.db.invoices.find({"username": username}))
    out_of_stock = []

    for inv in invoices:
        for item in inv["items"]:
            if item.get("outOfStock", False):
                out_of_stock.append({
                    "invoiceNumber": inv["invoice_number"],
                    "medicineId": item["medicineId"],
                    "name": item["name"],
                    "patient": inv["patient_name"],
                    "price": item["price"],
                    "quantity": item.get("selectedQty", 0)
                })

    return jsonify(out_of_stock)


# ----------------------------
# Place a Refill Order
# ----------------------------
@invoice_bp.route("/place-order", methods=["POST"])
@jwt_required()
def place_order():
    data = request.get_json() or {}
    medicine_name = data.get("medicineName")
    quantity = int(data.get("quantity", 0))
    requested_by = data.get("requestedBy")

    if not medicine_name or quantity <= 0 or not requested_by:
        return jsonify({"error": "medicineName, quantity, and requestedBy are required"}), 400

    order_data = {
        "medicineName": medicine_name,
        "quantity": quantity,
        "requestedBy": requested_by,
        "status": "pending",
        "createdAt": datetime.utcnow()
    }

    try:
        result = mongo.db.orders.insert_one(order_data)
        return jsonify({
            "message": f"Refill requested for {medicine_name}",
            "orderId": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"error": f"Failed to place order: {str(e)}"}), 500


# ----------------------------
# Get Orders
# ----------------------------
@invoice_bp.route("/all-orders", methods=["GET"])
@jwt_required()
def all_orders():
    try:
        orders = list(mongo.db.orders.find().sort("createdAt", -1))
        for o in orders:
            o["_id"] = str(o["_id"])
            if "createdAt" in o and isinstance(o["createdAt"], datetime):
                o["createdAt"] = o["createdAt"].isoformat()
            if "acceptedAt" in o and isinstance(o["acceptedAt"], datetime):
                o["acceptedAt"] = o["acceptedAt"].isoformat()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch orders"}), 500


@invoice_bp.route("/user-orders/<username>", methods=["GET"])
@jwt_required()
def user_orders(username):
    try:
        orders = list(mongo.db.orders.find({"requestedBy": username, "status": "pending"}))
        for o in orders:
            o["_id"] = str(o["_id"])
            if "createdAt" in o and isinstance(o["createdAt"], datetime):
                o["createdAt"] = o["createdAt"].isoformat()
            if "acceptedAt" in o and isinstance(o["acceptedAt"], datetime):
                o["acceptedAt"] = o["acceptedAt"].isoformat()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch user orders"}), 500


@invoice_bp.route("/pending-orders", methods=["GET"])
@jwt_required()
def pending_orders():
    try:
        orders = list(mongo.db.orders.find({"status": "pending"}).sort("createdAt", -1))
        for o in orders:
            o["_id"] = str(o["_id"])
            if "createdAt" in o and isinstance(o["createdAt"], datetime):
                o["createdAt"] = o["createdAt"].isoformat()
            if "acceptedAt" in o and isinstance(o["acceptedAt"], datetime):
                o["acceptedAt"] = o["acceptedAt"].isoformat()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch pending orders"}), 500


@invoice_bp.route("/accept-order", methods=["POST"])
@jwt_required()
def accept_order():
    data = request.get_json() or {}
    order_id = data.get("orderId")
    if not order_id:
        return jsonify({"error": "orderId is required"}), 400

    try:
        mongo.db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": "accepted", "acceptedAt": datetime.utcnow()}}
        )
        return jsonify({"message": "Order accepted"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to accept order: {str(e)}"}), 500


# ----------------------------
# Store Invoice PDF
# ----------------------------
@invoice_bp.route("/store-pdf/<invoice_number>", methods=["POST"])
@jwt_required()
def store_invoice_pdf(invoice_number):
    data = request.get_json() or {}
    pdf_base64 = data.get("pdfBase64")
    if not pdf_base64:
        return jsonify({"error": "pdfBase64 is required"}), 400

    try:
        mongo.db.invoices.update_one(
            {"invoice_number": invoice_number},
            {"$set": {"pdf_base64": pdf_base64, "pdf_created_at": datetime.utcnow()}}
        )
        return jsonify({"message": f"PDF stored for invoice {invoice_number}"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to store PDF: {str(e)}"}), 500


# ----------------------------
# Get Invoice PDF
# ----------------------------
@invoice_bp.route("/pdf/<invoice_number>", methods=["GET"])
@jwt_required()
def get_invoice_pdf(invoice_number):
    invoice = mongo.db.invoices.find_one({"invoice_number": invoice_number}, {"_id": 0, "pdf_base64": 1})
    if not invoice or "pdf_base64" not in invoice:
        return jsonify({"error": "PDF not found"}), 404
    return jsonify({"pdfBase64": invoice["pdf_base64"]})
