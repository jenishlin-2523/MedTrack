# routes/patient_bp.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from extensions import mongo
from flask_cors import CORS, cross_origin

patient_bp = Blueprint("patient_bp", __name__)
CORS(patient_bp, origins=["http://localhost:3000", "http://10.152.219.167:3000"], supports_credentials=True)

@patient_bp.route("/user-dashboard", methods=["GET"])
@jwt_required()
@cross_origin(origins=["http://localhost:3000"])
def patient_dashboard():
    user_id = get_jwt_identity()

    # Fetch all invoices for this patient
    invoices = list(mongo.db.invoices.find({"username": mongo.db.users.find_one({"_id": ObjectId(user_id)})["username"]}))

    # Format response
    formatted_invoices = []
    for inv in invoices:
        formatted_invoices.append({
            "invoice_number": inv["invoice_number"],
            "invoice_date": inv["invoice_date"],
            "items": inv["items"],
            "total_amount": inv["total_amount"]
        })

    return jsonify({
        "invoices": formatted_invoices
    }), 200
