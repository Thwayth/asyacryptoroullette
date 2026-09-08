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


/* =========================
   TELEGRAM
========================= */

const CLAIM_USERNAME = "asya_crypto";


/* =========================
   PRIZES
========================= */

const prizes = [

    {
        id: "money",
        icon: "💸",
        name: "$1,000",
        description: "Главный денежный приз",
        chance: 12
    },

    {
        id: "tools",
        icon: "🛠️",
        name: "ИНСТРУМЕНТЫ",
        description: "Инструменты для трейдинга",
        chance: 28
    },

    {
        id: "setup",
        icon: "🔥",
        name: "ИНСАЙДЕРСКИЙ СЕТАП",
        description: "Эксклюзивный торговый сетап",
        chance: 20
    },

    {
        id: "indicator",
        icon: "📊",
        name: "ИНДИКАТОР",
        description: "Индикатор для трейдинга",
        chance: 40
    }

];


/* =========================
   ELEMENTS
========================= */

const homeScreen =
    document.getElementById("homeScreen");

const rouletteScreen =
    document.getElementById("rouletteScreen");

const resultScreen =
    document.getElementById("resultScreen");


const spinButton =
    document.getElementById("spinButton");

const backButton =
    document.getElementById("backButton");


const wheel =
    document.getElementById("wheel");

const spinStatus =
    document.getElementById("spinStatus");

const progressBar =
    document.getElementById("progressBar");


const resultIcon =
    document.getElementById("resultIcon");

const resultName =
    document.getElementById("resultName");

const resultDescription =
    document.getElementById("resultDescription");


const claimButton =
    document.getElementById("claimButton");


/* =========================
   SETTINGS
========================= */

let isSpinning = false;

let currentRotation = 0;


const SPIN_TIME = 5500;

const DAY = 24 * 60 * 60 * 1000;

const LAST_SPIN_KEY =
    "asya_roulette_last_spin";


/* =========================
   HAPTIC
========================= */

function haptic(type) {

    if (!tg || !tg.HapticFeedback) {
        return;
    }

    try {

        if (type === "success") {

            tg.HapticFeedback
                .notificationOccurred("success");

        } else {

            tg.HapticFeedback
                .impactOccurred("light");

        }

    } catch (error) {}

}


/* =========================
   SCREENS
========================= */

function showScreen(screen) {

    document
        .querySelectorAll(".screen")
        .forEach(function(item) {

            item.classList.remove("active");

        });


    if (screen) {

        screen.classList.add("active");

    }


    window.scrollTo(0, 0);

}


/* =========================
   SPIN TIMER
========================= */

function getLastSpin() {

    const value =
        localStorage.getItem(LAST_SPIN_KEY);


    if (!value) {
        return 0;
    }


    const timestamp =
        Number(value);


    if (Number.isNaN(timestamp)) {

        localStorage.removeItem(
            LAST_SPIN_KEY
        );

        return 0;

    }


    return timestamp;

}


function canSpin() {

    const lastSpin =
        getLastSpin();


    if (!lastSpin) {
        return true;
    }


    return Date.now() - lastSpin >= DAY;

}


function getRemainingTime() {

    const lastSpin =
        getLastSpin();


    if (!lastSpin) {
        return 0;
    }


    return Math.max(

        0,

        DAY - (
            Date.now() - lastSpin
        )

    );

}


function formatRemainingTime(milliseconds) {

    const totalSeconds =
        Math.ceil(milliseconds / 1000);


    const hours =
        Math.floor(totalSeconds / 3600);


    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );


    const seconds =
        totalSeconds % 60;


    return (

        String(hours).padStart(2, "0")

        + ":" +

        String(minutes).padStart(2, "0")

        + ":" +

        String(seconds).padStart(2, "0")

    );

}


/* =========================
   RANDOM PRIZE
========================= */

function getRandomPrize() {

    const random =
        Math.random() * 100;


    let total = 0;


    for (const prize of prizes) {

        total += prize.chance;


        if (random < total) {

            return prize;

        }

    }


    return prizes[prizes.length - 1];

}


/* =========================
   WHEEL LABELS
========================= */

function createWheelLabels() {

    const labels = [

        ["one", "💸", "$1,000"],

        ["two", "🛠️", "ИНСТРУМЕНТЫ"],

        ["three", "🔥", "ИНСАЙДЕРСКИЙ", "СЕТАП"],

        ["four", "📊", "ИНДИКАТОР"]

    ];


    wheel
        .querySelectorAll(".wheel-label")
        .forEach(function(label) {

            label.remove();

        });


    labels.forEach(function(item) {

        const label =
            document.createElement("div");


        label.className =
            "wheel-label " + item[0];


        const icon =
            document.createElement("span");

        icon.className =
            "label-icon";

        icon.textContent =
            item[1];


        const text =
            document.createElement("span");

        text.className =
            "label-text";


        for (
            let i = 2;
            i < item.length;
            i++
        ) {

            text.appendChild(
                document.createTextNode(
                    item[i]
                )
            );


            if (i < item.length - 1) {

                text.appendChild(
                    document.createElement("br")
                );

            }

        }


        label.appendChild(icon);

        label.appendChild(text);

        wheel.appendChild(label);

    });

}


