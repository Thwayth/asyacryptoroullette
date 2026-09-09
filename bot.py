import json
import os
import time
import urllib.parse
import urllib.request

COOLDOWN = 24 * 60 * 60

PRIZES = [
    {
        "id": "money",
        "name": "$1,000"
    },
    {
        "id": "tools",
        "name": "ИНСТРУМЕНТЫ"
    },
    {
        "id": "insider",
        "name": "ИНСАЙДЕРСКИЙ СЕТАП"
    },
    {
        "id": "signal",
        "name": "СИГНАЛ"
    }
]

# Результат всегда СИГНАЛ
SIGNAL = next(
    prize for prize in PRIZES
    if prize["id"] == "signal"
)

# Временное хранилище на инстансе Vercel
last_spins = {}


def send_telegram(text):
    token = os.environ.get("BOT_TOKEN")
    admin_chat_id = os.environ.get("ADMIN_CHAT_ID")

    if not token or not admin_chat_id:
        return

    url = (
        f"https://api.telegram.org/bot{token}/sendMessage"
    )

    data = urllib.parse.urlencode({
        "chat_id": admin_chat_id,
        "text": text
    }).encode()

    request = urllib.request.Request(
        url,
        data=data,
        method="POST"
    )

    try:
        urllib.request.urlopen(
            request,
            timeout=10
        )
    except Exception:
        pass


def handler(request):
    """
    Vercel entry point.
    """

    # OPTIONS
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

    # Только POST
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
        if hasattr(request, "json"):
            user = request.json
        else:
            user = json.loads(request.body)

    except Exception:
        return {
            "statusCode": 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "ok": False,
                "error": "Некорректные данные"
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

    # Проверка 24 часов
    previous = last_spins.get(user_id)

    if previous:
        elapsed = now - previous

        if elapsed < COOLDOWN:
            remaining = COOLDOWN - elapsed

            return {
                "statusCode": 429,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "ok": False,
                    "error": "cooldown",
                    "next_spin_seconds": remaining
                })
            }

    # Фиксируем прокрутку
    last_spins[user_id] = now

    # Фактический приз
    prize = SIGNAL

    if username:
        player = "@" + username
    elif first_name:
        player = first_name
    else:
        player = "Без username"

    # Уведомление админу
    send_telegram(
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
