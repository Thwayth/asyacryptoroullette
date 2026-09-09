import os
import asyncio
import logging

from datetime import datetime, timezone, timedelta

from aiohttp import web

from aiogram import Bot, Dispatcher, Router
from aiogram.filters import CommandStart

from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)


# =========================================================
# LOGGING
# =========================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)


# =========================================================
# ENVIRONMENT
# =========================================================

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID")
WEB_APP_URL = os.getenv("WEB_APP_URL")

ALLOWED_ORIGIN = os.getenv(
    "ALLOWED_ORIGIN",
    "https://asyacryptoroullette.vercel.app",
)

PORT = int(
    os.getenv(
        "PORT",
        "10000",
    )
)


if not BOT_TOKEN:
    raise RuntimeError(
        "BOT_TOKEN не найден в Environment Variables"
    )


if not ADMIN_CHAT_ID:
    raise RuntimeError(
        "ADMIN_CHAT_ID не найден в Environment Variables"
    )


if not WEB_APP_URL:
    raise RuntimeError(
        "WEB_APP_URL не найден в Environment Variables"
    )


# =========================================================
# ROUTER
# =========================================================

router = Router()


# =========================================================
# SPIN STORAGE
# =========================================================

last_spins = {}


# =========================================================
# WINNING PRIZE
# =========================================================

WINNING_PRIZE = {

    "id": "signal",

    "name": "СИГНАЛ",

    "description": "Торговый сигнал",

    "icon": "📈",

}


# =========================================================
# CORS
# =========================================================

def add_cors_headers(response):

    response.headers[
        "Access-Control-Allow-Origin"
    ] = ALLOWED_ORIGIN

    response.headers[
        "Access-Control-Allow-Methods"
    ] = "GET,POST,OPTIONS"

    response.headers[
        "Access-Control-Allow-Headers"
    ] = "Content-Type"

    response.headers[
        "Access-Control-Max-Age"
    ] = "86400"

    return response


async def options_handler(request):

    return add_cors_headers(
        web.Response(
            status=204
        )
    )


@web.middleware
async def cors_middleware(
    request,
    handler
):

    if request.method == "OPTIONS":

        return await options_handler(
            request
        )

    try:

        response = await handler(
            request
        )

    except web.HTTPException as exc:

        response = exc

    return add_cors_headers(
        response
    )


# =========================================================
# START COMMAND
# =========================================================

@router.message(
    CommandStart()
)
async def start_handler(
    message: Message
):

    keyboard = InlineKeyboardMarkup(

        inline_keyboard=[

            [

                InlineKeyboardButton(

                    text="🎀 Открыть рулетку",

                    web_app=WebAppInfo(
                        url=WEB_APP_URL
                    ),

                )

            ]

        ]

    )


    await message.answer(

        "🎀 ASYA CRYPTO ROULETTE\n\n"

        "Испытай удачу и получи свой приз ✨\n\n"

        "Нажми кнопку ниже, чтобы открыть рулетку.",

        reply_markup=keyboard,

    )


# =========================================================
# HEALTH
# =========================================================

async def health_handler(
    request
):

    return web.json_response({

        "ok": True,

        "service":
            "ASYA CRYPTO ROULETTE",

    })


# =========================================================
# SPIN
# =========================================================

async def spin_handler(
    request
):

    try:

        data = await request.json()

    except Exception:

        return web.json_response(

            {

                "ok": False,

                "error":
                    "Некорректный JSON",

            },

            status=400,

        )


    # -----------------------------------------------------
    # USER
    # -----------------------------------------------------

    user_id = str(
        data.get(
            "user_id",
            ""
        )
    ).strip()


    username = str(
        data.get(
            "username",
            ""
        )
    ).strip()


    first_name = str(
        data.get(
            "first_name",
            ""
        )
    ).strip()


    if not user_id:

        return web.json_response(

            {

                "ok": False,

                "error":
                    "Пользователь не определён",

            },

            status=400,

        )


    # -----------------------------------------------------
    # TIME
    # -----------------------------------------------------

    now = datetime.now(
        timezone.utc
    )


    # -----------------------------------------------------
    # 24 HOURS
    # -----------------------------------------------------

    previous_spin = (
        last_spins.get(user_id)
    )


    if previous_spin:

        next_spin = (
            previous_spin
            + timedelta(hours=24)
        )


        if now < next_spin:

            seconds_left = int(

                (
                    next_spin - now
                ).total_seconds()

            )


            return web.json_response(

                {

                    "ok": False,

                    "error":
                        "Следующая прокрутка доступна через 24 часа",

                    "seconds_left":
                        seconds_left,

                },

                status=429,

            )


    # -----------------------------------------------------
    # SAVE SPIN
    # -----------------------------------------------------

    last_spins[user_id] = now


    # -----------------------------------------------------
    # ADMIN
    # -----------------------------------------------------

    bot = request.app["bot"]


    username_text = (

        f"@{username}"

        if username

        else "не указан"

    )


    admin_message = (

        "🎀 НОВАЯ ПРОКРУТКА\n\n"

        "🏆 Приз: СИГНАЛ\n"

        "📝 Торговый сигнал\n\n"

        f"👤 Имя: "
        f"{first_name or 'не указано'}\n"

        f"🔗 Username: "
        f"{username_text}\n"

        f"🆔 ID: "
        f"{user_id}"

    )


    try:

        await bot.send_message(

            chat_id=ADMIN_CHAT_ID,

            text=admin_message,

        )

    except Exception as error:

        logging.exception(

            "Ошибка отправки админу: %s",

            error,

        )


    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return web.json_response(

        {

            "ok": True,

            "prize":
                WINNING_PRIZE,

            "next_spin_seconds":
                86400,

        }

    )


# =========================================================
# MAIN
# =========================================================

async def main():

    bot = Bot(
        token=BOT_TOKEN
    )


    app = web.Application(

        middlewares=[
            cors_middleware
        ]

    )


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


    app.router.add_route(
        "OPTIONS",
        "/spin",
        options_handler
    )


    runner = web.AppRunner(
        app
    )


    await runner.setup()


    site = web.TCPSite(

        runner,

        "0.0.0.0",

        PORT,

    )


    await site.start()


    logging.info(
        "API server started on port %s",
        PORT,
    )


    dp = Dispatcher()


    dp.include_router(
        router
    )


    try:

        await dp.start_polling(
            bot
        )

    finally:

        await bot.session.close()

        await runner.cleanup()


# =========================================================
# START
# =========================================================

if __name__ == "__main__":

    asyncio.run(
        main()
    )
