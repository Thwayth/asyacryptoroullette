// =====================================================
// ASYA CRYPTO ROULETTE — app.js
// =====================================================

const tg = window.Telegram?.WebApp || null;

if (tg) {
    tg.ready();
    tg.expand();

    try {
        tg.setHeaderColor("#0a070b");
        tg.setBackgroundColor("#0a070b");
    } catch (e) {}
}


// =====================================================
// SETTINGS
// =====================================================

// Backend находится на том же домене, что и сайт.
const API_URL = window.location.origin;

const CLAIM_USERNAME = "asya_crypto";
const SPIN_TIME = 5500;

let isSpinning = false;
let currentRotation = 0;


// =====================================================
// ELEMENTS
// =====================================================

const homeScreen = document.getElementById("homeScreen");
const rouletteScreen = document.getElementById("rouletteScreen");
const resultScreen = document.getElementById("resultScreen");

const spinButton = document.getElementById("spinButton");
const backButton = document.getElementById("backButton");

const wheel = document.getElementById("wheel");
const spinStatus = document.getElementById("spinStatus");
const progressBar = document.getElementById("progressBar");

const resultIcon = document.getElementById("resultIcon");
const resultName = document.getElementById("resultName");
const resultDescription =
    document.getElementById("resultDescription");

const claimButton =
    document.getElementById("claimButton");


// =====================================================
// HAPTIC
// =====================================================

function haptic(type) {

    if (!tg?.HapticFeedback) return;

    try {

        if (type === "success") {

            tg.HapticFeedback.notificationOccurred(
                "success"
            );

        } else {

            tg.HapticFeedback.impactOccurred(
                "medium"
            );

        }

    } catch (e) {}
}


// =====================================================
// SCREEN
// =====================================================

function showScreen(screen) {

    document
        .querySelectorAll(".screen")
        .forEach(item => {

            item.classList.remove("active");

        });

    if (screen) {
        screen.classList.add("active");
    }

    window.scrollTo(0, 0);
}


// =====================================================
// BROWSER ID
// =====================================================

function getBrowserId() {

    let id = null;

    try {

        id = localStorage.getItem(
            "asya_roulette_browser_id"
        );

        if (!id) {

            if (window.crypto?.randomUUID) {

                id =
                    "web-" +
                    window.crypto.randomUUID();

            } else {

                id =
                    "web-" +
                    Date.now() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .slice(2);

            }

            localStorage.setItem(
                "asya_roulette_browser_id",
                id
            );
        }

    } catch (e) {

        id =
            "web-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .slice(2);
    }

    return id;
}


// =====================================================
// USER
// =====================================================

function getUser() {

    const telegramUser =
        tg?.initDataUnsafe?.user;

    if (telegramUser?.id) {

        return {

            user_id:
                String(telegramUser.id),

            username:
                telegramUser.username || "",

            first_name:
                telegramUser.first_name || ""

        };
    }

    // Обычный браузер
    return {

        user_id:
            getBrowserId(),

        username: "",

        first_name: "Гость"

    };
}


// =====================================================
// WHEEL LABELS
// =====================================================

function prepareWheel() {

    if (!wheel) return;

    wheel
        .querySelectorAll(".wheel-label")
        .forEach(el => el.remove());

    const labels = [

        {
            className: "wheel-label one",
            icon: "💵",
            text: "$1,000"
        },

        {
            className: "wheel-label two",
            icon: "🛠️",
            text: "ИНСТРУМЕНТЫ"
        },

        {
            className: "wheel-label three",
            icon: "💎",
            text: "ИНСАЙДЕРСКИЙ СЕТАП"
        },

        {
            className: "wheel-label four",
            icon: "📈",
            text: "СИГНАЛ"
        }

    ];

    labels.forEach(item => {

        const element =
            document.createElement("div");

        element.className =
            item.className;

        element.innerHTML = `
            <span class="label-icon">
                ${item.icon}
            </span>

            <span class="label-text">
                ${item.text}
            </span>
        `;

        wheel.appendChild(element);

    });
}


// =====================================================
// PROGRESS
// =====================================================

function startProgress() {

    if (!progressBar) return;

    progressBar.style.transition = "none";
    progressBar.style.width = "0%";

    void progressBar.offsetWidth;

    requestAnimationFrame(() => {

        progressBar.style.transition =
            `width ${SPIN_TIME}ms linear`;

        progressBar.style.width = "100%";

    });
}


// =====================================================
// WHEEL ANIMATION
// =====================================================

