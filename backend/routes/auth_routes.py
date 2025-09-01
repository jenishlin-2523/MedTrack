from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import mongo

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", "user")  # default role is user

    if not username or not password:
        return jsonify({"msg": "Missing username or password"}), 400

    existing_user = mongo.db.users.find_one({"username": username})
    if existing_user:
        return jsonify({"msg": "Username already exists"}), 409

    hashed_pw = generate_password_hash(password)
    mongo.db.users.insert_one({
        "username": username,
        "password": hashed_pw,
        "role": role
    })

    return jsonify({"msg": f"{role.capitalize()} registered successfully"}), 201



@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = mongo.db.users.find_one({"username": username})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"msg": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user["_id"]))
    return jsonify({
        "access_token": access_token,
        "role": user.get("role", "user"),  # include role in response
        "msg": "Login successful"
    }), 200

