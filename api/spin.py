import json
import os
import time
import urllib.parse
import urllib.request

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
    }).encode()

    try:
        request = urllib.request.Request(
            url,
            data=data,
            method="POST"
        )

        urllib.request.urlopen(
            request,
            timeout=10
        )

    except Exception as e:
        print("Telegram error:", e)


def handler(request):

    if request.method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            },
            "body": ""
        }

    if request.method != "POST":
        return {
            "statusCode": 405,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "ok": False,
                "error": "Method not allowed"
            })
        }

    try:
        body = request.body

        if isinstance(body, bytes):
            body = body.decode("utf-8")

        user = json.loads(body)

    except Exception as e:
        print("JSON error:", e)

        return {
            "statusCode": 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "ok": False,
                "error": "Invalid JSON"
            })
        }

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

        return {
            "statusCode": 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "ok": False,
                "error": "Не указан user_id"
            })
        }

    now = int(time.time())

    previous = last_spins.get(user_id)

    if previous:

        elapsed = now - previous

        if elapsed < COOLDOWN:

            seconds_left = COOLDOWN - elapsed

            return {
                "statusCode": 429,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "ok": False,
                    "error": "cooldown",
                    "seconds_left": seconds_left
                })
            }

    # Запоминаем прокрутку
    last_spins[user_id] = now

    # Фактический результат
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

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({
            "ok": True,
            "prize": prize,
            "next_spin_seconds": COOLDOWN
        }, ensure_ascii=False)
    }
