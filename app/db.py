import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "instance", "daymath.db")


def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
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
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );
    """)
    conn.commit()
    conn.close()
