import os
from flask import Blueprint, render_template, send_from_directory

main = Blueprint("main", __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "instance", "uploads")


@main.route("/")
def index():
    return render_template("index.html")


@main.route("/admin")
def admin():
    return render_template("admin.html")


@main.route("/static/icon-512.png")
def serve_icon():
    # Serve uploaded icon if exists, otherwise 404
    uploaded = os.path.join(UPLOAD_DIR, "icon-512.png")
    if os.path.exists(uploaded):
        return send_from_directory(UPLOAD_DIR, "icon-512.png")
    # Fallback to static
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    return send_from_directory(static_dir, "icon-512.png")
