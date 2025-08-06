from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from app import mongo  # or however you import your db

invoice_bp = Blueprint("invoice_bp", __name__)

@invoice_bp.route("/new", methods=["POST"])
@jwt_required()
def create_invoice():
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data or "items" not in data or len(data["items"]) == 0:
        return jsonify({"error": "Invoice must contain at least one item."}), 400

    total_amount = 0
    for item in data["items"]:
        if "price" not in item or "quantity" not in item:
            return jsonify({"error": "Each item must have price and quantity."}), 400
        item["subtotal"] = item["price"] * item["quantity"]
        total_amount += item["subtotal"]

    invoice_data = {
        "user_id": ObjectId(user_id),
        "items": data["items"],
        "total_amount": total_amount,
        "created_at": datetime.utcnow()
    }

    result = mongo.db.invoices.insert_one(invoice_data)

    return jsonify({
        "message": "Invoice created successfully",
        "invoice_id": str(result.inserted_id)
    }), 201
