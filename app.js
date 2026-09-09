const tg = window.Telegram?.WebApp || null;


// ==========================================
// TELEGRAM
// ==========================================

if (tg) {
    tg.ready();
    tg.expand();

    try {
        tg.setHeaderColor("#0a070b");
        tg.setBackgroundColor("#0a070b");
    } catch (e) {
        console.log("Telegram settings error:", e);
    }
}


// ==========================================
// SETTINGS
// ==========================================

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

function haptic(type = "impact") {

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

    if (screen) {
        screen.classList.add("active");
    }

    window.scrollTo(0, 0);

}


// ==========================================
// PREPARE WHEEL
// ==========================================

function prepareWheel() {

    if (!wheel) return;

    // Удаляем старые подписи
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
// PROGRESS BAR
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
        Позиция остановки.

        ВАЖНО:
        Если сектор СИГНАЛ в твоём CSS расположен
        немного в другом месте, это число можно
        поменять.

        Сейчас используется фиксированная позиция.
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

    });


    currentRotation = newRotation;

}


// ==========================================
// GET BROWSER ID
// ==========================================

function getBrowserId() {

    let browserId =
        localStorage.getItem("roulette_browser_id");


    if (!browserId) {

        browserId =
            "web-" +
            Math.random()
                .toString(36)
                .substring(2) +
            Date.now()
                .toString(36);


        localStorage.setItem(
            "roulette_browser_id",
            browserId
        );

    }


    return browserId;

}


// ==========================================
// GET USER
// ==========================================

function getTelegramUser() {

    const user =
        tg?.initDataUnsafe?.user;


    // Открыто через Telegram

    if (user) {

        return {

            user_id: String(user.id),

            username:
                user.username || "",

            first_name:
                user.first_name || ""

        };

    }


    // Открыто через обычную ссылку

    return {

        user_id:
            getBrowserId(),

        username: "",

        first_name: "Гость"

    };

}


// ==========================================
// REQUEST SPIN
// ==========================================

async function requestSpin() {

    const user =
        getTelegramUser();


    const response = await fetch(
        "/spin",
        {

            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body:
                JSON.stringify(user)

        }
    );


    let data;


    try {

        data =
            await response.json();

    } catch (e) {

        throw new Error(
            "Сервер вернул неправильный ответ"
        );

    }


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
            "Не удалось запустить рулетку"
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


    if (spinButton) {
        spinButton.disabled = true;
    }


    haptic("impact");


    try {

        // Сначала проверяем возможность прокрутки
        const prize =
            await requestSpin();


        // Потом открываем экран рулетки
        showScreen(
            rouletteScreen
        );


        if (spinStatus) {

            spinStatus.textContent =
                "РУЛЕТКА КРУТИТСЯ... ♡";

        }


        startProgress();

        animateWheel();


        setTimeout(() => {

            showResult(
                prize
            );

        }, SPIN_TIME + 150);


    } catch (error) {

        console.error(error);


        isSpinning = false;


        if (spinButton) {
            spinButton.disabled = false;
        }


        if (spinStatus) {
            spinStatus.textContent =
                "Готовы?";
        }


        alert(
            error.message ||
            "Произошла ошибка"
        );

    }

}


// ==========================================
// SHOW RESULT
// ==========================================

function showResult(prize) {

    isSpinning = false;


    if (resultIcon) {

        resultIcon.textContent =
            prize.icon || "📈";

    }


    if (resultName) {

        resultName.textContent =
            prize.name || "СИГНАЛ";

    }


    if (resultDescription) {

        resultDescription.textContent =
            prize.description ||
            "Торговый сигнал";

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


// ==========================================
// CLAIM PRIZE
// ==========================================

function claimPrize() {

    const message =
        "Здравствуйте! 🎀 Я получила торговый сигнал и хочу забрать свой приз ♡";


    const url =
        `https://t.me/${CLAIM_USERNAME}?text=${encodeURIComponent(message)}`;


    if (tg?.openTelegramLink) {

        tg.openTelegramLink(url);

    } else {

        window.open(
            url,
            "_blank"
        );

    }

}


// ==========================================
// EVENTS
// ==========================================

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


// ==========================================
// INIT
// ==========================================

prepareWheel();

showScreen(homeScreen);

console.log(
    "ASYA CRYPTO ROULETTE READY ♡"
);
