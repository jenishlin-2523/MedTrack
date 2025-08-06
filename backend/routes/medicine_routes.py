from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from extensions import mongo
from datetime import datetime, timedelta
import io
import csv
from werkzeug.utils import secure_filename

medicine_bp = Blueprint("medicine", __name__)

# ✅ Route to add a single medicine manually
@medicine_bp.route("/add", methods=["POST"])
@jwt_required()
def add_medicine():
    data = request.get_json()
    user_id = get_jwt_identity()

    try:
        expiry_date = datetime.strptime(data.get("expiry_date"), "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid expiry_date format. Use YYYY-MM-DD"}), 400

    today = datetime.today().date()
    if expiry_date <= today:
        return jsonify({"error": "Cannot add expired or today’s medicine. Please enter a future expiry date."}), 400

    medicine = {
        "user_id": ObjectId(user_id),
        "name": data.get("name"),
        "expiry_date": expiry_date.strftime("%Y-%m-%d"),
        "price": float(data.get("price", 0)),
        "manufacturer_name": data.get("manufacturer_name", ""),
        "type": data.get("type", ""),
        "pack_size_label": data.get("pack_size_label", ""),
        "quantity": int(data.get("quantity", 0)),
        "notification_read": False
    }

    result = mongo.db.medicines.insert_one(medicine)
    return jsonify({"msg": "Medicine added successfully", "id": str(result.inserted_id)}), 201


# ✅ Upload medicine stock via CSV
@medicine_bp.route("/upload-csv", methods=["POST"])
@jwt_required()
def upload_csv():
    user_id = get_jwt_identity()

    if 'csv' not in request.files:
        return jsonify({"error": "CSV file missing"}), 400

    file = request.files['csv']
    filename = secure_filename(file.filename)

    if not filename.endswith('.csv'):
        return jsonify({"error": "Invalid file format. Please upload a .csv file"}), 400

    try:
        stream = io.StringIO(file.stream.read().decode("utf-8"), newline=None)
        reader = csv.DictReader(stream)
        entries = []
        today = datetime.today().date()

        for row in reader:
            expiry_date = datetime.strptime(row["expiry_date"], "%Y-%m-%d").date()
            if expiry_date <= today:
                continue  # skip expired or today's

            entry = {
                "user_id": ObjectId(user_id),
                "name": row["name"],
                "price": float(row.get("price", 0)),
                "manufacturer_name": row.get("manufacturer_name", ""),
                "type": row.get("type", ""),
                "pack_size_label": row.get("pack_size_label", ""),
                "expiry_date": expiry_date.strftime("%Y-%m-%d"),
                "quantity": int(row.get("quantity", 0)),
                "notification_read": False
            }
            entries.append(entry)

        if entries:
            mongo.db.medicines.insert_many(entries)
            return jsonify({"msg": f"{len(entries)} medicines uploaded successfully"}), 201
        else:
            return jsonify({"msg": "No valid future medicines to upload"}), 400

    except Exception as e:
        return jsonify({"error": "Failed to process CSV", "details": str(e)}), 500


# ✅ Get list of all medicines with expiry status
@medicine_bp.route("/list", methods=["GET"])
@jwt_required()
def list_medicines():
    user_id = get_jwt_identity()
    medicines = mongo.db.medicines.find({"user_id": ObjectId(user_id)})
    today = datetime.today().date()
    result = []

    for med in medicines:
        expiry_date = datetime.strptime(med["expiry_date"], "%Y-%m-%d").date()
        days_left = (expiry_date - today).days

        if expiry_date < today:
            status = "expired"
        elif days_left < 30:
            status = "urgent – expires within 30 days"
        elif days_left < 90:
            status = "near expiry (within 3 months)"
        elif days_left < 180:
            status = "early alert (6-month zone)"
        else:
            status = "valid"

        med["_id"] = str(med["_id"])
        med["user_id"] = str(med["user_id"])
        med["status"] = status
        med["days_left"] = days_left
        result.append(med)

    return jsonify(result), 200


