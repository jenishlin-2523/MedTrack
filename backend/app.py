from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
from extensions import mongo
from pymongo.errors import ConnectionFailure

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config["MONGO_URI"] = "mongodb://localhost:27017/medicine_tracker"
    app.config["JWT_SECRET_KEY"] = "your-secret-key"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=1)

    mongo.init_app(app)

    # Try to connect to MongoDB and print confirmation
    try:
        # Trigger a command to check connection
        mongo.cx.admin.command('ping')
        print("✅ Connected to MongoDB successfully.")
    except ConnectionFailure as e:
        print("❌ Failed to connect to MongoDB:", e)

    JWTManager(app)

    from routes.auth_routes import auth_bp
    from routes.medicine_routes import medicine_bp
    from routes.invoice_bp import invoice_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(medicine_bp, url_prefix="/api/medicine")
    app.register_blueprint(invoice_bp, url_prefix="/api/invoice")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
