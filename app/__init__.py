import time
from flask import Flask


def create_app():
    app = Flask(__name__)
    app.config["APP_VERSION"] = str(int(time.time()))
    app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5MB upload limit

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

    return app