/* =========================
   BUTTON
========================= */

function updateSpinButton() {

    if (!spinButton) {
        return;
    }


    if (isSpinning) {

        spinButton.disabled = true;

        return;

    }


    if (canSpin()) {

        spinButton.disabled = false;

        spinButton.innerHTML =
            "<span>♡</span> КРУТИТЬ РУЛЕТКУ";

    } else {

        const remaining =
            getRemainingTime();


        spinButton.disabled = true;


        spinButton.innerHTML =
            "<span>⏳</span> СЛЕДУЮЩАЯ ИГРА " +
            formatRemainingTime(remaining);

    }

}


/* =========================
   PROGRESS
========================= */

function startProgress() {

    if (!progressBar) {
        return;
    }


    progressBar.style.transition =
        "none";

    progressBar.style.width =
        "0%";


    void progressBar.offsetWidth;


    requestAnimationFrame(function() {

        progressBar.style.transition =
            "width 5.5s linear";

        progressBar.style.width =
            "100%";

    });

}


/* =========================
   WHEEL ANIMATION
========================= */

function animateWheel(prize) {

    const prizeIndex =
        prizes.findIndex(function(item) {

            return item.id === prize.id;

        });


    const sector =
        360 / prizes.length;


    const sectorCenter =
        prizeIndex * sector +
        sector / 2;


    const targetAngle =
        360 - sectorCenter;


    const currentNormalized =
        (
            (currentRotation % 360) + 360
        ) % 360;


    const desiredNormalized =
        (
            targetAngle + 360
        ) % 360;


    const delta =
        (
            desiredNormalized -
            currentNormalized +
            360
        ) % 360;


    const newRotation =
        currentRotation +
        360 * 7 +
        delta;


    wheel.style.transition =
        "none";


    wheel.style.transform =
        "rotate(" +
        currentRotation +
        "deg)";


    void wheel.offsetWidth;


    requestAnimationFrame(function() {

        wheel.style.transition =
            "transform 5.5s cubic-bezier(0.12, 0.72, 0.18, 1)";


        wheel.style.transform =
            "rotate(" +
            newRotation +
            "deg)";


        currentRotation =
            newRotation;

    });

}


/* =========================
   START SPIN
========================= */

function startSpin() {

    if (isSpinning) {
        return;
    }


    if (!canSpin()) {

        const remaining =
            getRemainingTime();


        updateSpinButton();


        const message =
            "Следующая прокрутка будет доступна через " +
            formatRemainingTime(remaining);


        if (tg && tg.showAlert) {

            tg.showAlert(message);

        } else {

            alert(message);

        }


        return;

    }


    isSpinning = true;


    spinButton.disabled = true;


    localStorage.setItem(

        LAST_SPIN_KEY,

        String(Date.now())

    );


    haptic("light");


    showScreen(rouletteScreen);


    if (spinStatus) {

        spinStatus.textContent =
            "РУЛЕТКА КРУТИТСЯ... ♡";

    }


    startProgress();


    const prize =
        getRandomPrize();


    animateWheel(prize);


    setTimeout(function() {

        showResult(prize);

    }, SPIN_TIME + 200);

}


/* =========================
   RESULT
========================= */

function showResult(prize) {

    isSpinning = false;


    resultIcon.textContent =
        prize.icon;


    resultName.textContent =
        prize.name;


    resultDescription.textContent =
        prize.description;


    haptic("success");


    showScreen(resultScreen);

}


/* =========================
   CLAIM PRIZE
========================= */

function claimPrize() {

    const prizeName =
        resultName.textContent;


    const message =
        "Здравствуйте! 🎀 Я выиграла в рулетке: " +
        prizeName +
        ". Хочу забрать свой приз ♡";


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

if (spinButton) {

    spinButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            startSpin();

        }
    );

}


if (backButton) {

    backButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();


            if (isSpinning) {
                return;
            }


            showScreen(homeScreen);

            updateSpinButton();

        }
    );

}


if (claimButton) {

    claimButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            claimPrize();

        }
    );

}


/* =========================
   INIT
========================= */

createWheelLabels();

updateSpinButton();

showScreen(homeScreen);


setInterval(function() {

    if (!isSpinning) {

        updateSpinButton();

    }

}, 1000);


console.log("ASYA ROULETTE READY ♡");
