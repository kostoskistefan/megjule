"use strict";

let allAvailableWords = [];
let secretWord = "";
let lowerBoundWord = "";
let upperBoundWord = "";
let lowerBoundIndex = 0;
let upperBoundIndex = 0;
let guessCount = 0;
let isGameOver = false;
let currentGameMode = localStorage.getItem("gameMode") || "daily";
let maxGuesses = 14;
let usedWords = new Set();

const MACEDONIAN_ALPHABET = [
    "А", "Б", "В", "Г", "Д", "Ѓ", "Е", "Ж", "З", "Ѕ", "И", "Ј", "К", "Л", "Љ", "М", 
    "Н", "Њ", "О", "П", "Р", "С", "Т", "Ќ", "У", "Ф", "Х", "Ц", "Ч", "Џ", "Ш"
];

const guessInput = document.getElementById("guess-input");
const submitGuessButton = document.getElementById("submit-guess-button");
const lowerBoundDisplay = document.getElementById("lower-bound-display");
const upperBoundDisplay = document.getElementById("upper-bound-display");
const toastContainer = document.getElementById("toast-container");
const statisticsDisplay = document.getElementById("statistics-display");
const victoryMessage = document.getElementById("victory-message");
const restartGameButton = document.getElementById("restart-game-button");
const virtualKeyboard = document.getElementById("virtual-keyboard");
const zoomRangeBar = document.getElementById("zoom-range-bar");
const zoomMarker = document.getElementById("zoom-marker");
const zoomPercentageDisplay = document.getElementById("zoom-percentage-display");

async function initializeGame() {
    try {
        const response = await fetch("wordlist.txt");
        const textData = await response.text();
        
        const rawWords = textData.split(/\r?\n/);
        allAvailableWords = [...new Set(rawWords)]
            .map(word => word.trim().toUpperCase())
            .filter(word => word.length === 5);

        if (allAvailableWords.length === 0) return;

        allAvailableWords.sort((firstWord, secondWord) => 
            firstWord.localeCompare(secondWord, 'mk')
        );

        createAlphabeticalKeyboard();
        updateModeUI();
        startNewGame();
    } catch (error) {
        console.error("Грешка:", error);
    }
}

function resetKeyboard() {
    const keys = document.querySelectorAll(".keyboard-key");

    keys.forEach(key => {
        key.classList.remove("keyboard-key-disabled");
        key.disabled = false;
    });
}

function startNewGame() {
    document.getElementById("victory-overlay")?.classList.add("hidden");
    document.getElementById("failure-overlay")?.classList.add("hidden");

    guessCount = 0;
    updateLivesUI();

    if (currentGameMode === "daily") {
        const saved =
            localStorage.getItem(getDailyStorageKey());

        if (saved) {
            const data = JSON.parse(saved);

            document
                .getElementById("victory-overlay")
                .classList.remove("hidden");

            victoryMessage.textContent =
                `Дневниот предизвик е веќе решен во ${data.guesses} обиди!`;

            isGameOver = true;

            return;
        }

        secretWord = getDailyWord();
    }

    else {
        const randomIndex =
            Math.floor(Math.random() * allAvailableWords.length);

        secretWord = allAvailableWords[randomIndex];
    }

    lowerBoundWord = "ААААА";
    upperBoundWord = "ШШШШШ";

    lowerBoundIndex = -1;
    upperBoundIndex = allAvailableWords.length;

    guessCount = 0;
    isGameOver = false;

    guessInput.disabled = false;
    submitGuessButton.disabled = false;

    guessInput.value = "";

    resetKeyboard();
    updateKeyboardState();
    updateUI();
}

function updateModeUI() {
    if (currentGameMode === "daily") {
        dailyModeButton.classList.add("active");
        unlimitedModeButton.classList.remove("active");
    } else {
        unlimitedModeButton.classList.add("active");
        dailyModeButton.classList.remove("active");
    }
}

function createAlphabeticalKeyboard() {
    virtualKeyboard.innerHTML = "";
    
    const rows = [
        MACEDONIAN_ALPHABET.slice(0, 11),
        MACEDONIAN_ALPHABET.slice(11, 22),
        MACEDONIAN_ALPHABET.slice(22)
    ];

    rows.forEach((row, rowIndex) => {
        const rowElement = document.createElement("div");
        rowElement.className = "keyboard-row";
        
        row.forEach(key => {
            const keyElement = document.createElement("button");
            keyElement.className = "keyboard-key";
            keyElement.textContent = key;
            keyElement.dataset.letter = key;
            keyElement.addEventListener("click", () => handleKeyClick(key));
            rowElement.appendChild(keyElement);
        });
        
        if (rowIndex === 2) {
            const backspace = document.createElement("button");
            backspace.className = "keyboard-key keyboard-key-backspace";
            backspace.textContent = "⌫";
            backspace.addEventListener("click", handleBackspace);
            rowElement.appendChild(backspace);
        }
        
        virtualKeyboard.appendChild(rowElement);
    });
}

