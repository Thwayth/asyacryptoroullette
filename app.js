const tg = window.Telegram && window.Telegram.WebApp
    ? window.Telegram.WebApp
    : null;

if (tg) {
    tg.ready();
    tg.expand();

    try {
        tg.setHeaderColor("#0a070b");
        tg.setBackgroundColor("#0a070b");
    } catch (error) {}
}

const CLAIM_USERNAME = "asya_crypto";


/* =========================
   ЕДИНСТВЕННЫЙ ПРИЗ
========================= */

const prizes = [
    {
        id: "signal",
        icon: "📈",
        name: "СИГНАЛ",
        description: "Только прибыльные сигналы",
        chance: 100
    }
];


/* =========================
   ELEMENTS
========================= */

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


/* =========================
   SETTINGS
========================= */

let isSpinning = false;
let currentRotation = 0;

const SPIN_TIME = 5500;


/* =========================
   HAPTIC
========================= */

function haptic(type) {

    if (!tg || !tg.HapticFeedback) return;

    try {

        if (type === "success") {
            tg.HapticFeedback.notificationOccurred("success");
        } else {
            tg.HapticFeedback.impactOccurred("light");
        }

    } catch (error) {}
}


/* =========================
   SCREENS
========================= */

function showScreen(screen) {

    document.querySelectorAll(".screen").forEach(item => {
        item.classList.remove("active");
    });

    screen.classList.add("active");

    window.scrollTo(0, 0);
}


/* =========================
   PRIZE
========================= */

function getRandomPrize() {
    return prizes[0];
}


/* =========================
   WHEEL LABELS
========================= */

function createWheelLabels() {

    wheel.querySelectorAll(".wheel-label").forEach(label => {
        label.remove();
    });


    const positions = [
        "one",
        "two",
        "three",
        "four"
    ];


    positions.forEach(position => {

        const label = document.createElement("div");

        label.className = "wheel-label " + position;

        label.innerHTML = `
            <span class="label-icon">📈</span>
            <span class="label-text">СИГНАЛ</span>
        `;

        wheel.appendChild(label);

    });
}


/* =========================
   PROGRESS
========================= */

function startProgress() {

    progressBar.style.transition = "none";
    progressBar.style.width = "0%";

    void progressBar.offsetWidth;

    requestAnimationFrame(() => {

        progressBar.style.transition =
            "width 5.5s linear";

        progressBar.style.width = "100%";

    });
}


/* =========================
   WHEEL ANIMATION
========================= */

function animateWheel() {

    const newRotation =
        currentRotation +
        360 * 8 +
        45;


    wheel.style.transition = "none";

    wheel.style.transform =
        `rotate(${currentRotation}deg)`;


    void wheel.offsetWidth;


    requestAnimationFrame(() => {

        wheel.style.transition =
            "transform 5.5s cubic-bezier(0.12, 0.72, 0.18, 1)";

        wheel.style.transform =
            `rotate(${newRotation}deg)`;

        currentRotation = newRotation;

    });
}


/* =========================
   START SPIN
========================= */

function startSpin() {

    if (isSpinning) return;

    isSpinning = true;

    spinButton.disabled = true;

    haptic("light");

    showScreen(rouletteScreen);

    spinStatus.textContent =
        "РУЛЕТКА КРУТИТСЯ... ♡";

    startProgress();

    const prize = getRandomPrize();

    animateWheel();


    setTimeout(() => {

        showResult(prize);

    }, SPIN_TIME + 200);

}


/* =========================
   RESULT
========================= */

function showResult(prize) {

    isSpinning = false;

    resultIcon.textContent = prize.icon;
    resultName.textContent = prize.name;
    resultDescription.textContent = prize.description;

    haptic("success");

    showScreen(resultScreen);
}


/* =========================
   CLAIM
========================= */

function claimPrize() {

    const message =
        "Здравствуйте! 🎀 Я получила СИГНАЛ в рулетке и хочу узнать подробности ♡";


    const url =
        "https://t.me/" +
        CLAIM_USERNAME +
        "?text=" +
        encodeURIComponent(message);


    if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(url);
    } else {
        window.location.href = url;
    }
}


/* =========================
   EVENTS
========================= */

spinButton.addEventListener("click", event => {

    event.preventDefault();

    startSpin();

});


if (backButton) {

    backButton.addEventListener("click", event => {

        event.preventDefault();

        if (isSpinning) return;

        showScreen(homeScreen);

        spinButton.disabled = false;

    });

}


claimButton.addEventListener("click", event => {

    event.preventDefault();

    claimPrize();

});


/* =========================
   INIT
========================= */

createWheelLabels();

showScreen(homeScreen);

console.log("ASYA ROULETTE READY ♡");
