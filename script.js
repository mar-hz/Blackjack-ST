// Palos y valores de las cartas
const suits = ["♠", "♥", "♦", "♣"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Variables principales del juego
let deck = [];            // Baraja
let playerHand = [];      // Cartas del jugador
let dealerHand = [];      // Cartas del dealer
let gameOver = false;     
let roundInProgress = false;

// Dinero y apuesta
let balance = 1000;
let currentBet = 0;

// Carta oculta del dealer
let hiddenDealerCardElement = null;
let hiddenDealerCard = null;

// Elementos del DOM (UI)
const dealerCardsEl = document.getElementById("dealer-cards");
const playerCardsEl = document.getElementById("player-cards");
const dealerScoreEl = document.getElementById("dealer-score");
const playerScoreEl = document.getElementById("player-score");
const messageEl = document.getElementById("message");
const balanceDisplay = document.getElementById("balance-display");
const betDisplay = document.getElementById("bet-display");
const resultBurst = document.getElementById("result-burst");

// Botones
const newGameBtn = document.getElementById("new-game-btn");
const hitBtn = document.getElementById("hit-btn");
const standBtn = document.getElementById("stand-btn");
const clearBetBtn = document.getElementById("clear-bet-btn");
const enterGameBtn = document.getElementById("enter-game-btn");

// Pantallas y mesa
const startScreen = document.getElementById("start-screen");
const tableSurface = document.getElementById("table-surface");
const betChipButtons = document.querySelectorAll(".bet-chip");

// Popup de resultados
const resultPopup = document.getElementById("result-popup");
const popupTitle = document.getElementById("popup-title");
const popupText = document.getElementById("popup-text");
const popupCloseBtn = document.getElementById("popup-close-btn");

// Función para esperar (delay)
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Actualiza el dinero en pantalla
function updateMoneyUI() {
  balanceDisplay.textContent = `$${balance}`;
  betDisplay.textContent = `$${currentBet}`;
}

// Muestra mensajes con color según resultado
function setMessage(text, type = "normal") {
  messageEl.textContent = text;
  messageEl.style.color =
    type === "win" ? "#9be59b" :
    type === "lose" ? "#ff9b9b" :
    type === "draw" ? "#f7df8b" :
    "#f8f3e7";
}

// Crea la baraja completa (52 cartas)
function createDeck() {
  const newDeck = [];

  for (const suit of suits) {
    for (const value of values) {
      newDeck.push({ suit, value });
    }
  }

  return newDeck;
}

// Mezcla la baraja (algoritmo Fisher-Yates)
function shuffleDeck(deckToShuffle) {
  for (let i = deckToShuffle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
  }
}

// Convierte carta a valor numérico
function getCardNumericValue(card) {
  if (card.value === "A") return 11;         // As vale 11 (puede cambiar luego)
  if (["J", "Q", "K"].includes(card.value)) return 10; // Figuras valen 10
  return parseInt(card.value, 10);           // Número normal
}

// Calcula el puntaje de una mano
function calculateScore(hand) {
  let score = 0;
  let aces = 0;

  for (const card of hand) {
    score += getCardNumericValue(card);
    if (card.value === "A") aces++;
  }

  // Ajusta ases de 11 a 1 si se pasa de 21
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
}

// Genera sonidos usando Web Audio API
function playBeep(frequency = 440, duration = 0.08, type = "triangle", volume = 0.03) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  // Crea contexto una sola vez
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

  // Apaga sonido suavemente
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  oscillator.stop(ctx.currentTime + duration);
}

// Sonidos específicos del juego
function playDealSound() {
  playBeep(520, 0.06, "triangle", 0.02); // Repartir carta
}

function playFlipSound() {
  playBeep(760, 0.08, "square", 0.025); // Voltear carta
}

function playWinSound() {
  playBeep(660, 0.09);
  setTimeout(() => playBeep(880, 0.11), 90);
  setTimeout(() => playBeep(1100, 0.15), 180); // Secuencia de victoria
}

function playLoseSound() {
  playBeep(420, 0.12, "sawtooth");
  setTimeout(() => playBeep(300, 0.18, "sawtooth"), 120); // Secuencia de derrota
}

function playChipSound() {
  playBeep(600, 0.04, "square", 0.018); // Sonido de ficha
}


// Crea una carta visual en el HTML
function createCardElement(card, options = {}) {
  const { hidden = false, animate = false } = options;

  const cardEl = document.createElement("div");
  cardEl.classList.add("card");

  // Animación al repartir
  if (animate) {
    cardEl.classList.add("dealing");
  }

  // Carta boca abajo
  if (hidden) {
    cardEl.classList.add("back");

    const pattern = document.createElement("div");
    pattern.classList.add("card-pattern");
    cardEl.appendChild(pattern);

    return cardEl;
  }

  // Color rojo para corazones y diamantes
  if (card.suit === "♥" || card.suit === "♦") {
    cardEl.classList.add("red");
  }

  // Contenido de la carta
  cardEl.setAttribute("data-top", `${card.value}${card.suit}`);
  cardEl.setAttribute("data-bottom", `${card.value}${card.suit}`);
  cardEl.textContent = `${card.value}${card.suit}`;

  return cardEl;
}

