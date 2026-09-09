import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from aiohttp import web
from aiogram import Bot, Dispatcher, Router
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo


logging.basicConfig(level=logging.INFO)


# =========================================================
# SETTINGS
# =========================================================

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID")
WEB_APP_URL = os.getenv("WEB_APP_URL")


if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN не найден в Environment Variables")

if not ADMIN_CHAT_ID:
    raise RuntimeError("ADMIN_CHAT_ID не найден в Environment Variables")

if not WEB_APP_URL:
    raise RuntimeError("WEB_APP_URL не найден в Environment Variables")


router = Router()

# Последние прокрутки пользователей
last_spins = {}


# =========================================================
# VISUAL PRIZES
# =========================================================

PRIZES = [
    {
        "id": "money",
        "name": "$1,000",
        "description": "Денежный приз",
        "icon": "💵"
    },
    {
        "id": "tools",
        "name": "ИНСТРУМЕНТЫ ДЛЯ ТРЕЙДИНГА",
        "description": "Полезные инструменты",
        "icon": "🛠️"
    },
    {
        "id": "setup",
        "name": "ИНСАЙДЕРСКИЙ СЕТАП",
        "description": "Торговый сетап",
        "icon": "💎"
    },
    {
        "id": "signal",
        "name": "СИГНАЛ",
        "description": "Торговый сигнал",
        "icon": "📈"
    }
]


# =========================================================
# START
# =========================================================

@router.message(CommandStart())
async def start_handler(message: Message):

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🎀 Открыть рулетку",
                    web_app=WebAppInfo(url=WEB_APP_URL)
                )
            ]
        ]
    )

    await message.answer(
        "🎀 ASYA CRYPTO ROULETTE\n\n"
        "Испытай удачу и получи свой приз ✨",
        reply_markup=keyboard
    )


# =========================================================
# HEALTH
# =========================================================

async def health_handler(request):

    return web.Response(
        text="ASYA CRYPTO BOT OK"
    )


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


    # Проверяем пользователя

    if not user_id:

        return web.json_response(
            {
                "ok": False,
                "error": "Пользователь не определён"
            },
            status=400
        )


    now = datetime.now(timezone.utc)


    # =====================================================
    # 24 HOURS LIMIT
    # =====================================================

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


    # =====================================================
    # RESULT
    # =====================================================

    # Гарантированный приз

    prize = next(
        item for item in PRIZES
        if item["id"] == "signal"
    )


    # Сохраняем время прокрутки

    last_spins[user_id] = now


    # =====================================================
    # ADMIN MESSAGE
    # =====================================================

    bot = request.app["bot"]


    username_text = (
        f"@{username}"
        if username
        else "не указан"
    )


    admin_message = (
        "🎀 НОВАЯ ПРОКРУТКА\n\n"

        f"🏆 Приз: {prize['name']}\n"
        f"📝 {prize['description']}\n\n"

        f"👤 Имя: {first_name or 'не указано'}\n"
        f"🔗 Username: {username_text}\n"
        f"🆔 ID: {user_id}"
    )


    try:

        await bot.send_message(
            chat_id=ADMIN_CHAT_ID,
            text=admin_message
        )

    except Exception as error:

        logging.error(
            "Ошибка отправки админу: %s",
            error
        )


    # =====================================================
    # RESPONSE
    # =====================================================

    return web.json_response(
        {
            "ok": True,

            "prize": prize,

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


if __name__ == "__main__":
    asyncio.run(main())
