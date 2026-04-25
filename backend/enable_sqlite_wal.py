"""SQLite bazasini konkurrent yozuvga moslash — bir marta ishlating.

Bu skript SQLite DB fayliga WAL (Write-Ahead Logging) rejimini qo'llaydi.
WAL bir vaqtda ko'p reader va 1 writerga ruxsat beradi, lock'larni kamaytiradi.

Ishlatish:
    cd backend
    python enable_sqlite_wal.py

Skript qayta ishga tushirilsa ham xavfsiz (idempotent — allaqachon WAL bo'lsa, hech narsa o'zgarmaydi).
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path


def main() -> int:
    db_path = Path("db.sqlite3")
    if not db_path.exists():
        db_path = Path("test.sqlite3")
    if not db_path.exists():
        print("ERROR: db.sqlite3 yoki test.sqlite3 topilmadi. backend/ papkasida ishga tushiring.")
        return 1

    print(f"Database: {db_path.resolve()}")

    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.cursor()

        cur.execute("PRAGMA journal_mode;")
        current = cur.fetchone()[0]
        print(f"Joriy journal_mode: {current}")

        cur.execute("PRAGMA journal_mode=WAL;")
        new_mode = cur.fetchone()[0]
        print(f"Yangi journal_mode: {new_mode}")

        cur.execute("PRAGMA synchronous=NORMAL;")
        cur.execute("PRAGMA cache_size=-20000;")

        cur.execute("PRAGMA journal_mode;")
        final = cur.fetchone()[0]
        print(f"Tasdiqlandi: {final}")

    print("✓ SQLite WAL rejimi yoqildi. Endi konkurrent yozuvlar yaxshiroq ishlaydi.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
