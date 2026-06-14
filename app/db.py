import sqlite3
import os
import time
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "instance", "daymath.db")

SUPERADMIN_USERNAME = "haochen0821"
SUPERADMIN_TEMP_PASSWORD = "daymath-setup"  # 首次登入後強制修改
DEFAULT_GROUP_NAME = "劉家"
DEFAULT_MEMBER_USERNAME = "liu"
DEFAULT_MEMBER_PASSWORD = "liu1234"
MAX_USERS_PER_GROUP = 5


def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _column_exists(conn, table, column):
    return any(r["name"] == column for r in conn.execute(f"PRAGMA table_info({table})").fetchall())


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'member',          -- superadmin | member
            group_id INTEGER,
            status TEXT NOT NULL DEFAULT 'pending',        -- pending | approved | rejected
            must_change INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            avatar TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            level INTEGER NOT NULL,
            mode TEXT NOT NULL,
            mode_value INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            correct_count INTEGER NOT NULL,
            accuracy REAL NOT NULL,
            total_seconds INTEGER NOT NULL,
            avg_time_ms INTEGER NOT NULL,
            fastest_ms INTEGER NOT NULL,
            timestamp INTEGER NOT NULL,
            practice_time_ms INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS question_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            history_id INTEGER NOT NULL,
            profile_id TEXT NOT NULL,
            question_display TEXT NOT NULL,
            correct_answer INTEGER NOT NULL,
            user_answer INTEGER NOT NULL,
            correct INTEGER NOT NULL,
            time_ms INTEGER NOT NULL,
            operation TEXT NOT NULL,
            level INTEGER NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (history_id) REFERENCES history(id) ON DELETE CASCADE,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS review_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id TEXT NOT NULL,
            question_display TEXT NOT NULL,
            correct_answer INTEGER NOT NULL,
            user_answer INTEGER NOT NULL,
            correct INTEGER NOT NULL,
            time_ms INTEGER NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS dismissed_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id TEXT NOT NULL,
            question_display TEXT NOT NULL,
            correct_answer INTEGER NOT NULL,
            dismissed_at INTEGER NOT NULL,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );
    """)
    # Migration: add practice_time_ms if missing
    if not _column_exists(conn, "history", "practice_time_ms"):
        conn.execute("ALTER TABLE history ADD COLUMN practice_time_ms INTEGER NOT NULL DEFAULT 0")
    # Migration: add group_id to profiles
    if not _column_exists(conn, "profiles", "group_id"):
        conn.execute("ALTER TABLE profiles ADD COLUMN group_id INTEGER")
    conn.commit()

    _seed(conn)
    conn.close()


def _seed(conn):
    now = int(time.time())

    # 1) 超級管理員帳號
    row = conn.execute(
        "SELECT id FROM accounts WHERE username = ?", (SUPERADMIN_USERNAME,)
    ).fetchone()
    if not row:
        conn.execute(
            """INSERT INTO accounts (username, password_hash, role, group_id, status, must_change, created_at)
               VALUES (?, ?, 'superadmin', NULL, 'approved', 1, ?)""",
            (SUPERADMIN_USERNAME, generate_password_hash(SUPERADMIN_TEMP_PASSWORD), now),
        )

    # 2) 既有 profiles 沒群組的 → 歸入預設群組「劉家」，並開一組成員帳號
    orphan = conn.execute(
        "SELECT COUNT(*) AS c FROM profiles WHERE group_id IS NULL"
    ).fetchone()["c"]
    if orphan > 0:
        g = conn.execute(
            "SELECT id FROM groups WHERE name = ?", (DEFAULT_GROUP_NAME,)
        ).fetchone()
        if g:
            gid = g["id"]
        else:
            cur = conn.execute(
                "INSERT INTO groups (name, created_at) VALUES (?, ?)",
                (DEFAULT_GROUP_NAME, now),
            )
            gid = cur.lastrowid
        conn.execute("UPDATE profiles SET group_id = ? WHERE group_id IS NULL", (gid,))
        # 成員登入帳號
        exists = conn.execute(
            "SELECT id FROM accounts WHERE username = ?", (DEFAULT_MEMBER_USERNAME,)
        ).fetchone()
        if not exists:
            conn.execute(
                """INSERT INTO accounts (username, password_hash, role, group_id, status, must_change, created_at)
                   VALUES (?, ?, 'member', ?, 'approved', 0, ?)""",
                (DEFAULT_MEMBER_USERNAME, generate_password_hash(DEFAULT_MEMBER_PASSWORD), gid, now),
            )

    conn.commit()
