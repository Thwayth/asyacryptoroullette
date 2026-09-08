import os
import asyncio
import logging
import random

from datetime import datetime, timezone, timedelta

from aiohttp import web

from aiogram import Bot, Dispatcher, Router

from aiogram.filters import CommandStart

from aiogram.types import Message


logging.basicConfig(level=logging.INFO)


BOT_TOKEN = os.getenv("BOT_TOKEN")

ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID")


if not BOT_TOKEN:
    raise RuntimeError(
        "BOT_TOKEN не найден в Environment Variables"
    )


if not ADMIN_CHAT_ID:
    raise RuntimeError(
        "ADMIN_CHAT_ID не найден в Environment Variables"
    )


router = Router()


last_spins = {}


/* =========================
   PRIZES
========================= */

PRIZES = [

    {
        "id": "money",
        "name": "$1,000",
        "description": "Главный денежный приз",
        "chance": 12
    },

    {
        "id": "tools",
        "name": "ИНСТРУМЕНТЫ ДЛЯ ТРЕЙДИНГА",
        "description": "Набор полезных инструментов",
        "chance": 28
    },

    {
        "id": "setup",
        "name": "ИНСАЙДЕРСКИЙ СЕТАП",
        "description": "Эксклюзивный торговый сетап",
        "chance": 20
    },

    {
        "id": "indicator",
        "name": "ИНДИКАТОР",
        "description": "Индикатор для трейдинга",
        "chance": 40
    }

]


@router.message(CommandStart())
async def start_handler(message: Message):

    await message.answer(

        "🎀 ASYA ROULETTE\n\n"
        "Испытай удачу и забери свой подарок ♡"

    )


async def health_handler(request):

    return web.Response(text="OK")


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


    if not user_id:

        return web.json_response(

            {
                "ok": False,
                "error": "Пользователь не определён"
            },

            status=400

        )


    now = datetime.now(timezone.utc)


    previous_spin = last_spins.get(user_id)


    if previous_spin:

        next_spin = (
            previous_spin +
            timedelta(hours=24)
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
                        seconds_left
                },

                status=429

            )


    random_number = random.random() * 100


    total = 0

    prize = PRIZES[-1]


    for item in PRIZES:

        total += item["chance"]


        if random_number < total:

            prize = item

            break


    last_spins[user_id] = now


    bot = request.app["bot"]


    admin_message = (

        "🎀 НОВЫЙ ВЫИГРЫШ — ASYA ROULETTE\n\n"

        f"🏆 Приз: {prize['name']}\n"

        f"📝 {prize['description']}\n\n"

        f"👤 Имя: "
        f"{first_name or 'не указано'}\n"

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


    return web.json_response(

        {
            "ok": True,

            "prize": prize,

            "next_spin_seconds": 86400
        }

    )


async def main():

    bot = Bot(token=BOT_TOKEN)


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
        os.getenv("PORT", "10000")
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
