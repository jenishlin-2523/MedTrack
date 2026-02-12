# routes/user_bp.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import mongo
from werkzeug.security import generate_password_hash
from bson import ObjectId
from flask_cors import CORS

user_bp = Blueprint("user_bp", __name__)
CORS(user_bp, origins=[
    "http://localhost:3000",
    "http://10.152.219.167:3000"
], supports_credentials=True)

@user_bp.route("/update", methods=["PUT"])
@jwt_required()
def update_user():
    user_id = get_jwt_identity()
    data = request.get_json()
    new_username = data.get("username")
    new_password = data.get("password")

    if not new_username or not new_password:
        return jsonify({"success": False, "message": "Username and password required"}), 400

    # Check if username already exists
    existing = mongo.db.users.find_one({"username": new_username, "_id": {"$ne": ObjectId(user_id)}})
    if existing:
        return jsonify({"success": False, "message": "Username already taken"}), 400

    mongo.db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"username": new_username, "password": generate_password_hash(new_password)}}
    )

    return jsonify({"success": True, "message": "Profile updated successfully"})