// Limpia la mesa y reinicia puntajes visuales
function clearBoard() {
  dealerCardsEl.innerHTML = "";
  playerCardsEl.innerHTML = "";
  dealerScoreEl.textContent = "Puntaje: 0";
  playerScoreEl.textContent = "Puntaje: 0";
  hiddenDealerCardElement = null;
  hiddenDealerCard = null;
}

// Actualiza los puntajes en pantalla
function updateScores(showDealerFull = false) {
  const playerScore = calculateScore(playerHand);
  playerScoreEl.textContent = `Puntaje: ${playerScore}`;

  if (showDealerFull) {
    // Muestra todo el puntaje del dealer
    const dealerScore = calculateScore(dealerHand);
    dealerScoreEl.textContent = `Puntaje: ${dealerScore}`;
  } else {
    // Solo muestra la primera carta del dealer
    const visibleScore = dealerHand.length > 0 ? getCardNumericValue(dealerHand[0]) : 0;
    dealerScoreEl.textContent = `Puntaje: ${visibleScore}`;
  }
}

// Toma una carta del deck
function dealCard(hand) {
  const card = deck.pop();
  hand.push(card);
  return card;
}

// Agrega carta al HTML con animación
function appendCardToUI(container, card, hidden = false) {
  const cardEl = createCardElement(card, { hidden, animate: true });
  container.appendChild(cardEl);
  playDealSound();
  return cardEl;
}

// Revela la carta oculta del dealer
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

// Secuencia inicial de reparto
async function initialDealSequence() {
  clearBoard();
  updateScores(false);

  let card;

  // Jugador
  card = dealCard(playerHand);
  appendCardToUI(playerCardsEl, card);
  updateScores(false);
  await wait(340);

  // Dealer
  card = dealCard(dealerHand);
  appendCardToUI(dealerCardsEl, card);
  updateScores(false);
  await wait(340);

  // Jugador
  card = dealCard(playerHand);
  appendCardToUI(playerCardsEl, card);
  updateScores(false);
  await wait(340);

  // Dealer (oculta)
  card = dealCard(dealerHand);
  hiddenDealerCard = card;
  hiddenDealerCardElement = appendCardToUI(dealerCardsEl, card, true);
  updateScores(false);
  await wait(360);
}

// Agrega fichas a la apuesta
function addToBet(amount) {
  if (roundInProgress) {
    setMessage("No puedes modificar la apuesta durante la ronda.", "lose");
    return;
  }

  if (balance < amount) {
    setMessage("No tienes saldo suficiente.", "lose");
    return;
  }

  balance -= amount;
  currentBet += amount;
  updateMoneyUI();
  playChipSound();
  setMessage(`Apuesta actual: $${currentBet}`);
}

// Limpia la apuesta
function clearBet() {
  if (roundInProgress) {
    setMessage("No puedes limpiar la apuesta en medio de la ronda.", "lose");
    return;
  }

  balance += currentBet;
  currentBet = 0;
  updateMoneyUI();
  setMessage("Apuesta reiniciada.");
}

// Desactiva botones de juego
function disableRoundButtons() {
  hitBtn.disabled = true;
  standBtn.disabled = true;
}

// Activa botones de juego
function enableRoundButtons() {
  hitBtn.disabled = false;
  standBtn.disabled = false;
}

// Activa/desactiva apuestas
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

// Verifica si hay Blackjack al inicio
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

// Inicia una nueva partida
async function startNewGame() {
  if (roundInProgress) return;

  hideResultPopup();

  // Verifica que haya apuesta
  if (currentBet <= 0) {
    setMessage("Primero debes apostar.", "lose");
    return;
  }

  roundInProgress = true;
  gameOver = false;

  // Bloquea apuestas y botones
  setBettingEnabled(false);
  disableRoundButtons();

  // Reinicia baraja y manos
  deck = createDeck();
  shuffleDeck(deck);
  playerHand = [];
  dealerHand = [];

  setMessage("Repartiendo cartas...");
  await initialDealSequence();

  // Si no hay blackjack, turno del jugador
  if (!checkBlackjack()) {
    enableRoundButtons();
    setMessage("Tu turno: pide o plántate.");
  }
}

// Acción: pedir carta
async function playerHit() {
  // Evita acciones si el juego terminó o no inició
  if (gameOver || !roundInProgress) return;

  disableRoundButtons();

  // Reparte carta al jugador
  const card = dealCard(playerHand);
  appendCardToUI(playerCardsEl, card);
  updateScores(false);

  await wait(360);

  const playerScore = calculateScore(playerHand);

  // Si se pasa de 21 pierde
  if (playerScore > 21) {
    endGame("Te pasaste de 21. Perdiste.", "lose");
    return;
  }

  // Si llega a 21 automáticamente se planta
  if (playerScore === 21) {
    await playerStand();
    return;
  }

  // Sigue turno del jugador
  enableRoundButtons();
  setMessage("Tu turno: pide una carta o plántate.");
}