function handleKeyClick(letter) {
    if (isGameOver || guessInput.value.length >= 5) return;
    
    const nextGuess = guessInput.value + letter;
    if (isPartialGuessValid(nextGuess)) {
        guessInput.value = nextGuess;
        updateKeyboardState();
    }
}

function handleBackspace() {
    guessInput.value = guessInput.value.slice(0, -1);
    updateKeyboardState();
}

function getValidRemainingWords() {
    return allAvailableWords.filter(word => {
        const inBounds =
            word.localeCompare(lowerBoundWord, 'mk') >= 0 &&
            word.localeCompare(upperBoundWord, 'mk') <= 0;

        return inBounds && !usedWords.has(word);
    });
}

function isPartialGuessValid(partialGuess) {
    const remaining = getValidRemainingWords();

    return remaining.some(word => word.startsWith(partialGuess));
}

function updateUI() {
    lowerBoundDisplay.textContent = lowerBoundWord;
    upperBoundDisplay.textContent = upperBoundWord;
    
    const totalWords = allAvailableWords.length;
    const currentRangeSize = upperBoundIndex - lowerBoundIndex - 1;
    const percentage = (currentRangeSize / totalWords) * 100;
    
    zoomPercentageDisplay.textContent = `${percentage.toFixed(2)}%`;
    
    const leftEdge = ((lowerBoundIndex + 1) / totalWords) * 100;

    const rightEdge = 100 - ((upperBoundIndex) / totalWords) * 100;
    
    zoomRangeBar.style.left = `${leftEdge}%`;
    zoomRangeBar.style.right = `${rightEdge}%`;
    
    const secretWordIndex = allAvailableWords.indexOf(secretWord);
    zoomMarker.style.left = `${(secretWordIndex / totalWords) * 100}%`;

    updateKeyboardState();
    updateLivesUI();
}

function updateKeyboardState() {
    const currentInput = guessInput.value.toUpperCase();
    const keys = document.querySelectorAll(".keyboard-key[data-letter]");
    
    keys.forEach(keyElement => {
        const letter = keyElement.dataset.letter;
        const potentialNextGuess = currentInput + letter;
        
        const isFullWord =
            potentialNextGuess.length === 5 &&
            (potentialNextGuess === lowerBoundWord ||
             potentialNextGuess === upperBoundWord);

        const isDisabled =
            currentInput.length >= 5 ||
            isFullWord ||
            !isPartialGuessValid(potentialNextGuess);
        
        if (isDisabled) {
            keyElement.classList.add("keyboard-key-disabled");
            keyElement.disabled = true;
        } else {
            keyElement.classList.remove("keyboard-key-disabled");
            keyElement.disabled = false;
        }
    });
}

function handleGuessSubmission() {
    if (isGameOver) return;

    const currentGuess = guessInput.value.trim().toUpperCase();

    if (currentGuess.length !== 5) {
        displayFeedback("Зборот мора да има 5 букви.", "error");
        return;
    }

    if (!allAvailableWords.includes(currentGuess)) {
        displayFeedback("Зборот не е во листата.", "error");
        return;
    }

    const compareToLower = currentGuess.localeCompare(lowerBoundWord, 'mk');
    const compareToUpper = currentGuess.localeCompare(upperBoundWord, 'mk');

    if (
        currentGuess === lowerBoundWord ||
        currentGuess === upperBoundWord ||
        compareToLower < 0 ||
        compareToUpper > 0
    ) {
        displayFeedback("Зборот е надвор од дозволениот опсег!", "error");
        return;
    }

    guessCount++;

    const comparisonToSecret = currentGuess.localeCompare(secretWord, 'mk');

    if (guessCount >= maxGuesses && comparisonToSecret !== 0) {
        handleGameOver();
        return;
    }

    usedWords.add(currentGuess);

    if (comparisonToSecret === 0) {
        handleVictory();
    } else if (comparisonToSecret < 0) {
        lowerBoundWord = currentGuess;
        lowerBoundIndex = allAvailableWords.indexOf(currentGuess);
    } else {
        upperBoundWord = currentGuess;
        upperBoundIndex = allAvailableWords.indexOf(currentGuess);
    }

    updateUI();

    guessInput.value = "";
    updateKeyboardState();
}

function handleVictory() {
    isGameOver = true;

    guessInput.disabled = true;
    submitGuessButton.disabled = true;

    victoryMessage.textContent = `${guessCount}`;

    document
        .getElementById("victory-overlay")
        .classList.remove("hidden");

    createConfetti();

    if (currentGameMode === "daily") {
        localStorage.setItem(
            getDailyStorageKey(),
            JSON.stringify({
                completed: true,
                guesses: guessCount
            })
        );
    }
}

