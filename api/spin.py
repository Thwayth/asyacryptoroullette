import json
import os
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler

COOLDOWN = 24 * 60 * 60

last_spins = {}


def send_admin_message(text):
    token = os.environ.get("BOT_TOKEN")
    chat_id = os.environ.get("ADMIN_CHAT_ID")

    if not token or not chat_id:
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"

    data = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": text
    }).encode("utf-8")

    try:
        request = urllib.request.Request(
            url,
            data=data,
            method="POST"
        )

        urllib.request.urlopen(request, timeout=10)

    except Exception as e:
        print("Telegram error:", e)


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
            "POST, OPTIONS"
        )
        self.end_headers()

        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
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

    def do_POST(self):

        try:
            content_length = int(
                self.headers.get(
                    "Content-Length",
                    0
                )
            )

            raw_body = self.rfile.read(
                content_length
            )

            user = json.loads(
                raw_body.decode("utf-8")
            )

        except Exception as e:

            print("JSON error:", e)

            self.send_json(
                400,
                {
                    "ok": False,
                    "error": "Invalid JSON"
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

            self.send_json(
                400,
                {
                    "ok": False,
                    "error": "Не указан user_id"
                }
            )

            return

        now = int(time.time())

        previous = last_spins.get(user_id)

        if previous:

            elapsed = now - previous

            if elapsed < COOLDOWN:

                seconds_left = (
                    COOLDOWN - elapsed
                )

                self.send_json(
                    429,
                    {
                        "ok": False,
                        "error": "cooldown",
                        "seconds_left": seconds_left
                    }
                )

                return

        last_spins[user_id] = now

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

        send_admin_message(
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

    def do_GET(self):

        self.send_json(
            200,
            {
                "ok": True,
                "message": "ASYA CRYPTO SPIN API OK"
            }
        )
