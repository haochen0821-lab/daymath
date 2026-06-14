import os
import time
from flask import Blueprint, request, jsonify, send_from_directory
from app.db import get_db, MAX_USERS_PER_GROUP
from app.auth import current_group_id, current_account, is_superadmin

api = Blueprint("api", __name__, url_prefix="/api")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "instance", "uploads")


def _profile_in_current_group(conn, profile_id):
    """確認該 profile 屬於目前作用中的群組（跨群組存取一律擋掉）。"""
    gid = current_group_id()
    if gid is None:
        return False
    row = conn.execute(
        "SELECT 1 FROM profiles WHERE id = ? AND group_id = ?", (profile_id, gid)
    ).fetchone()
    return row is not None


# ──────────── Profiles ────────────

@api.route("/profiles", methods=["GET"])
def list_profiles():
    gid = current_group_id()
    if gid is None:
        return jsonify([])  # 未登入 / 超管尚未選群組
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM profiles WHERE group_id = ? ORDER BY created_at", (gid,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@api.route("/profiles", methods=["POST"])
def create_profile():
    gid = current_group_id()
    if gid is None:
        return jsonify({"error": "請先登入"}), 401
    data = request.get_json()
    name = (data.get("name") or "").strip()
    avatar = data.get("avatar", "\U0001f9d1")
    if not name:
        return jsonify({"error": "name required"}), 400
    conn = get_db()
    count = conn.execute(
        "SELECT COUNT(*) AS c FROM profiles WHERE group_id = ?", (gid,)
    ).fetchone()["c"]
    if count >= MAX_USERS_PER_GROUP:
        conn.close()
        return jsonify({"error": f"每個群組最多 {MAX_USERS_PER_GROUP} 位使用者"}), 403
    pid = "p_" + str(int(time.time() * 1000))
    conn.execute(
        "INSERT INTO profiles (id, name, avatar, created_at, group_id) VALUES (?, ?, ?, ?, ?)",
        (pid, name, avatar, int(time.time()), gid),
    )
    conn.commit()
    conn.close()
    return jsonify({"id": pid, "name": name, "avatar": avatar}), 201