function animateWheel() {

    if (!wheel) return;

    /*
        Четыре визуальных сектора:

        0–90     $1,000
        90–180   ИНСТРУМЕНТЫ
        180–270  ИНСАЙДЕРСКИЙ СЕТАП
        270–360  СИГНАЛ

        Указатель находится сверху.

        Центр сектора СИГНАЛ = 315°.
        Для остановки под указателем используем +45°.
    */

    const fullSpins = 360 * 8;

    const signalAngle = 45;

    const targetRotation =
        currentRotation +
        fullSpins +
        signalAngle;

    wheel.style.transition = "none";

    wheel.style.transform =
        `rotate(${currentRotation}deg)`;

    void wheel.offsetWidth;

    requestAnimationFrame(() => {

        wheel.style.transition =
            `transform ${SPIN_TIME}ms cubic-bezier(0.12, 0.72, 0.18, 1)`;

        wheel.style.transform =
            `rotate(${targetRotation}deg)`;

    });

    currentRotation =
        targetRotation;
}


// =====================================================
// SERVER SPIN
// =====================================================

async function requestSpin() {

    const user = getUser();

    let response;

    try {

        response = await fetch(
            `${API_URL}/spin`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(user)
            }
        );

    } catch (error) {

        console.error(error);

        throw new Error(
            "Не удалось подключиться к серверу."
        );
    }


    // =================================================
    // RESPONSE
    // =================================================

    let data;

    try {

        data = await response.json();

    } catch (e) {

        throw new Error(
            "Сервер не вернул правильный ответ."
        );
    }


    // =================================================
    // ERROR
    // =================================================

    if (!response.ok || !data.ok) {

        if (data.seconds_left) {

            const totalMinutes =
                Math.ceil(
                    data.seconds_left / 60
                );

            const hours =
                Math.floor(
                    totalMinutes / 60
                );

            const minutes =
                totalMinutes % 60;

            throw new Error(
                `Следующая прокрутка через ${hours} ч. ${minutes} мин.`
            );
        }

        throw new Error(
            data.error ||
            "Не удалось запустить рулетку."
        );
    }


    // =================================================
    // SUCCESS
    // =================================================

    return data.prize;
}


// =====================================================
// START SPIN
// =====================================================

async function startSpin() {

    if (isSpinning) return;

    isSpinning = true;

    if (spinButton) {
        spinButton.disabled = true;
    }

    try {

        /*
            Сначала сервер проверяет,
            можно ли пользователю крутить.
        */

        const prize =
            await requestSpin();


        // Переходим к рулетке

        showScreen(
            rouletteScreen
        );

        if (spinStatus) {

            spinStatus.textContent =
                "РУЛЕТКА КРУТИТСЯ... ♡";

        }

        haptic("impact");

        startProgress();

        animateWheel();


        // После окончания анимации показываем результат

        setTimeout(() => {

            showResult(prize);

        }, SPIN_TIME + 150);


    } catch (error) {

        console.error(error);

        isSpinning = false;

        if (spinButton) {
            spinButton.disabled = false;
        }

        alert(
            error.message ||
            "Произошла ошибка."
        );
    }
}


// =====================================================
// RESULT
// =====================================================

function showResult(prize) {

    isSpinning = false;

    /*
        Фактический выигрыш — СИГНАЛ.
    */

    const signal = {

        id: "signal",

        name: "СИГНАЛ",

        description:
            "Торговый сигнал",

        icon: "📈"

    };


    const actualPrize =
        prize?.id === "signal"
            ? prize
            : signal;


    if (resultIcon) {

        resultIcon.textContent =
            actualPrize.icon ||
            signal.icon;

    }


    if (resultName) {

        resultName.textContent =
            actualPrize.name ||
            signal.name;

    }


    if (resultDescription) {

        resultDescription.textContent =
            actualPrize.description ||
            signal.description;

    }


    if (spinStatus) {

        spinStatus.textContent =
            "Готово ♡";

    }


    haptic("success");

    showScreen(
        resultScreen
    );
}


// =====================================================
// CLAIM
// =====================================================

function claimPrize() {

    const message =
        "Здравствуйте! 🎀 Я получила СИГНАЛ в рулетке и хочу забрать приз ♡";

    const url =
        `https://t.me/${CLAIM_USERNAME}?text=${encodeURIComponent(message)}`;


    if (tg?.openTelegramLink) {

        tg.openTelegramLink(
            url
        );

    } else {

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );
    }
}


// =====================================================
// EVENTS
// =====================================================

if (spinButton) {

    spinButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            startSpin();

        }
    );
}


if (backButton) {

    backButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            if (isSpinning) return;

            showScreen(
                homeScreen
            );

            if (spinButton) {
                spinButton.disabled = false;
            }

        }
    );
}


if (claimButton) {

    claimButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            claimPrize();

        }
    );
}


// =====================================================
// INIT
// =====================================================

prepareWheel();

showScreen(
    homeScreen
);

console.log(
    "ASYA CRYPTO ROULETTE READY ♡"
);
