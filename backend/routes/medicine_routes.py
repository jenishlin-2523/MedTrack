from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from extensions import mongo
from datetime import datetime, timedelta
import io
import csv
from werkzeug.utils import secure_filename

medicine_bp = Blueprint("medicine", __name__)

# --------------------------
# Add single medicine manually
# --------------------------
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


# --------------------------
# Upload medicine CSV
# --------------------------
@medicine_bp.route("/upload-csv", methods=["POST"])
@jwt_required()
def upload_csv():
    user_id = get_jwt_identity()

    if 'csv' not in request.files:
        return jsonify({"error": "CSV file missing"}), 400

    file = request.files['csv']
    if not file.filename.endswith('.csv'):
        return jsonify({"error": "Invalid file format. Please upload a .csv file"}), 400

    try:
        # Try decoding with UTF-8 first, fallback to Latin-1
        raw_data = file.stream.read()
        try:
            content = raw_data.decode("utf-8-sig")
        except UnicodeDecodeError:
            content = raw_data.decode("latin-1")
            
        stream = io.StringIO(content)
        reader = csv.DictReader(stream)
        
        # Normalize field names
        reader.fieldnames = [name.lower().strip() for name in reader.fieldnames] if reader.fieldnames else []
        
        entries = []
        errors = []
        today = datetime.today().date()

        for index, row in enumerate(reader, start=1):
            try:
                # Required fields
                name = row.get("name") or row.get("medicine_name") or row.get("medicine name")
                expiry_str = row.get("expiry_date") or row.get("expiry date") or row.get("expiry")
                
                if not name:
                    continue # Skip truly empty rows

                # If expiry is missing, use a very far future date as a placeholder if needed, 
                # but better to skip or default.
                expiry_date = None
                if expiry_str:
                    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d", "%d/%m/%Y"):
                        try:
                            expiry_date = datetime.strptime(expiry_str.strip(), fmt).date()
                            break
                        except ValueError:
                            continue

                # If still no expiry, default to 1 year from now to ensure it gets uploaded
                if not expiry_date:
                    expiry_date = today + timedelta(days=365)

                entry = {
                    "user_id": ObjectId(user_id),
                    "name": name.strip(),
                    "price": float(row.get("price") or 0),
                    "manufacturer_name": (row.get("manufacturer_name") or row.get("manufacturer") or "").strip(),
                    "type": (row.get("type") or "").strip(),
                    "pack_size_label": (row.get("pack_size_label") or row.get("pack_size") or "").strip(),
                    "expiry_date": expiry_date.strftime("%Y-%m-%d"),
                    "quantity": int(row.get("quantity") or 0),
                    "notification_read": False
                }
                entries.append(entry)
            except Exception as row_err:
                errors.append(f"Row {index}: {str(row_err)}")

        if entries:
            mongo.db.medicines.insert_many(entries)
            return jsonify({
                "msg": f"{len(entries)} medicines uploaded successfully",
                "skipped_errors": errors
            }), 201
        else:
            return jsonify({"error": "No data found in CSV"}), 400

    except Exception as e:
        return jsonify({"error": "Failed to process CSV", "details": str(e)}), 500


# --------------------------
# List all medicines with expiry status
# --------------------------
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


# --------------------------
# Get minimal medicine list (dropdowns etc.)
# --------------------------
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
            "quantity": med.get("quantity", 0),
            "is_discontinued": med.get("is_discontinued", False),
        })

    return jsonify(medicine_list), 200


# --------------------------
# Get medicine by ID (for auto-fill)
# --------------------------
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


# --------------------------
# Reduce stock when invoice is created
# --------------------------
def reduce_stock(items):
    """
    items: list of {medicineId, selectedQty}
    """
    for item in items:
        mongo.db.medicines.update_one(
            {"_id": ObjectId(item["medicineId"])},
            {"$inc": {"quantity": -int(item["selectedQty"])}}
        )


# --------------------------
# Admin: Get all medicine stock
# --------------------------
@medicine_bp.route("/admin/stock", methods=["GET"])
@jwt_required()
def admin_stock():
    user_id = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if user.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    medicines = mongo.db.medicines.find()
    stock = []
    for med in medicines:
        stock.append({
            "id": str(med["_id"]),
            "name": med["name"],
            "expiry_date": med["expiry_date"],
            "quantity": med.get("quantity", 0),
            "price": med.get("price", 0),
            "manufacturer_name": med.get("manufacturer_name", ""),
            "type": med.get("type", "")
        })

    return jsonify(stock), 200

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