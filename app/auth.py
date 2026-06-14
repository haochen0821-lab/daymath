import time
from functools import wraps
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from app.db import get_db, MAX_USERS_PER_GROUP

auth = Blueprint("auth", __name__, url_prefix="/api/auth")


# ──────────── Session helpers ────────────

def current_account():
    """回傳目前登入的帳號 row（dict），未登入回 None。"""
    aid = session.get("account_id")
    if not aid:
        return None
    conn = get_db()
    row = conn.execute("SELECT * FROM accounts WHERE id = ?", (aid,)).fetchone()
    conn.close()
    return dict(row) if row else None


def is_superadmin():
    acc = current_account()
    return bool(acc and acc["role"] == "superadmin")


def current_group_id():
    """目前作用中的群組 id。
    一般成員 = 自己的群組；超管 = 正在檢視的群組（view_group_id）。
    """
    acc = current_account()
    if not acc:
        return None
    if acc["role"] == "superadmin":
        return session.get("view_group_id")
    return acc["group_id"]


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_account():
            return jsonify({"error": "unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


def superadmin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not is_superadmin():
            return jsonify({"error": "forbidden"}), 403
        return fn(*args, **kwargs)
    return wrapper


def _account_public(acc, group_name=None):
    return {
        "id": acc["id"],
        "username": acc["username"],
        "role": acc["role"],
        "group_id": acc["group_id"],
        "group_name": group_name,
        "status": acc["status"],
        "must_change": bool(acc["must_change"]),
    }


# ──────────── Auth endpoints ────────────

@auth.route("/me", methods=["GET"])
def me():
    acc = current_account()
    if not acc:
        return jsonify({"account": None})
    conn = get_db()
    gid = current_group_id()
    gname = None
    if gid:
        g = conn.execute("SELECT name FROM groups WHERE id = ?", (gid,)).fetchone()
        gname = g["name"] if g else None
    conn.close()
    return jsonify({
        "account": _account_public(acc),
        "is_superadmin": acc["role"] == "superadmin",
        "view_group_id": gid,
        "view_group_name": gname,
    })


@auth.route("/register", methods=["POST"])
def register():
    d = request.get_json() or {}
    username = (d.get("username") or "").strip()
    password = d.get("password") or ""
    group_name = (d.get("group_name") or "").strip()
    if not username or not password or not group_name:
        return jsonify({"error": "帳號、密碼、群組名稱皆為必填"}), 400
    if len(password) < 4:
        return jsonify({"error": "密碼至少 4 個字元"}), 400
    conn = get_db()
    if conn.execute("SELECT id FROM accounts WHERE username = ?", (username,)).fetchone():
        conn.close()
        return jsonify({"error": "此帳號已被使用"}), 409
    now = int(time.time())
    cur = conn.execute("INSERT INTO groups (name, created_at) VALUES (?, ?)", (group_name, now))
    gid = cur.lastrowid
    conn.execute(
        """INSERT INTO accounts (username, password_hash, role, group_id, status, must_change, created_at)
           VALUES (?, ?, 'member', ?, 'pending', 0, ?)""",
        (username, generate_password_hash(password), gid, now),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "message": "註冊已送出，請等待管理員審核通過"}), 201


@auth.route("/login", methods=["POST"])
def login():
    d = request.get_json() or {}
    username = (d.get("username") or "").strip()
    password = d.get("password") or ""
    conn = get_db()
    acc = conn.execute("SELECT * FROM accounts WHERE username = ?", (username,)).fetchone()
    conn.close()
    if not acc or not check_password_hash(acc["password_hash"], password):
        return jsonify({"error": "帳號或密碼錯誤"}), 401
    if acc["role"] != "superadmin" and acc["status"] != "approved":
        msg = "帳號尚未通過審核" if acc["status"] == "pending" else "帳號已被停用"
        return jsonify({"error": msg}), 403
    session.clear()
    session["account_id"] = acc["id"]
    session.permanent = True
    return jsonify({
        "ok": True,
        "must_change": bool(acc["must_change"]),
        "is_superadmin": acc["role"] == "superadmin",
    })


@auth.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


@auth.route("/change-password", methods=["POST"])
@login_required
def change_password():
    d = request.get_json() or {}
    new_pw = d.get("new_password") or ""
    if len(new_pw) < 4:
        return jsonify({"error": "新密碼至少 4 個字元"}), 400
    acc = current_account()
    conn = get_db()
    # must_change 的帳號允許免舊密碼直接設定；否則需驗證舊密碼
    if not acc["must_change"]:
        old_pw = d.get("old_password") or ""
        if not check_password_hash(acc["password_hash"], old_pw):
            conn.close()
            return jsonify({"error": "舊密碼錯誤"}), 401
    conn.execute(
        "UPDATE accounts SET password_hash = ?, must_change = 0 WHERE id = ?",
        (generate_password_hash(new_pw), acc["id"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@auth.route("/change-group-name", methods=["POST"])
@login_required
def change_group_name():
    """成員修改自己群組的名稱。"""
    d = request.get_json() or {}
    name = (d.get("name") or "").strip()
    if not name:
        return jsonify({"error": "群組名稱不可空白"}), 400
    if len(name) > 20:
        return jsonify({"error": "群組名稱請在 20 字以內"}), 400
    acc = current_account()
    gid = acc["group_id"]
    if not gid:
        return jsonify({"error": "此帳號沒有所屬群組"}), 400
    conn = get_db()
    conn.execute("UPDATE groups SET name = ? WHERE id = ?", (name, gid))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ──────────── 超管：群組與審核管理 ────────────

@auth.route("/admin/overview", methods=["GET"])
@superadmin_required
def admin_overview():
    conn = get_db()
    groups = []
    for g in conn.execute("SELECT * FROM groups ORDER BY created_at").fetchall():
        members = conn.execute(
            "SELECT id, username, status FROM accounts WHERE group_id = ? ORDER BY created_at",
            (g["id"],),
        ).fetchall()
        pcount = conn.execute(
            "SELECT COUNT(*) AS c FROM profiles WHERE group_id = ?", (g["id"],)
        ).fetchone()["c"]
        groups.append({
            "id": g["id"], "name": g["name"], "created_at": g["created_at"],
            "profile_count": pcount,
            "accounts": [dict(m) for m in members],
        })
    pending = conn.execute(
        """SELECT a.id, a.username, a.created_at, a.group_id, g.name AS group_name
           FROM accounts a LEFT JOIN groups g ON a.group_id = g.id
           WHERE a.status = 'pending' ORDER BY a.created_at""",
    ).fetchall()
    conn.close()
    return jsonify({
        "groups": groups,
        "pending": [dict(p) for p in pending],
        "max_users_per_group": MAX_USERS_PER_GROUP,
    })


@auth.route("/admin/approve/<int:account_id>", methods=["POST"])
@superadmin_required
def approve_account(account_id):
    conn = get_db()
    conn.execute("UPDATE accounts SET status = 'approved' WHERE id = ? AND role = 'member'", (account_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@auth.route("/admin/reject/<int:account_id>", methods=["POST"])
@superadmin_required
def reject_account(account_id):
    conn = get_db()
    acc = conn.execute("SELECT * FROM accounts WHERE id = ?", (account_id,)).fetchone()
    if acc and acc["role"] == "member":
        conn.execute("UPDATE accounts SET status = 'rejected' WHERE id = ?", (account_id,))
        # 若群組沒有任何 profile 也沒有其他帳號，順手清掉空群組
        if acc["group_id"]:
            pc = conn.execute("SELECT COUNT(*) AS c FROM profiles WHERE group_id = ?", (acc["group_id"],)).fetchone()["c"]
            ac = conn.execute("SELECT COUNT(*) AS c FROM accounts WHERE group_id = ? AND status != 'rejected'", (acc["group_id"],)).fetchone()["c"]
            if pc == 0 and ac == 0:
                conn.execute("DELETE FROM groups WHERE id = ?", (acc["group_id"],))
        conn.commit()
    conn.close()
    return jsonify({"ok": True})


@auth.route("/admin/reset-password/<int:account_id>", methods=["POST"])
@superadmin_required
def reset_member_password(account_id):
    d = request.get_json() or {}
    new_pw = d.get("new_password") or ""
    if len(new_pw) < 4:
        return jsonify({"error": "新密碼至少 4 個字元"}), 400
    conn = get_db()
    conn.execute(
        "UPDATE accounts SET password_hash = ?, must_change = 0 WHERE id = ? AND role = 'member'",
        (generate_password_hash(new_pw), account_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@auth.route("/admin/delete-group/<int:group_id>", methods=["POST"])
@superadmin_required
def delete_group(group_id):
    conn = get_db()
    conn.execute("DELETE FROM groups WHERE id = ?", (group_id,))  # CASCADE 帶走 accounts/profiles/紀錄
    conn.commit()
    conn.close()
    if session.get("view_group_id") == group_id:
        session.pop("view_group_id", None)
    return jsonify({"ok": True})


@auth.route("/admin/view-group", methods=["POST"])
@superadmin_required
def view_group():
    d = request.get_json() or {}
    gid = d.get("group_id")
    conn = get_db()
    g = conn.execute("SELECT id FROM groups WHERE id = ?", (gid,)).fetchone()
    conn.close()
    if not g:
        return jsonify({"error": "群組不存在"}), 404
    session["view_group_id"] = gid
    return jsonify({"ok": True})


@auth.route("/admin/exit-view", methods=["POST"])
@superadmin_required
def exit_view():
    session.pop("view_group_id", None)
    return jsonify({"ok": True})
