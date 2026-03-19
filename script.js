const suits = ["♠", "♥", "♦", "♣"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

let deck = [];
let playerHand = [];
let dealerHand = [];
let gameOver = false;
let roundInProgress = false;

let balance = 1000;
let currentBet = 0;

let hiddenDealerCardElement = null;
let hiddenDealerCard = null;

const dealerCardsEl = document.getElementById("dealer-cards");
const playerCardsEl = document.getElementById("player-cards");
const dealerScoreEl = document.getElementById("dealer-score");
const playerScoreEl = document.getElementById("player-score");
const messageEl = document.getElementById("message");
const balanceDisplay = document.getElementById("balance-display");
const betDisplay = document.getElementById("bet-display");
const resultBurst = document.getElementById("result-burst");

const newGameBtn = document.getElementById("new-game-btn");
const hitBtn = document.getElementById("hit-btn");
const standBtn = document.getElementById("stand-btn");
const clearBetBtn = document.getElementById("clear-bet-btn");
const enterGameBtn = document.getElementById("enter-game-btn");
const startScreen = document.getElementById("start-screen");
const tableSurface = document.getElementById("table-surface");
const betChipButtons = document.querySelectorAll(".bet-chip");

const resultPopup = document.getElementById("result-popup");
const popupTitle = document.getElementById("popup-title");
const popupText = document.getElementById("popup-text");
const popupCloseBtn = document.getElementById("popup-close-btn");

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateMoneyUI() {
  balanceDisplay.textContent = `$${balance}`;
  betDisplay.textContent = `$${currentBet}`;
}

function setMessage(text, type = "normal") {
  messageEl.textContent = text;
  messageEl.style.color =
    type === "win" ? "#9be59b" :
    type === "lose" ? "#ff9b9b" :
    type === "draw" ? "#f7df8b" :
    "#f8f3e7";
}

function createDeck() {
  const newDeck = [];

  for (const suit of suits) {
    for (const value of values) {
      newDeck.push({ suit, value });
    }
  }

  return newDeck;
}

function shuffleDeck(deckToShuffle) {
  for (let i = deckToShuffle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
  }
}

function getCardNumericValue(card) {
  if (card.value === "A") return 11;
  if (["J", "Q", "K"].includes(card.value)) return 10;
  return parseInt(card.value, 10);
}

function calculateScore(hand) {
  let score = 0;
  let aces = 0;

  for (const card of hand) {
    score += getCardNumericValue(card);
    if (card.value === "A") aces++;
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
}



function playBeep(frequency = 440, duration = 0.08, type = "triangle", volume = 0.03) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  if (!playBeep.ctx) {
    playBeep.ctx = new AudioContextClass();
  }

  const ctx = playBeep.ctx;

  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  oscillator.stop(ctx.currentTime + duration);
}

function playDealSound() {
  playBeep(520, 0.06, "triangle", 0.02);
}

function playFlipSound() {
  playBeep(760, 0.08, "square", 0.025);
}

function playWinSound() {
  playBeep(660, 0.09, "triangle", 0.03);
  setTimeout(() => playBeep(880, 0.11, "triangle", 0.03), 90);
  setTimeout(() => playBeep(1100, 0.15, "triangle", 0.03), 180);
}

function playLoseSound() {
  playBeep(420, 0.12, "sawtooth", 0.025);
  setTimeout(() => playBeep(300, 0.18, "sawtooth", 0.022), 120);
}

function playChipSound() {
  playBeep(600, 0.04, "square", 0.018);
}


function createCardElement(card, options = {}) {
  const { hidden = false, animate = false } = options;

  const cardEl = document.createElement("div");
  cardEl.classList.add("card");

  if (animate) {
    cardEl.classList.add("dealing");
  }

  if (hidden) {
    cardEl.classList.add("back");

    const pattern = document.createElement("div");
    pattern.classList.add("card-pattern");
    cardEl.appendChild(pattern);

    return cardEl;
  }

  if (card.suit === "♥" || card.suit === "♦") {
    cardEl.classList.add("red");
  }

  cardEl.setAttribute("data-top", `${card.value}${card.suit}`);
  cardEl.setAttribute("data-bottom", `${card.value}${card.suit}`);
  cardEl.textContent = `${card.value}${card.suit}`;

  return cardEl;
}

function clearBoard() {
  dealerCardsEl.innerHTML = "";
  playerCardsEl.innerHTML = "";
  dealerScoreEl.textContent = "Puntaje: 0";
  playerScoreEl.textContent = "Puntaje: 0";
  hiddenDealerCardElement = null;
  hiddenDealerCard = null;
}

function updateScores(showDealerFull = false) {
  const playerScore = calculateScore(playerHand);
  playerScoreEl.textContent = `Puntaje: ${playerScore}`;

  if (showDealerFull) {
    const dealerScore = calculateScore(dealerHand);
    dealerScoreEl.textContent = `Puntaje: ${dealerScore}`;
  } else {
    const visibleScore = dealerHand.length > 0 ? getCardNumericValue(dealerHand[0]) : 0;
    dealerScoreEl.textContent = `Puntaje: ${visibleScore}`;
  }
}

function dealCard(hand) {
  const card = deck.pop();
  hand.push(card);
  return card;
}

function appendCardToUI(container, card, hidden = false) {
  const cardEl = createCardElement(card, { hidden, animate: true });
  container.appendChild(cardEl);
  playDealSound();
  return cardEl;
}

async function revealHiddenDealerCard() {
  if (!hiddenDealerCardElement || !hiddenDealerCard) return;

  playFlipSound();

  const revealedCard = createCardElement(hiddenDealerCard, { hidden: false, animate: true });
  hiddenDealerCardElement.replaceWith(revealedCard);

  hiddenDealerCardElement = null;
  hiddenDealerCard = null;

  updateScores(true);
  await wait(450);
}

async function initialDealSequence() {
  clearBoard();
  updateScores(false);

  let card;

  card = dealCard(playerHand);
  appendCardToUI(playerCardsEl, card, false);
  updateScores(false);
  await wait(340);

  card = dealCard(dealerHand);
  appendCardToUI(dealerCardsEl, card, false);
  updateScores(false);
  await wait(340);

  card = dealCard(playerHand);
  appendCardToUI(playerCardsEl, card, false);
  updateScores(false);
  await wait(340);

  card = dealCard(dealerHand);
  hiddenDealerCard = card;
  hiddenDealerCardElement = appendCardToUI(dealerCardsEl, card, true);
  updateScores(false);
  await wait(360);
}

function addToBet(amount) {
  if (roundInProgress) {
    setMessage("No puedes modificar la apuesta durante la ronda.", "lose");
    return;
  }

  if (balance < amount) {
    setMessage("No tienes saldo suficiente para esa ficha.", "lose");
    return;
  }

  balance -= amount;
  currentBet += amount;
  updateMoneyUI();
  playChipSound();
  setMessage(`Apuesta actual: $${currentBet}`);
}

function clearBet() {
  if (roundInProgress) {
    setMessage("No puedes limpiar la apuesta en medio de una ronda.", "lose");
    return;
  }

  balance += currentBet;
  currentBet = 0;
  updateMoneyUI();
  setMessage("Apuesta reiniciada.");
}


function disableRoundButtons() {
  hitBtn.disabled = true;
  standBtn.disabled = true;
}

function enableRoundButtons() {
  hitBtn.disabled = false;
  standBtn.disabled = false;
}

function setBettingEnabled(enabled) {
  betChipButtons.forEach(btn => {
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? "1" : "0.5";
    btn.style.cursor = enabled ? "pointer" : "not-allowed";
  });

  clearBetBtn.disabled = !enabled;
  clearBetBtn.style.opacity = enabled ? "1" : "0.5";
  clearBetBtn.style.cursor = enabled ? "pointer" : "not-allowed";
}

function checkBlackjack() {
  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);

  if (playerScore === 21 && dealerScore === 21) {
    endGame("Empate. Ambos tienen Blackjack.", "draw");
    return true;
  }

  if (playerScore === 21) {
    endGame("¡Blackjack! Ganaste.", "blackjack");
    return true;
  }

  if (dealerScore === 21) {
    endGame("El dealer tiene Blackjack. Perdiste.", "lose");
    return true;
  }

  return false;
}