# ✅ Get minimal medicine list (for dropdowns etc.)
@medicine_bp.route("/medicines", methods=["GET"])
@jwt_required()
def get_all_medicines():
    user_id = get_jwt_identity()
    medicines = mongo.db.medicines.find({"user_id": ObjectId(user_id)})
    medicine_list = []

    for med in medicines:
        medicine_list.append({
            "id": str(med["_id"]),
            "name": med["name"],
            "manufacturer_name": med.get("manufacturer_name", ""),
            "type": med.get("type", ""),
            "pack_size_label": med.get("pack_size_label", ""),
            "expiry_date": med.get("expiry_date", ""),
            "is_discontinued": med.get("is_discontinued", False),
            "short_composition1": med.get("short_composition1", ""),
            "short_composition2": med.get("short_composition2", "")
        })

    return jsonify(medicine_list), 200


# ✅ Get medicine by ID (for auto-fill)
@medicine_bp.route("/medicine/<medicine_id>", methods=["GET"])
@jwt_required()
def get_medicine_by_id(medicine_id):
    user_id = get_jwt_identity()
    medicine = mongo.db.medicines.find_one({
        "_id": ObjectId(medicine_id),
        "user_id": ObjectId(user_id)
    })

    if not medicine:
        return jsonify({"error": "Medicine not found"}), 404

    return jsonify({
        "id": str(medicine["_id"]),
        "name": medicine.get("name", ""),
        "price": medicine.get("price", 0),
        "manufacturer_name": medicine.get("manufacturer_name", ""),
        "type": medicine.get("type", ""),
        "pack_size_label": medicine.get("pack_size_label", ""),
        "expiry_date": medicine.get("expiry_date", ""),
        "quantity": medicine.get("quantity", 0)
    }), 200


# ✅ Delete medicine
@medicine_bp.route("/<string:medicine_id>", methods=["DELETE"])
@jwt_required()
def delete_medicine(medicine_id):
    user_id = get_jwt_identity()

    try:
        result = mongo.db.medicines.delete_one({
            "_id": ObjectId(medicine_id),
            "user_id": ObjectId(user_id)
        })

        if result.deleted_count == 1:
            return jsonify({"msg": "Medicine deleted successfully"}), 200
        else:
            return jsonify({"error": "Medicine not found or unauthorized"}), 404

    except Exception as e:
        return jsonify({
            "error": "Invalid ID or internal error",
            "details": str(e)
        }), 400


# ✅ Get expiry notifications
@medicine_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    today = datetime.today().date()
    ninety_days_later = today + timedelta(days=90)
    thirty_days_later = today + timedelta(days=30)
    only_unread = request.args.get("unread", "true").lower() == "true"

    query = {
        "user_id": ObjectId(user_id),
        "expiry_date": {
            "$gt": today.strftime("%Y-%m-%d"),
            "$lte": ninety_days_later.strftime("%Y-%m-%d")
        }
    }

    if only_unread:
        query["notification_read"] = False

    medicines = mongo.db.medicines.find(query)
    notifications = []
    unread_count = 0

    for med in medicines:
        expiry = datetime.strptime(med["expiry_date"], "%Y-%m-%d").date()
        is_read = med.get("notification_read", False)

        if expiry <= today:
            continue

        proximity = "Urgent" if expiry <= thirty_days_later else "Near Expiry"
        if not is_read:
            unread_count += 1

        notifications.append({
            "id": str(med["_id"]),
            "medicine_name": med["name"],
            "message": f"{med['name']} is expiring on {expiry.strftime('%B %d, %Y')}",
            "proximity": proximity,
            "redirectTo": "/medicines",
            "notification_read": is_read
        })

    return jsonify({
        "notifications": notifications,
        "unreadCount": unread_count
    }), 200


# ✅ Mark notifications as read
@medicine_bp.route("/notifications/mark-as-read", methods=["PATCH"])
@jwt_required()
def mark_notifications_as_read():
    user_id = get_jwt_identity()
    today = datetime.today().date()
    ninety_days_later = today + timedelta(days=90)

    result = mongo.db.medicines.update_many(
        {
            "user_id": ObjectId(user_id),
            "expiry_date": {
                "$gt": today.strftime("%Y-%m-%d"),
                "$lte": ninety_days_later.strftime("%Y-%m-%d")
            },
            "notification_read": False
        },
        {
            "$set": {"notification_read": True}
        }
    )

    return jsonify({
        "msg": f"{result.modified_count} notifications marked as read"
    }), 200

