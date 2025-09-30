
from flask import Flask, jsonify
from flask_cors import CORS
from api.route import api_bp

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Blueprints
    app.register_blueprint(api_bp, url_prefix="/api")

    # Health check
    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "not_found", "message": "Resource not found"}), 404

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "bad_request", "message": str(e)}), 400

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "server_error", "message": "Internal server error"}), 500

    return app

if __name__ == "__main__":
    app = create_app()
    # 開発時は debug=True でもOK（本番はFalse推奨）
    app.run(host="0.0.0.0", port=8000, debug=True)