async function startNewGame() {
  if (roundInProgress) return;

  hideResultPopup();

  if (currentBet <= 0) {
    setMessage("Primero debes apostar fichas para comenzar.", "lose");
    return;
  }

  roundInProgress = true;
  gameOver = false;
  setBettingEnabled(false);
  disableRoundButtons();

  deck = createDeck();
  shuffleDeck(deck);
  playerHand = [];
  dealerHand = [];

  setMessage("Repartiendo cartas...");
  await initialDealSequence();

  if (!checkBlackjack()) {
    enableRoundButtons();
    setMessage("Tu turno: pide una carta o plántate.");
  }
}

async function playerHit() {
  if (gameOver || !roundInProgress) return;

  disableRoundButtons();

  const card = dealCard(playerHand);
  appendCardToUI(playerCardsEl, card, false);
  updateScores(false);

  await wait(360);

  const playerScore = calculateScore(playerHand);

  if (playerScore > 21) {
    endGame("Te pasaste de 21. Perdiste.", "lose");
    return;
  }

  if (playerScore === 21) {
    await playerStand();
    return;
  }

  enableRoundButtons();
  setMessage("Tu turno: pide una carta o plántate.");
}

async function playerStand() {
  if (gameOver || !roundInProgress) return;

  disableRoundButtons();
  setMessage("Turno del dealer...");

  await wait(260);
  await revealHiddenDealerCard();

  let dealerScore = calculateScore(dealerHand);

  while (dealerScore < 17) {
    await wait(430);
    const card = dealCard(dealerHand);
    appendCardToUI(dealerCardsEl, card, false);
    updateScores(true);
    dealerScore = calculateScore(dealerHand);
  }

  await wait(350);
  determineWinner();
}

