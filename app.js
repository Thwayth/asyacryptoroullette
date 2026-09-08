const tg = window.Telegram?.WebApp || null;

if (tg) {
    tg.ready();
    tg.expand();

    try {
        tg.setHeaderColor("#0a070b");
        tg.setBackgroundColor("#0a070b");
    } catch (e) {}
}

const CLAIM_USERNAME = "asya_crypto";

const SPIN_TIME = 5500;

let isSpinning = false;
let currentRotation = 0;


// ==========================================
// ELEMENTS
// ==========================================

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
const resultDescription = document.getElementById("resultDescription");

const claimButton = document.getElementById("claimButton");


// ==========================================
// TELEGRAM HAPTIC
// ==========================================

function haptic(type) {

    if (!tg?.HapticFeedback) return;

    try {

        if (type === "success") {
            tg.HapticFeedback.notificationOccurred("success");
        } else {
            tg.HapticFeedback.impactOccurred("medium");
        }

    } catch (e) {}

}


// ==========================================
// SCREEN SWITCH
// ==========================================

function showScreen(screen) {

    document.querySelectorAll(".screen").forEach(item => {
        item.classList.remove("active");
    });

    screen.classList.add("active");

    window.scrollTo(0, 0);
}


// ==========================================
// WHEEL
// ==========================================

function prepareWheel() {

    if (!wheel) return;

    // Удаляем старые динамические подписи,
    // которые были причиной наложения.
    wheel.querySelectorAll(".wheel-label").forEach(el => {
        el.remove();
    });

    // Удаляем старые сектора из HTML.
    wheel.querySelectorAll(".wheel-sector").forEach(el => {
        el.remove();
    });


    // Создаём только 4 аккуратные подписи.
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
            text: "СЕТАП"
        },
        {
            className: "wheel-label four",
            icon: "📈",
            text: "СИГНАЛ"
        }
    ];


    labels.forEach(item => {

        const label = document.createElement("div");

        label.className = item.className;

        label.innerHTML = `
            <span class="label-icon">${item.icon}</span>
            <span class="label-text">${item.text}</span>
        `;

        wheel.appendChild(label);

    });
}


// ==========================================
// PROGRESS
// ==========================================

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


// ==========================================
// SPIN ANIMATION
// ==========================================

function animateWheel() {

    if (!wheel) return;

    // Каждый раз вращаем минимум 8 полных оборотов.
    const extraRotation =
        360 * 8 + Math.floor(Math.random() * 360);

    const newRotation =
        currentRotation + extraRotation;


    wheel.style.transition = "none";

    wheel.style.transform =
        `rotate(${currentRotation}deg)`;


    void wheel.offsetWidth;


    requestAnimationFrame(() => {

        wheel.style.transition =
            `transform ${SPIN_TIME}ms cubic-bezier(0.12, 0.72, 0.18, 1)`;

        wheel.style.transform =
            `rotate(${newRotation}deg)`;

        currentRotation = newRotation;

    });
}


// ==========================================
// GET USER
// ==========================================

function getTelegramUser() {

    const user = tg?.initDataUnsafe?.user;

    if (!user) {
        return null;
    }

    return {
        user_id: String(user.id),
        username: user.username || "",
        first_name: user.first_name || ""
    };
}


// ==========================================
// REQUEST SPIN
// ==========================================

async function requestSpin() {

    const user = getTelegramUser();

    // В браузере вне Telegram тоже разрешаем
    // демонстрационный запуск.
    const payload = user || {
        user_id: "web-demo",
        username: "",
        first_name: "Demo"
    };


    try {

        const response = await fetch("/spin", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(payload)

        });


        const data = await response.json();


        if (!response.ok || !data.ok) {

            if (data.seconds_left) {

                const hours =
                    Math.ceil(data.seconds_left / 3600);

                throw new Error(
                    `Следующая прокрутка доступна примерно через ${hours} ч.`
                );

            }

            throw new Error(
                data.error || "Не удалось запустить рулетку"
            );

        }


        return data.prize;

    } catch (error) {

        console.error(error);

        // Если API временно недоступен,
        // показываем локальный результат.
        return {
            id: "signal",
            name: "СИГНАЛ",
            description: "Торговый сигнал",
            icon: "📈"
        };

    }

}


// ==========================================
// START
// ==========================================

async function startSpin() {

    if (isSpinning) return;

    isSpinning = true;

    spinButton.disabled = true;

    haptic("spin");

    showScreen(rouletteScreen);

    spinStatus.textContent =
        "РУЛЕТКА КРУТИТСЯ... ♡";

    startProgress();

    // Запрашиваем фактический результат.
    const prizePromise = requestSpin();

    // Одновременно крутим колесо.
    animateWheel();


    // Ждём завершения анимации.
    setTimeout(async () => {

        const prize = await prizePromise;

        showResult(prize);

    }, SPIN_TIME + 200);

}


// ==========================================
// RESULT
// ==========================================

function showResult(prize) {

    isSpinning = false;

    resultIcon.textContent =
        prize.icon || "📈";

    resultName.textContent =
        prize.name || "СИГНАЛ";

    resultDescription.textContent =
        prize.description || "Торговый сигнал";


    spinStatus.textContent =
        "Готово ♡";


    haptic("success");

    showScreen(resultScreen);

}


// ==========================================
// CLAIM
// ==========================================

function claimPrize() {

    const message =
        "Здравствуйте! 🎀 Я выиграла СИГНАЛ в рулетке и хочу забрать приз ♡";


    const url =
        `https://t.me/${CLAIM_USERNAME}?text=${encodeURIComponent(message)}`;


    if (tg?.openTelegramLink) {

        tg.openTelegramLink(url);

    } else {

        window.open(url, "_blank");

    }

}


// ==========================================
// EVENTS
// ==========================================

if (spinButton) {

    spinButton.addEventListener("click", event => {

        event.preventDefault();

        startSpin();

    });

}


if (backButton) {

    backButton.addEventListener("click", event => {

        event.preventDefault();

        if (isSpinning) return;

        showScreen(homeScreen);

        spinButton.disabled = false;

    });

}


if (claimButton) {

    claimButton.addEventListener("click", event => {

        event.preventDefault();

        claimPrize();

    });

}


// ==========================================
// INIT
// ==========================================

prepareWheel();

showScreen(homeScreen);

console.log("ASYA CRYPTO ROULETTE READY ♡");
