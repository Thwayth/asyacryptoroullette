import json
import os
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler


COOLDOWN = 24 * 60 * 60

# Работает в рамках живого экземпляра Vercel Function.
# Для основной защиты от повторного запуска также используется
# локальный cooldown на клиенте.
last_spins = {}


def telegram_message(text):
    token = os.environ.get("BOT_TOKEN")
    chat_id = os.environ.get("ADMIN_CHAT_ID")

    if not token or not chat_id:
        print("BOT_TOKEN or ADMIN_CHAT_ID is missing")
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"

    payload = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": text
    }).encode("utf-8")

    try:
        request = urllib.request.Request(
            url,
            data=payload,
            method="POST"
        )

        urllib.request.urlopen(
            request,
            timeout=8
        )

    except Exception as error:
        print("Telegram error:", error)


class handler(BaseHTTPRequestHandler):

    def send_json(self, status, data):

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
            "GET, POST, OPTIONS"
        )

        self.end_headers()

        self.wfile.write(body)

    def do_OPTIONS(self):

        self.send_response(204)

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
            "GET, POST, OPTIONS"
        )

        self.end_headers()

    def do_GET(self):

        self.send_json(
            200,
            {
                "ok": True,
                "service": "asya-crypto-roulette"
            }
        )

    def do_POST(self):

        try:

            content_length = int(
                self.headers.get(
                    "Content-Length",
                    "0"
                )
            )

            raw_body = self.rfile.read(
                content_length
            )

            if not raw_body:
                raise ValueError("Empty request")

            data = json.loads(
                raw_body.decode("utf-8")
            )

        except Exception as error:

            print("Request parsing error:", error)

            self.send_json(
                400,
                {
                    "ok": False,
                    "error": "Invalid request"
                }
            )

            return

        user_id = str(
            data.get("user_id", "")
        )

        username = str(
            data.get("username", "")
        )

        first_name = str(
            data.get("first_name", "")
        )

        if not user_id:

            self.send_json(
                400,
                {
                    "ok": False,
                    "error": "user_id_required"
                }
            )

            return

        now = int(time.time())

        previous_spin = last_spins.get(user_id)

        if previous_spin is not None:

            elapsed = now - previous_spin

            if elapsed < COOLDOWN:

                seconds_left = COOLDOWN - elapsed

                self.send_json(
                    429,
                    {
                        "ok": False,
                        "error": "cooldown",
                        "seconds_left": seconds_left
                    }
                )

                return

        # Фиксируем прокрутку
        last_spins[user_id] = now

        # Визуально колесо показывает все призы,
        # но реальный результат всегда СИГНАЛ.
        prize = {
            "id": "signal",
            "name": "СИГНАЛ",
            "description": "Торговый сигнал",
            "icon": "📈"
        }

        if username:
            player = "@" + username
        elif first_name:
            player = first_name
        else:
            player = "Гость"

        telegram_message(
            "🎰 ASYA CRYPTO ROULETTE\n\n"
            f"👤 Игрок: {player}\n"
            f"🆔 ID: {user_id}\n\n"
            "🏆 Результат: СИГНАЛ"
        )

        self.send_json(
            200,
            {
                "ok": True,
                "prize": prize,
                "next_spin_seconds": COOLDOWN
            }
        )
