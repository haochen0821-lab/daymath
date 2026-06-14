import os
import time
import secrets
from datetime import timedelta
from flask import Flask

SECRET_KEY_PATH = os.path.join(os.path.dirname(__file__), "..", "instance", "secret_key")


def _load_secret_key():
    os.makedirs(os.path.dirname(SECRET_KEY_PATH), exist_ok=True)
    if os.path.exists(SECRET_KEY_PATH):
        with open(SECRET_KEY_PATH) as f:
            return f.read().strip()
    key = secrets.token_hex(32)
    with open(SECRET_KEY_PATH, "w") as f:
        f.write(key)
    return key


def create_app():
    app = Flask(__name__)
    app.config["APP_VERSION"] = str(int(time.time()))
    app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5MB upload limit
    app.config["SECRET_KEY"] = _load_secret_key()
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

    @app.context_processor
    def inject_version():
        return {"app_version": app.config["APP_VERSION"]}

    @app.after_request
    def add_no_cache(response):
        if "text/html" in response.content_type:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        return response

    from app.db import init_db
    init_db()

    from app.routes import main
    app.register_blueprint(main)

    from app.api import api
    app.register_blueprint(api)

    from app.auth import auth
    app.register_blueprint(auth)

    return app