// Acción: plantarse
async function playerStand() {
  if (gameOver || !roundInProgress) return;

  disableRoundButtons();
  setMessage("Turno del dealer...");

  await wait(260);

  // Revela carta oculta del dealer
  await revealHiddenDealerCard();

  let dealerScore = calculateScore(dealerHand);

  // Dealer pide hasta tener mínimo 17
  while (dealerScore < 17) {
    await wait(430);
    const card = dealCard(dealerHand);
    appendCardToUI(dealerCardsEl, card);
    updateScores(true);
    dealerScore = calculateScore(dealerHand);
  }

  await wait(350);
  determineWinner();
}

// Determina quién gana
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

// Efecto visual en la mesa (ganar/perder)
function triggerTableFlash(type) {
  tableSurface.classList.remove("flash-win", "flash-lose");
  void tableSurface.offsetWidth; // reinicia animación

  if (type === "win") {
    tableSurface.classList.add("flash-win");
  } else if (type === "lose") {
    tableSurface.classList.add("flash-lose");
  }
}

// Efecto de partículas (ganar/perder)
function triggerBurst(type) {
  resultBurst.classList.remove("show-win", "show-lose");
  void resultBurst.offsetWidth;

  if (type === "win") {
    resultBurst.classList.add("show-win");
  } else if (type === "lose") {
    resultBurst.classList.add("show-lose");
  }
}

// Pago al ganar (multiplicador)
function payWin(multiplier = 2) {
  balance += currentBet * multiplier;
  currentBet = 0;
  updateMoneyUI();
}

// Empate: devuelve apuesta
function payPush() {
  balance += currentBet;
  currentBet = 0;
  updateMoneyUI();
}

// Pierde: pierde apuesta
function loseBet() {
  currentBet = 0;
  updateMoneyUI();
}

// Revela carta del dealer sin animación (si quedó oculta)
function revealDealerCardImmediatelyIfNeeded() {
  if (!hiddenDealerCardElement || !hiddenDealerCard) return;

  const revealedCard = createCardElement(hiddenDealerCard, { hidden: false, animate: false });
  hiddenDealerCardElement.replaceWith(revealedCard);

  hiddenDealerCardElement = null;
  hiddenDealerCard = null;
}

// Muestra popup de resultado
function showResultPopup(message, resultType) {
  if (!resultPopup) return;

  resultPopup.classList.remove("hidden", "win", "lose", "draw");

  // Configura título según resultado
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

// Oculta popup
function hideResultPopup() {
  if (!resultPopup) return;

  resultPopup.classList.add("hidden");
  resultPopup.classList.remove("win", "lose", "draw");
}

// Finaliza la partida
function endGame(message, resultType) {
  gameOver = true;
  roundInProgress = false;

  disableRoundButtons();
  setBettingEnabled(true);

  // Revela carta del dealer y actualiza puntaje
  revealDealerCardImmediatelyIfNeeded();
  updateScores(true);

  const lower = message.toLowerCase();

  // Resultado: Blackjack
  if (resultType === "blackjack") {
    setMessage("Ronda terminada.");
    payWin(2.5);
    triggerTableFlash("win");
    triggerBurst("win");
    playWinSound();
    showResultPopup(message, "blackjack");

  // Resultado: Ganar
  } else if (resultType === "win" || lower.includes("ganaste")) {
    setMessage("Ronda terminada.");
    payWin(2);
    triggerTableFlash("win");
    triggerBurst("win");
    playWinSound();
    showResultPopup(message, "win");

  // Resultado: Empate
  } else if (resultType === "draw" || lower.includes("empate")) {
    setMessage("Ronda terminada.");
    payPush();
    showResultPopup(message, "draw");

  // Resultado: Perder
  } else {
    setMessage("Ronda terminada.");
    loseBet();
    triggerTableFlash("lose");
    triggerBurst("lose");
    playLoseSound();
    showResultPopup(message, "lose");
  }

  // Caso sin dinero
  if (balance <= 0 && currentBet === 0) {
    showResultPopup("Te quedaste sin saldo.", "lose");
  }
}

// Entra al juego desde pantalla inicial
function enterGame() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  // Activa audio si estaba pausado
  if (AudioContextClass && playBeep.ctx && playBeep.ctx.state === "suspended") {
    playBeep.ctx.resume();
  }

  startScreen.classList.remove("active");
  setMessage('Selecciona fichas y presiona "Nueva partida".');
}

// Eventos de botones
enterGameBtn.addEventListener("click", enterGame);
newGameBtn.addEventListener("click", startNewGame);
hitBtn.addEventListener("click", playerHit);
standBtn.addEventListener("click", playerStand);
clearBetBtn.addEventListener("click", clearBet);

// Eventos de fichas
betChipButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const value = Number(btn.dataset.value);
    addToBet(value);
  });
});

// Botón cerrar popup
if (popupCloseBtn) {
  popupCloseBtn.addEventListener("click", hideResultPopup);
}

// Estado inicial
updateMoneyUI();
setBettingEnabled(true);
hideResultPopup();