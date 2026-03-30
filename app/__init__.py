import time
from flask import Flask


def create_app():
    app = Flask(__name__)

    # 用啟動時間戳當版本號，每次重啟自動刷新快取
    app.config["APP_VERSION"] = str(int(time.time()))

    @app.context_processor
    def inject_version():
        return {"app_version": app.config["APP_VERSION"]}

    @app.after_request
    def add_no_cache(response):
        if "text/html" in response.content_type:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        return response

    from app.routes import main
    app.register_blueprint(main)

    return app
