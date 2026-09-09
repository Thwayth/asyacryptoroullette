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
// HAPTIC
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
// SCREENS
// ==========================================

function showScreen(screen) {
    document.querySelectorAll(".screen").forEach(item => {
        item.classList.remove("active");
    });

    screen.classList.add("active");

    window.scrollTo(0, 0);
}


// ==========================================
// WHEEL LABELS
// ==========================================

function prepareWheel() {
    if (!wheel) return;

    wheel.querySelectorAll(".wheel-label").forEach(el => {
        el.remove();
    });

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
// WHEEL ANIMATION
// ==========================================

function animateWheel() {
    if (!wheel) return;

    const fullSpins = 360 * 8;

    /*
        Для 4 секторов:

        0°   = верх
        90°  = право
        180° = низ
        270° = лево

        Здесь фиксируем остановку
        на секторе СИГНАЛ.
    */

    const signalPosition = 315;

    const newRotation =
        currentRotation +
        fullSpins +
        signalPosition;

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
// GET TELEGRAM USER
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

    if (!user) {
        throw new Error(
            "Открой рулетку через Telegram"
        );
    }

    const response = await fetch("/spin", {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(user)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {

        if (data.seconds_left) {

            const totalMinutes =
                Math.ceil(data.seconds_left / 60);

            const hours =
                Math.floor(totalMinutes / 60);

            const minutes =
                totalMinutes % 60;

            throw new Error(
                `Следующая прокрутка через ${hours} ч. ${minutes} мин.`
            );
        }

        throw new Error(
            data.error || "Не удалось запустить рулетку"
        );
    }

    return data.prize;
}


// ==========================================
// START SPIN
// ==========================================

async function startSpin() {

    if (isSpinning) return;

    isSpinning = true;

    spinButton.disabled = true;

    haptic("spin");

    try {

        // Сначала проверяем сервер.
        // Если 24 часа ещё не прошли —
        // колесо вообще не запускается.

        const prize = await requestSpin();

        showScreen(rouletteScreen);

        spinStatus.textContent =
            "РУЛЕТКА КРУТИТСЯ... ♡";

        startProgress();

        animateWheel();


        setTimeout(() => {
            showResult(prize);
        }, SPIN_TIME + 150);

    } catch (error) {

        isSpinning = false;

        spinButton.disabled = false;

        spinStatus.textContent =
            "Готовы?";

        alert(error.message);
    }
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
        "Здравствуйте! 🎀 Я получила СИГНАЛ в рулетке и хочу забрать приз ♡";

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