function displayFeedback(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function createConfetti() {
    const confettiContainer =
        document.getElementById("confetti-container");

    confettiContainer.innerHTML = "";

    const colors = [
        "#6c5ce7",
        "#a29bfe",
        "#55efc4",
        "#fd79a8",
        "#ffeaa7",
        "#00cec9",
        "#ff7675"
    ];

    for (let i = 0; i < 100; i++) {
        const confetti =
            document.createElement("div");

        confetti.className = "confetti";

        const size = 6 + Math.random() * 10;

        confetti.style.width = `${size}px`;
        confetti.style.height = `${size * 1.8}px`;

        confetti.style.background =
            colors[Math.floor(Math.random() * colors.length)];

        const startX = Math.random() * window.innerWidth;
        const endX = startX + (Math.random() - 0.5) * 300;

        const startY = -200 - Math.random() * 800;

        confetti.style.setProperty("--start-x", `${startX}px`);
        confetti.style.setProperty("--end-x", `${endX}px`);
        confetti.style.setProperty("--start-y", `${startY}px`);

        confetti.style.transform =
            `translate3d(${startX}px, ${startY}px, 0)`;

        confetti.style.animationDuration =
            `${3 + Math.random() * 5}s`;

        confetti.style.animationDelay =
            `${Math.random() * 2}s`;

        confetti.style.borderRadius =
            Math.random() > 0.5 ? "50%" : "2px";

        confetti.style.opacity =
            0.7 + Math.random() * 0.3;

        confettiContainer.appendChild(confetti);
    }
}

function getDailySeed() {
    const today = new Date();

    const y = today.getUTCFullYear();
    const m = String(today.getUTCMonth() + 1).padStart(2, "0");
    const d = String(today.getUTCDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
}

function seededHash(string) {
    let hash = 0;

    for (let i = 0; i < string.length; i++) {
        hash =
            ((hash << 5) - hash) +
            string.charCodeAt(i);

        hash |= 0;
    }

    return Math.abs(hash);
}

function getDailyWord() {
    const seed = getDailySeed();

    const hash = seededHash(seed);

    const index = hash % allAvailableWords.length;

    return allAvailableWords[index];
}

function getDailyStorageKey() {
    return `daily-${getDailySeed()}`;
}

function getRemainingGuesses() {
    return maxGuesses - guessCount;
}

function updateLivesUI() {
    const container = document.getElementById("lives-display");
    container.innerHTML = "";

    const used = guessCount;

    for (let i = 0; i < maxGuesses; i++) {
        const life = document.createElement("div");

        const isUsed = i < used;

        life.className = "life " + (isUsed ? "used" : "remaining");

        container.appendChild(life);
    }
}

function handleGameOver() {
    isGameOver = true;

    guessInput.disabled = true;
    submitGuessButton.disabled = true;

    const overlay = document.getElementById("failure-overlay");
    const wordEl = document.getElementById("failure-word");

    wordEl.textContent = secretWord;

    overlay.classList.remove("hidden");
}

submitGuessButton.addEventListener("click", handleGuessSubmission);
guessInput.addEventListener("input", () => {
    guessInput.value = guessInput.value.toUpperCase();
    updateKeyboardState();
});
guessInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") handleGuessSubmission();
});

restartGameButton.addEventListener("click", () => {
    if (currentGameMode === "daily") {

        const saved =
            localStorage.getItem(getDailyStorageKey());

        if (saved) {
            currentGameMode = "unlimited";

            localStorage.setItem("gameMode", "unlimited");

            dailyModeButton.classList.remove("active");
            unlimitedModeButton.classList.add("active");
        }
    }

    startNewGame();
});

document
    .getElementById("restart-failure-button")
    .addEventListener("click", () => {
        document
            .getElementById("failure-overlay")
            .classList.add("hidden");

        startNewGame();
    });

const dailyModeButton =
    document.getElementById("daily-mode-button");

const unlimitedModeButton =
    document.getElementById("unlimited-mode-button");

dailyModeButton.addEventListener("click", () => {
    currentGameMode = "daily";
    localStorage.setItem("gameMode", "daily");

    dailyModeButton.classList.add("active");
    unlimitedModeButton.classList.remove("active");

    startNewGame();
});

unlimitedModeButton.addEventListener("click", () => {
    currentGameMode = "unlimited";
    localStorage.setItem("gameMode", "unlimited");

    unlimitedModeButton.classList.add("active");
    dailyModeButton.classList.remove("active");

    startNewGame();
});

initializeGame();