@api.route("/profiles/<pid>", methods=["PUT"])
def update_profile(pid):
    conn0 = get_db()
    if not _profile_in_current_group(conn0, pid):
        conn0.close()
        return jsonify({"error": "forbidden"}), 403
    conn0.close()
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
    if not _profile_in_current_group(conn, pid):
        conn.close()
        return jsonify({"error": "forbidden"}), 403
    conn.execute("DELETE FROM profiles WHERE id = ?", (pid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ──────────── History ────────────

@api.route("/history/<profile_id>", methods=["GET"])
def get_history(profile_id):
    _g = get_db()
    if not _profile_in_current_group(_g, profile_id):
        _g.close()
        return jsonify({"error": "forbidden"}), 403
    _g.close()
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
    if not _profile_in_current_group(conn, d["profile_id"]):
        conn.close()
        return jsonify({"error": "forbidden"}), 403
    cur = conn.execute("""
        INSERT INTO history
        (profile_id, operation, level, mode, mode_value, total_questions,
         correct_count, accuracy, total_seconds, avg_time_ms, fastest_ms,
         timestamp, practice_time_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        d["profile_id"], d["operation"], d["level"], d["mode"],
        d["mode_value"], d["total_questions"], d["correct_count"],
        d["accuracy"], d["total_seconds"], d["avg_time_ms"],
        d["fastest_ms"], d["timestamp"], d.get("practice_time_ms", 0),
    ))
    history_id = cur.lastrowid
    # 儲存每題明細
    answers = d.get("answers", [])
    for a in answers:
        conn.execute("""
            INSERT INTO question_details
            (history_id, profile_id, question_display, correct_answer,
             user_answer, correct, time_ms, operation, level, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            history_id, d["profile_id"], a["question_display"],
            a["correct_answer"], a["user_answer"],
            1 if a["correct"] else 0, a["time_ms"],
            d["operation"], d["level"], d["timestamp"],
        ))
    conn.commit()
    conn.close()
    return jsonify({"ok": True}), 201


@api.route("/practice-time", methods=["GET"])
def practice_time():
    """Return daily practice time per profile. Grouped by date (YYYY-MM-DD)."""
    gid = current_group_id()
    if gid is None:
        return jsonify([])
    ts_from = request.args.get("from", "0")
    ts_to = request.args.get("to", str(int(time.time() * 1000 + 86400000)))
    conn = get_db()
    rows = conn.execute("""
        SELECT p.id as profile_id, p.name, p.avatar,
               date(timestamp / 1000, 'unixepoch', 'localtime') as day,
               SUM(practice_time_ms) as total_ms,
               COUNT(*) as sessions
        FROM history h JOIN profiles p ON h.profile_id = p.id
        WHERE h.timestamp >= ? AND h.timestamp <= ? AND p.group_id = ?
        GROUP BY p.id, day
        ORDER BY day DESC
    """, (int(ts_from), int(ts_to), gid)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ──────────── Leaderboard ────────────

@api.route("/leaderboard", methods=["GET"])
def leaderboard():
    op = request.args.get("operation", "")
    lvl = request.args.get("level", "")
    mode = request.args.get("mode", "")
    mv = request.args.get("mode_value", "")
    if not (op and lvl and mode and mv):
        return jsonify([])
    gid = current_group_id()
    if gid is None:
        return jsonify([])

    conn = get_db()
    if mode == "timeAttack":
        sql = """
            SELECT h.profile_id, p.name, p.avatar,
                   MAX(h.correct_count) as correct_count,
                   h.accuracy, h.total_seconds, h.avg_time_ms
            FROM history h JOIN profiles p ON h.profile_id = p.id
            WHERE h.operation = ? AND h.level = ? AND h.mode = ? AND h.mode_value = ? AND p.group_id = ?
            GROUP BY h.profile_id
            ORDER BY correct_count DESC
        """
    else:
        sql = """
            SELECT h.profile_id, p.name, p.avatar,
                   h.correct_count,
                   h.accuracy, MIN(h.total_seconds) as total_seconds, h.avg_time_ms
            FROM history h JOIN profiles p ON h.profile_id = p.id
            WHERE h.operation = ? AND h.level = ? AND h.mode = ? AND h.mode_value = ? AND p.group_id = ?
            GROUP BY h.profile_id
            ORDER BY total_seconds ASC
        """
    rows = conn.execute(sql, (op, int(lvl), mode, int(mv), gid)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ──────────── Personal Bests ────────────

@api.route("/personal-bests/<profile_id>", methods=["GET"])
def personal_bests(profile_id):
    """Return this profile's best for every operation/level/mode/mode_value combo."""
    conn = get_db()
    if not _profile_in_current_group(conn, profile_id):
        conn.close()
        return jsonify({"error": "forbidden"}), 403
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
    gid = current_group_id()
    if gid is None:
        return jsonify([])
    conn = get_db()

    # Sprint: best = lowest total_seconds
    sprint_rows = conn.execute("""
        SELECT h.profile_id, p.name, p.avatar,
               h.operation, h.level, h.mode, h.mode_value,
               MIN(h.total_seconds) as best_seconds,
               h.correct_count, h.accuracy, h.avg_time_ms
        FROM history h JOIN profiles p ON h.profile_id = p.id
        WHERE h.mode = 'sprint' AND p.group_id = ?
        GROUP BY h.profile_id, h.operation, h.level, h.mode_value
    """, (gid,)).fetchall()

    # TimeAttack: best = highest correct_count
    ta_rows = conn.execute("""
        SELECT h.profile_id, p.name, p.avatar,
               h.operation, h.level, h.mode, h.mode_value,
               h.total_seconds as best_seconds,
               MAX(h.correct_count) as correct_count, h.accuracy, h.avg_time_ms
        FROM history h JOIN profiles p ON h.profile_id = p.id
        WHERE h.mode = 'timeAttack' AND p.group_id = ?
        GROUP BY h.profile_id, h.operation, h.level, h.mode_value
    """, (gid,)).fetchall()

    conn.close()
    return jsonify([dict(r) for r in sprint_rows] + [dict(r) for r in ta_rows])


# ──────────── 錯題本 ────────────

def _review_stats(conn, profile_id):
    """回傳每題的複習統計：答對次數、答錯次數、目前連續答對次數（streak）。"""
    stats = {}
    rows = conn.execute(
        """SELECT question_display, correct_answer, correct
           FROM review_attempts WHERE profile_id = ?
           ORDER BY id ASC""",
        (profile_id,),
    ).fetchall()
    for r in rows:
        key = (r["question_display"], r["correct_answer"])
        s = stats.get(key)
        if s is None:
            s = {"review_correct": 0, "review_wrong": 0, "review_streak": 0}
            stats[key] = s
        if r["correct"]:
            s["review_correct"] += 1
            s["review_streak"] += 1  # 連續答對 +1
        else:
            s["review_wrong"] += 1
            s["review_streak"] = 0   # 答錯就歸零
    return stats


@api.route("/wrong-questions/<profile_id>", methods=["GET"])
def wrong_questions(profile_id):
    """取得答錯的題目（去重），附帶複習統計，排除已移除的。"""
    op = request.args.get("operation")
    lvl = request.args.get("level")
    ts_from = request.args.get("from")
    ts_to = request.args.get("to")
    limit = request.args.get("limit", "50")

    conn = get_db()
    if not _profile_in_current_group(conn, profile_id):
        conn.close()
        return jsonify({"error": "forbidden"}), 403

    # 取得已移除的題目
    dismissed = set()
    for r in conn.execute(
        "SELECT question_display, correct_answer FROM dismissed_questions WHERE profile_id = ?",
        (profile_id,),
    ).fetchall():
        dismissed.add((r["question_display"], r["correct_answer"]))

    # 取得答錯的題目（去重，取最新一筆）
    sql = """SELECT qd.question_display, qd.correct_answer, qd.user_answer,
                    qd.time_ms, qd.operation, qd.level, qd.timestamp,
                    MAX(qd.id) as id
             FROM question_details qd JOIN history h ON qd.history_id = h.id
             WHERE qd.profile_id = ? AND qd.correct = 0"""
    params = [profile_id]
    if op:
        sql += " AND qd.operation = ?"
        params.append(op)
    if lvl:
        sql += " AND qd.level = ?"
        params.append(int(lvl))
    if ts_from:
        sql += " AND qd.timestamp >= ?"
        params.append(int(ts_from))
    if ts_to:
        sql += " AND qd.timestamp <= ?"
        params.append(int(ts_to))
    sql += " GROUP BY qd.question_display, qd.correct_answer"
    sql += " ORDER BY qd.timestamp DESC LIMIT ?"
    params.append(int(limit))
    rows = conn.execute(sql, params).fetchall()

    # 取得每題的複習統計
    review_stats = _review_stats(conn, profile_id)
    default_stat = {"review_correct": 0, "review_wrong": 0, "review_streak": 0}

    result = []
    for r in rows:
        key = (r["question_display"], r["correct_answer"])
        if key in dismissed:
            continue
        item = dict(r)
        stats = review_stats.get(key, default_stat)
        item["review_correct"] = stats["review_correct"]
        item["review_wrong"] = stats["review_wrong"]
        item["review_streak"] = stats["review_streak"]
        result.append(item)

    conn.close()
    return jsonify(result)


@api.route("/slowest-questions/<profile_id>", methods=["GET"])
def slowest_questions(profile_id):
    """取得作答最慢的前 N 題。"""
    op = request.args.get("operation")
    lvl = request.args.get("level")
    ts_from = request.args.get("from")
    ts_to = request.args.get("to")
    limit = request.args.get("limit", "10")

    conn = get_db()
    if not _profile_in_current_group(conn, profile_id):
        conn.close()
        return jsonify({"error": "forbidden"}), 403

    dismissed = set()
    for r in conn.execute(
        "SELECT question_display, correct_answer FROM dismissed_questions WHERE profile_id = ?",
        (profile_id,),
    ).fetchall():
        dismissed.add((r["question_display"], r["correct_answer"]))

    sql = """SELECT qd.question_display, qd.correct_answer, qd.user_answer,
                    MAX(qd.time_ms) as time_ms, qd.operation, qd.level, qd.timestamp,
                    MAX(qd.id) as id
             FROM question_details qd JOIN history h ON qd.history_id = h.id
             WHERE qd.profile_id = ?"""
    params = [profile_id]
    if op:
        sql += " AND qd.operation = ?"
        params.append(op)
    if lvl:
        sql += " AND qd.level = ?"
        params.append(int(lvl))
    if ts_from:
        sql += " AND qd.timestamp >= ?"
        params.append(int(ts_from))
    if ts_to:
        sql += " AND qd.timestamp <= ?"
        params.append(int(ts_to))
    sql += " GROUP BY qd.question_display, qd.correct_answer"
    sql += " ORDER BY time_ms DESC LIMIT ?"
    # 多取一些以排除 dismissed 後仍有足夠結果
    params.append(int(limit) + len(dismissed))
    rows = conn.execute(sql, params).fetchall()

    review_stats = _review_stats(conn, profile_id)
    default_stat = {"review_correct": 0, "review_wrong": 0, "review_streak": 0}

    result = []
    for r in rows:
        key = (r["question_display"], r["correct_answer"])
        if key in dismissed:
            continue
        item = dict(r)
        stats = review_stats.get(key, default_stat)
        item["review_correct"] = stats["review_correct"]
        item["review_wrong"] = stats["review_wrong"]
        item["review_streak"] = stats["review_streak"]
        result.append(item)
        if len(result) >= int(limit):
            break

    conn.close()
    return jsonify(result)


@api.route("/review-results", methods=["POST"])
def save_review_results():
    """儲存錯題練習的每題結果。"""
    d = request.get_json()
    profile_id = d.get("profile_id")
    answers = d.get("answers", [])
    ts = d.get("timestamp", int(time.time() * 1000))
    if not profile_id or not answers:
        return jsonify({"error": "missing data"}), 400
    conn = get_db()
    if not _profile_in_current_group(conn, profile_id):
        conn.close()
        return jsonify({"error": "forbidden"}), 403
    for a in answers:
        conn.execute("""
            INSERT INTO review_attempts
            (profile_id, question_display, correct_answer, user_answer,
             correct, time_ms, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            profile_id, a["question_display"], a["correct_answer"],
            a["user_answer"], 1 if a["correct"] else 0,
            a["time_ms"], ts,
        ))
    conn.commit()
    conn.close()
    return jsonify({"ok": True}), 201


@api.route("/dismiss-question/<profile_id>", methods=["POST"])
def dismiss_question(profile_id):
    """將題目從錯題本移除。"""
    d = request.get_json()
    display = d.get("question_display")
    answer = d.get("correct_answer")
    if not display or answer is None:
        return jsonify({"error": "missing data"}), 400
    conn = get_db()
    if not _profile_in_current_group(conn, profile_id):
        conn.close()
        return jsonify({"error": "forbidden"}), 403
    # 避免重複
    existing = conn.execute(
        """SELECT id FROM dismissed_questions
           WHERE profile_id = ? AND question_display = ? AND correct_answer = ?""",
        (profile_id, display, answer),
    ).fetchone()
    if not existing:
        conn.execute(
            """INSERT INTO dismissed_questions
               (profile_id, question_display, correct_answer, dismissed_at)
               VALUES (?, ?, ?, ?)""",
            (profile_id, display, answer, int(time.time() * 1000)),
        )
        conn.commit()
    conn.close()
    return jsonify({"ok": True})


@api.route("/restore-question/<profile_id>", methods=["POST"])
def restore_question(profile_id):
    """將已移除的題目恢復到錯題本。"""
    d = request.get_json()
    display = d.get("question_display")
    answer = d.get("correct_answer")
    if not display or answer is None:
        return jsonify({"error": "missing data"}), 400
    conn = get_db()
    if not _profile_in_current_group(conn, profile_id):
        conn.close()
        return jsonify({"error": "forbidden"}), 403
    conn.execute(
        """DELETE FROM dismissed_questions
           WHERE profile_id = ? AND question_display = ? AND correct_answer = ?""",
        (profile_id, display, answer),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ──────────── Icon Upload ────────────

@api.route("/icon", methods=["POST"])
def upload_icon():
    if not is_superadmin():
        return jsonify({"error": "forbidden"}), 403
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
