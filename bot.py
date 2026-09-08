import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from aiohttp import web
from aiogram import Bot, Dispatcher, Router
from aiogram.filters import CommandStart
from aiogram.types import Message

logging.basicConfig(level=logging.INFO)

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID")

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN не найден в Environment Variables")

if not ADMIN_CHAT_ID:
    raise RuntimeError("ADMIN_CHAT_ID не найден в Environment Variables")


router = Router()

# Храним время последней прокрутки.
# Важно: после перезапуска сервера этот список сбросится.
last_spins = {}


# =========================================================
# ПРИЗЫ — ВИЗУАЛЬНЫЕ ДАННЫЕ
# =========================================================

PRIZES = [
    {
        "id": "money",
        "name": "$1,000",
        "description": "Денежный приз",
        "chance": 12,
        "icon": "💵"
    },
    {
        "id": "tools",
        "name": "ИНСТРУМЕНТЫ ДЛЯ ТРЕЙДИНГА",
        "description": "Полезные инструменты",
        "chance": 28,
        "icon": "🛠️"
    },
    {
        "id": "setup",
        "name": "ИНСАЙДЕРСКИЙ СЕТАП",
        "description": "Торговый сетап",
        "chance": 20,
        "icon": "💎"
    },
    {
        "id": "signal",
        "name": "СИГНАЛ",
        "description": "Торговый сигнал",
        "chance": 40,
        "icon": "📈"
    }
]


# Фактический результат рулетки
WINNING_PRIZE_ID = "signal"


# =========================================================
# TELEGRAM /START
# =========================================================

@router.message(CommandStart())
async def start_handler(message: Message):

    keyboard = {
        "inline_keyboard": [
            [
                {
                    "text": "🎀 Открыть рулетку",
                    "web_app": {
                        "url": os.getenv(
                            "WEB_APP_URL",
                            "https://your-vercel-project.vercel.app"
                        )
                    }
                }
            ]
        ]
    }

    from aiogram.types import InlineKeyboardMarkup

    await message.answer(
        "🎀 ASYA CRYPTO ROULETTE\n\n"
        "Испытай удачу и получи свой приз ✨\n\n"
        "Нажми кнопку ниже, чтобы открыть рулетку.",
        reply_markup=InlineKeyboardMarkup(**keyboard)
    )


# =========================================================
# HEALTH CHECK
# =========================================================

async def health_handler(request):
    return web.Response(text="OK")


# =========================================================
# SPIN
# =========================================================

async def spin_handler(request):

    try:
        data = await request.json()
    except Exception:
        data = {}


    user_id = str(
        data.get("user_id", "")
    ).strip()

    username = str(
        data.get("username", "")
    ).strip()

    first_name = str(
        data.get("first_name", "")
    ).strip()


    # -----------------------------------------------------
    # Проверяем пользователя
    # -----------------------------------------------------

    if not user_id:

        return web.json_response(
            {
                "ok": False,
                "error": "Пользователь Telegram не определён"
            },
            status=400
        )


    now = datetime.now(timezone.utc)


    # -----------------------------------------------------
    # Проверка 24 часов
    # -----------------------------------------------------

    previous_spin = last_spins.get(user_id)

    if previous_spin:

        next_spin = previous_spin + timedelta(hours=24)

        if now < next_spin:

            seconds_left = int(
                (next_spin - now).total_seconds()
            )

            return web.json_response(
                {
                    "ok": False,
                    "error": "Следующая прокрутка доступна через 24 часа",
                    "seconds_left": seconds_left
                },
                status=429
            )


    # -----------------------------------------------------
    # ФАКТИЧЕСКИЙ ПРИЗ
    # -----------------------------------------------------

    prize = next(
        item
        for item in PRIZES
        if item["id"] == WINNING_PRIZE_ID
    )


    # -----------------------------------------------------
    # Запоминаем прокрутку
    # -----------------------------------------------------

    last_spins[user_id] = now


    # -----------------------------------------------------
    # Сообщение админу
    # -----------------------------------------------------

    bot = request.app["bot"]


    admin_message = (
        "🎀 НОВЫЙ ВЫИГРЫШ\n\n"
        f"🏆 Приз: {prize['name']}\n"
        f"📝 {prize['description']}\n\n"
        f"👤 Имя: {first_name or 'не указано'}\n"
        f"🔗 Username: "
        f"@{username if username else 'не указан'}\n"
        f"🆔 ID: {user_id}"
    )


    try:

        await bot.send_message(
            chat_id=ADMIN_CHAT_ID,
            text=admin_message
        )

    except Exception as error:

        logging.error(
            "Не удалось отправить сообщение админу: %s",
            error
        )


    # -----------------------------------------------------
    # Ответ сайту
    # -----------------------------------------------------

    return web.json_response(
        {
            "ok": True,

            "prize": {
                "id": prize["id"],
                "name": prize["name"],
                "description": prize["description"],
                "icon": prize["icon"]
            },

            "next_spin_seconds": 86400
        }
    )


# =========================================================
# MAIN
# =========================================================

async def main():

    bot = Bot(
        token=BOT_TOKEN
    )


    app = web.Application()

    app["bot"] = bot


    # API
    app.router.add_get(
        "/",
        health_handler
    )

    app.router.add_get(
        "/health",
        health_handler
    )

    app.router.add_post(
        "/spin",
        spin_handler
    )


    port = int(
        os.getenv(
            "PORT",
            "10000"
        )
    )


    runner = web.AppRunner(app)

    await runner.setup()


    site = web.TCPSite(
        runner,
        "0.0.0.0",
        port
    )


    await site.start()


    logging.info(
        "Server started on port %s",
        port
    )


    dp = Dispatcher()

    dp.include_router(router)


    try:

        await dp.start_polling(bot)

    finally:

        await bot.session.close()

        await runner.cleanup()


# =========================================================
# START
# =========================================================

if __name__ == "__main__":
    asyncio.run(main())
