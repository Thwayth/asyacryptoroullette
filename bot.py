import json
import os
import time
import urllib.request
import urllib.parse
from http.server import BaseHTTPRequestHandler

# 24 часа
COOLDOWN = 24 * 60 * 60

# Для текущего serverless-инстанса
last_spins = {}

SIGNAL = {
    "id": "signal",
    "name": "СИГНАЛ"
}


def send_telegram_message(text):
    token = os.environ.get("BOT_TOKEN")
    admin_chat_id = os.environ.get("ADMIN_CHAT_ID")

    if not token or not admin_chat_id:
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"

    data = urllib.parse.urlencode({
        "chat_id": admin_chat_id,
        "text": text
    }).encode()

    try:
        request = urllib.request.Request(
            url,
            data=data,
            method="POST"
        )

        urllib.request.urlopen(request, timeout=10)

    except Exception:
        pass


class handler(BaseHTTPRequestHandler):

    def _response(self, status, data):
        body = json.dumps(
            data,
            ensure_ascii=False
        ).encode("utf-8")

        self.send_response(status)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )
        self.send_header(
            "Access-Control-Allow-Origin",
            "*"
        )
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type"
        )
        self.send_header(
            "Access-Control-Allow-Methods",
            "POST, OPTIONS"
        )
        self.end_headers()

        self.wfile.write(body)

    def do_OPTIONS(self):
        self._response(200, {"ok": True})

    def do_POST(self):

        try:
            length = int(
                self.headers.get("Content-Length", 0)
            )

            raw = self.rfile.read(length)

            user = json.loads(
                raw.decode("utf-8")
            )

        except Exception:
            self._response(
                400,
                {
                    "ok": False,
                    "error": "Некорректные данные"
                }
            )
            return

        user_id = str(
            user.get("user_id", "")
        )

        username = user.get(
            "username",
            ""
        )

        first_name = user.get(
            "first_name",
            ""
        )

        if not user_id:
            self._response(
                400,
                {
                    "ok": False,
                    "error": "Не указан user_id"
                }
            )
            return

        now = int(time.time())

        # Проверяем 24 часа
        previous = last_spins.get(user_id)

        if previous:
            elapsed = now - previous

            if elapsed < COOLDOWN:

                remaining = COOLDOWN - elapsed

                self._response(
                    429,
                    {
                        "ok": False,
                        "error": "cooldown",
                        "next_spin_seconds": remaining
                    }
                )

                return

        # Результат — СИГНАЛ
        prize = SIGNAL

        last_spins[user_id] = now

        # Сообщение админу
        display_name = (
            f"@{username}"
            if username
            else first_name or "Без username"
        )

        message = (
            "🎰 ASYA CRYPTO ROULETTE\n\n"
            f"👤 Игрок: {display_name}\n"
            f"🆔 ID: {user_id}\n\n"
            "🏆 Результат: СИГНАЛ"
        )

        send_telegram_message(message)

        self._response(
            200,
            {
                "ok": True,
                "prize": prize,
                "next_spin_seconds": COOLDOWN
            }
        )
