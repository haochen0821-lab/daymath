import os
import time
from flask import Blueprint, request, jsonify, send_from_directory
from app.db import get_db

api = Blueprint("api", __name__, url_prefix="/api")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "instance", "uploads")


# ──────────── Profiles ────────────

@api.route("/profiles", methods=["GET"])
def list_profiles():
    conn = get_db()
    rows = conn.execute("SELECT * FROM profiles ORDER BY created_at").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@api.route("/profiles", methods=["POST"])
def create_profile():
    data = request.get_json()
    name = (data.get("name") or "").strip()
    avatar = data.get("avatar", "\U0001f9d1")
    if not name:
        return jsonify({"error": "name required"}), 400
    pid = "p_" + str(int(time.time() * 1000))
    conn = get_db()
    conn.execute(
        "INSERT INTO profiles (id, name, avatar, created_at) VALUES (?, ?, ?, ?)",
        (pid, name, avatar, int(time.time())),
    )
    conn.commit()
    conn.close()
    return jsonify({"id": pid, "name": name, "avatar": avatar}), 201


@api.route("/profiles/<pid>", methods=["PUT"])
def update_profile(pid):
    data = request.get_json()
    fields, values = [], []
    if "name" in data:
        n = (data["name"] or "").strip()
        if not n:
            return jsonify({"error": "name required"}), 400
        fields.append("name = ?")
        values.append(n)
    if "avatar" in data:
        fields.append("avatar = ?")
        values.append(data["avatar"])
    if not fields:
        return jsonify({"error": "nothing to update"}), 400
    values.append(pid)
    conn = get_db()
    conn.execute(f"UPDATE profiles SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@api.route("/profiles/<pid>", methods=["DELETE"])
def delete_profile(pid):
    conn = get_db()
    conn.execute("DELETE FROM profiles WHERE id = ?", (pid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ──────────── History ────────────

@api.route("/history/<profile_id>", methods=["GET"])
def get_history(profile_id):
    op = request.args.get("operation")
    lvl = request.args.get("level")
    mode = request.args.get("mode")
    mv = request.args.get("mode_value")
    ts_from = request.args.get("from")  # unix ms
    ts_to = request.args.get("to")      # unix ms
    sql = "SELECT * FROM history WHERE profile_id = ?"
    params = [profile_id]
    if op:
        sql += " AND operation = ?"
        params.append(op)
    if lvl:
        sql += " AND level = ?"
        params.append(int(lvl))
    if mode:
        sql += " AND mode = ?"
        params.append(mode)
    if mv:
        sql += " AND mode_value = ?"
        params.append(int(mv))
    if ts_from:
        sql += " AND timestamp >= ?"
        params.append(int(ts_from))
    if ts_to:
        sql += " AND timestamp <= ?"
        params.append(int(ts_to))
    sql += " ORDER BY timestamp DESC"
    conn = get_db()
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@api.route("/history", methods=["POST"])
def save_history():
    d = request.get_json()
    conn = get_db()
    conn.execute("""
        INSERT INTO history
        (profile_id, operation, level, mode, mode_value, total_questions,
         correct_count, accuracy, total_seconds, avg_time_ms, fastest_ms, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        d["profile_id"], d["operation"], d["level"], d["mode"],
        d["mode_value"], d["total_questions"], d["correct_count"],
        d["accuracy"], d["total_seconds"], d["avg_time_ms"],
        d["fastest_ms"], d["timestamp"],
    ))
    conn.commit()
    conn.close()
    return jsonify({"ok": True}), 201


# ──────────── Leaderboard ────────────

@api.route("/leaderboard", methods=["GET"])
def leaderboard():
    op = request.args.get("operation", "")
    lvl = request.args.get("level", "")
    mode = request.args.get("mode", "")
    mv = request.args.get("mode_value", "")
    if not (op and lvl and mode and mv):
        return jsonify([])

    conn = get_db()
    if mode == "timeAttack":
        sql = """
            SELECT h.profile_id, p.name, p.avatar,
                   MAX(h.correct_count) as correct_count,
                   h.accuracy, h.total_seconds, h.avg_time_ms
            FROM history h JOIN profiles p ON h.profile_id = p.id
            WHERE h.operation = ? AND h.level = ? AND h.mode = ? AND h.mode_value = ?
            GROUP BY h.profile_id
            ORDER BY correct_count DESC
        """
    else:
        sql = """
            SELECT h.profile_id, p.name, p.avatar,
                   h.correct_count,
                   h.accuracy, MIN(h.total_seconds) as total_seconds, h.avg_time_ms
            FROM history h JOIN profiles p ON h.profile_id = p.id
            WHERE h.operation = ? AND h.level = ? AND h.mode = ? AND h.mode_value = ?
            GROUP BY h.profile_id
            ORDER BY total_seconds ASC
        """
    rows = conn.execute(sql, (op, int(lvl), mode, int(mv))).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ──────────── Personal Bests ────────────

@api.route("/personal-bests/<profile_id>", methods=["GET"])
def personal_bests(profile_id):
    """Return this profile's best for every operation/level/mode/mode_value combo."""
    conn = get_db()
    sprint = conn.execute("""
        SELECT operation, level, mode, mode_value,
               MIN(total_seconds) as best_seconds,
               correct_count, accuracy, avg_time_ms, total_questions
        FROM history
        WHERE profile_id = ? AND mode = 'sprint'
        GROUP BY operation, level, mode_value
    """, (profile_id,)).fetchall()
    ta = conn.execute("""
        SELECT operation, level, mode, mode_value,
               total_seconds as best_seconds,
               MAX(correct_count) as correct_count, accuracy, avg_time_ms, total_questions
        FROM history
        WHERE profile_id = ? AND mode = 'timeAttack'
        GROUP BY operation, level, mode_value
    """, (profile_id,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in sprint] + [dict(r) for r in ta])


# ──────────── Full Rankings (all combos) ────────────

@api.route("/rankings", methods=["GET"])
def rankings():
    """Return every profile's personal best for every operation/level/mode combo."""
    conn = get_db()

    # Sprint: best = lowest total_seconds
    sprint_rows = conn.execute("""
        SELECT h.profile_id, p.name, p.avatar,
               h.operation, h.level, h.mode, h.mode_value,
               MIN(h.total_seconds) as best_seconds,
               h.correct_count, h.accuracy, h.avg_time_ms
        FROM history h JOIN profiles p ON h.profile_id = p.id
        WHERE h.mode = 'sprint'
        GROUP BY h.profile_id, h.operation, h.level, h.mode_value
    """).fetchall()

    # TimeAttack: best = highest correct_count
    ta_rows = conn.execute("""
        SELECT h.profile_id, p.name, p.avatar,
               h.operation, h.level, h.mode, h.mode_value,
               h.total_seconds as best_seconds,
               MAX(h.correct_count) as correct_count, h.accuracy, h.avg_time_ms
        FROM history h JOIN profiles p ON h.profile_id = p.id
        WHERE h.mode = 'timeAttack'
        GROUP BY h.profile_id, h.operation, h.level, h.mode_value
    """).fetchall()

    conn.close()
    return jsonify([dict(r) for r in sprint_rows] + [dict(r) for r in ta_rows])


# ──────────── Icon Upload ────────────

@api.route("/icon", methods=["POST"])
def upload_icon():
    if "icon" not in request.files:
        return jsonify({"error": "no file"}), 400
    f = request.files["icon"]
    if not f.filename:
        return jsonify({"error": "no file"}), 400
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    dest = os.path.join(UPLOAD_DIR, "icon-512.png")
    f.save(dest)
    # Also copy to static for serving
    static_dest = os.path.join(os.path.dirname(__file__), "static", "icon-512.png")
    import shutil
    shutil.copy2(dest, static_dest)
    return jsonify({"ok": True})


@api.route("/icon", methods=["GET"])
def get_icon_status():
    path = os.path.join(UPLOAD_DIR, "icon-512.png")
    return jsonify({"has_icon": os.path.exists(path)})