function determineWinner() {
  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);

  if (dealerScore > 21) {
    endGame("El dealer se pasó de 21. Ganaste.", "win");
    return;
  }

  if (playerScore > dealerScore) {
    endGame("Ganaste la partida.", "win");
  } else if (dealerScore > playerScore) {
    endGame("El dealer gana la partida.", "lose");
  } else {
    endGame("Empate.", "draw");
  }
}


function triggerTableFlash(type) {
  tableSurface.classList.remove("flash-win", "flash-lose");
  void tableSurface.offsetWidth;

  if (type === "win") {
    tableSurface.classList.add("flash-win");
  } else if (type === "lose") {
    tableSurface.classList.add("flash-lose");
  }
}

function triggerBurst(type) {
  resultBurst.classList.remove("show-win", "show-lose");
  void resultBurst.offsetWidth;

  if (type === "win") {
    resultBurst.classList.add("show-win");
  } else if (type === "lose") {
    resultBurst.classList.add("show-lose");
  }
}

function payWin(multiplier = 2) {
  balance += currentBet * multiplier;
  currentBet = 0;
  updateMoneyUI();
}

function payPush() {
  balance += currentBet;
  currentBet = 0;
  updateMoneyUI();
}

function loseBet() {
  currentBet = 0;
  updateMoneyUI();
}

function revealDealerCardImmediatelyIfNeeded() {
  if (!hiddenDealerCardElement || !hiddenDealerCard) return;

  const revealedCard = createCardElement(hiddenDealerCard, { hidden: false, animate: false });
  hiddenDealerCardElement.replaceWith(revealedCard);

  hiddenDealerCardElement = null;
  hiddenDealerCard = null;
}

function showResultPopup(message, resultType) {
  if (!resultPopup) return;

  resultPopup.classList.remove("hidden", "win", "lose", "draw");

  if (resultType === "blackjack") {
    resultPopup.classList.add("win");
    popupTitle.textContent = "¡Blackjack!";
  } else if (resultType === "win") {
    resultPopup.classList.add("win");
    popupTitle.textContent = "¡Ganaste!";
  } else if (resultType === "lose") {
    resultPopup.classList.add("lose");
    popupTitle.textContent = "Perdiste";
  } else {
    resultPopup.classList.add("draw");
    popupTitle.textContent = "Empate";
  }

  popupText.textContent = message;
}

function hideResultPopup() {
  if (!resultPopup) return;

  resultPopup.classList.add("hidden");
  resultPopup.classList.remove("win", "lose", "draw");
}

function endGame(message, resultType) {
  gameOver = true;
  roundInProgress = false;
  disableRoundButtons();
  setBettingEnabled(true);

  revealDealerCardImmediatelyIfNeeded();
  updateScores(true);

  const lower = message.toLowerCase();

  if (resultType === "blackjack") {
    setMessage("Ronda terminada.");
    payWin(2.5);
    triggerTableFlash("win");
    triggerBurst("win");
    playWinSound();
    showResultPopup(message, "blackjack");
  } else if (resultType === "win" || lower.includes("ganaste")) {
    setMessage("Ronda terminada.");
    payWin(2);
    triggerTableFlash("win");
    triggerBurst("win");
    playWinSound();
    showResultPopup(message, "win");
  } else if (resultType === "draw" || lower.includes("empate")) {
    setMessage("Ronda terminada.");
    payPush();
    showResultPopup(message, "draw");
  } else {
    setMessage("Ronda terminada.");
    loseBet();
    triggerTableFlash("lose");
    triggerBurst("lose");
    playLoseSound();
    showResultPopup(message, "lose");
  }

  if (balance <= 0 && currentBet === 0) {
    showResultPopup("Te quedaste sin saldo. Recarga el juego manualmente o reinicia el valor inicial.", "lose");
  }
}


function enterGame() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (AudioContextClass && playBeep.ctx && playBeep.ctx.state === "suspended") {
    playBeep.ctx.resume();
  }

  startScreen.classList.remove("active");
  setMessage('Selecciona fichas y presiona "Nueva partida".');
}

enterGameBtn.addEventListener("click", enterGame);
newGameBtn.addEventListener("click", startNewGame);
hitBtn.addEventListener("click", playerHit);
standBtn.addEventListener("click", playerStand);
clearBetBtn.addEventListener("click", clearBet);

betChipButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const value = Number(btn.dataset.value);
    addToBet(value);
  });
});

if (popupCloseBtn) {
  popupCloseBtn.addEventListener("click", hideResultPopup);
}

updateMoneyUI();
setBettingEnabled(true);
hideResultPopup();