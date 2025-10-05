# routes/schedule_bp.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from extensions import mongo
from datetime import datetime
from flask_cors import CORS

schedule_bp = Blueprint("schedule_bp_v1", __name__)
CORS(schedule_bp, origins=[
    "http://localhost:3000",
    "http://10.241.243.182:3000"
], supports_credentials=True)


# ----------------------------
# Get All Schedules for a User
# ----------------------------
@invoice_bp.route("/schedules", methods=["GET"])
@jwt_required()
def get_all_schedules():
    user_id = get_jwt_identity()
    try:
        invoices = list(mongo.db.invoices.find({"user_id": ObjectId(user_id)}))
        schedules = []

        for inv in invoices:
            for item in inv.get("items", []):
                schedules.append({
                    "invoice_number": inv.get("invoice_number"),
                    "name": item.get("name"),
                    "dose": item.get("dose", ""),
                    "times": [s["time"] for s in item.get("schedule", [])],
                    "expiry": item.get("expiry", ""),
                    "stockLeft": item.get("stockLeft", 0)
                })

        return jsonify(schedules), 200
    except Exception as e:
        print("Error fetching schedules:", e)
        return jsonify({"error": "Failed to fetch schedules"}), 500

