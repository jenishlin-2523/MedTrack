from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
from extensions import mongo
from pymongo.errors import ConnectionFailure

def create_app():
    app = Flask(__name__)
    
    # Load configurations from environment variables or use defaults
    import os
    from dotenv import load_dotenv
    load_dotenv()

    app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/medicine_tracker")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "your-secret-key")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=1)

    # CORS for React frontend (allow localhost and any local network IP for development)
    CORS(app, resources={r"/api/*": {
        "origins": ["http://localhost:3000", "*"], # Allow local dev and broader access if needed
        "supports_credentials": True,
        "allow_headers": ["Content-Type", "Authorization"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }})

    # Initialize MongoDB
    mongo.init_app(app)

    # Test MongoDB connection
    try:
        mongo.cx.admin.command('ping')
        print("✅ Connected to MongoDB successfully.")
    except ConnectionFailure as e:
        print("❌ Failed to connect to MongoDB:", e)

    # Initialize JWT
    JWTManager(app)

    # Import and register blueprints
    from routes.auth_routes import auth_bp
    from routes.medicine_routes import medicine_bp
    from routes.invoice_bp import invoice_bp
    from routes.patient_bp import patient_bp
    from routes.user_bp import user_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(medicine_bp, url_prefix="/api/medicine")
    app.register_blueprint(invoice_bp, url_prefix="/api/invoice")
    app.register_blueprint(patient_bp, url_prefix="/api/patient")
    app.register_blueprint(user_bp, url_prefix="/api/user")

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

