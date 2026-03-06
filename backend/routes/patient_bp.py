# routes/patient_bp.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from extensions import mongo
from flask_cors import CORS, cross_origin

import os
from dotenv import load_dotenv
load_dotenv()

patient_bp = Blueprint("patient_bp", __name__)
CORS(patient_bp, origins=["http://localhost:3000", "*"], supports_credentials=True)

@patient_bp.route("/user-dashboard", methods=["GET"])
@jwt_required()
def patient_dashboard():
    user_id = get_jwt_identity()

    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Fetch all invoices for this patient
    invoices = list(mongo.db.invoices.find({"username": user.get("username")}))

    # Format response
    formatted_invoices = []
    for inv in invoices:
        formatted_invoices.append({
            "id": str(inv["_id"]),
            "invoice_number": inv.get("invoice_number"),
            "invoice_date": inv.get("invoice_date"),
            "items": inv.get("items", []),
            "total_amount": inv.get("total_amount", 0)
        })

    return jsonify({
        "username": user.get("username"),
        "name": user.get("name"),
        "invoices": formatted_invoices
    }), 200
