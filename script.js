// Palos disponibles en la baraja
const suits = ["♠", "♥", "♦", "♣"];

// Valores disponibles en la baraja
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Variables principales del juego
let deck = []; // Baraja completa
let playerHand = []; // Mano del jugador
let dealerHand = []; // Mano del dealer
let gameOver = false; // Indica si la partida terminó
let roundInProgress = false; // Indica si una ronda está en curso

// Sistema de dinero/apuestas
let balance = 1000; // Saldo inicial del jugador
let currentBet = 0; // Apuesta actual

// Variables para manejar la carta oculta del dealer
let hiddenDealerCardElement = null; // Elemento HTML de la carta oculta
let hiddenDealerCard = null; // Objeto de la carta oculta

// Referencias a elementos del DOM
const dealerCardsEl = document.getElementById("dealer-cards");
const playerCardsEl = document.getElementById("player-cards");
const dealerScoreEl = document.getElementById("dealer-score");
const playerScoreEl = document.getElementById("player-score");
const messageEl = document.getElementById("message");
const balanceDisplay = document.getElementById("balance-display");
const betDisplay = document.getElementById("bet-display");
const resultBurst = document.getElementById("result-burst");

// Botones y pantallas principales
const newGameBtn = document.getElementById("new-game-btn");
const hitBtn = document.getElementById("hit-btn");
const standBtn = document.getElementById("stand-btn");
const clearBetBtn = document.getElementById("clear-bet-btn");
const enterGameBtn = document.getElementById("enter-game-btn");
const startScreen = document.getElementById("start-screen");
const tableSurface = document.getElementById("table-surface");
const betChipButtons = document.querySelectorAll(".bet-chip");

// Elementos del popup de resultado
const resultPopup = document.getElementById("result-popup");
const popupTitle = document.getElementById("popup-title");
const popupText = document.getElementById("popup-text");
const popupCloseBtn = document.getElementById("popup-close-btn");

// Función de espera para animaciones o pausas
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Actualiza en pantalla el saldo y la apuesta actual
function updateMoneyUI() {
  balanceDisplay.textContent = `$${balance}`;
  betDisplay.textContent = `$${currentBet}`;
}

// Muestra un mensaje en pantalla con color según el tipo
function setMessage(text, type = "normal") {
  messageEl.textContent = text;
  messageEl.style.color =
    type === "win" ? "#9be59b" :
    type === "lose" ? "#ff9b9b" :
    type === "draw" ? "#f7df8b" :
    "#f8f3e7";
}

// Crea una nueva baraja de 52 cartas
function createDeck() {
  const newDeck = [];

  for (const suit of suits) {
    for (const value of values) {
      newDeck.push({ suit, value });
    }
  }

  return newDeck;
}

// Mezcla aleatoriamente la baraja usando Fisher-Yates
function shuffleDeck(deckToShuffle) {
  for (let i = deckToShuffle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
  }
}

// Obtiene el valor numérico de una carta
function getCardNumericValue(card) {
  if (card.value === "A") return 11; // As vale 11 inicialmente
  if (["J", "Q", "K"].includes(card.value)) return 10; // Figuras valen 10
  return parseInt(card.value, 10); // Números se convierten directamente
}

// Calcula el puntaje total de una mano
function calculateScore(hand) {
  let score = 0;
  let aces = 0;

  for (const card of hand) {
    score += getCardNumericValue(card);
    if (card.value === "A") aces++;
  }

  // Si el puntaje supera 21 y hay ases, convierte ases de 11 a 1
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
}



// Función genérica para reproducir sonidos tipo beep
function playBeep(frequency = 440, duration = 0.08, type = "triangle", volume = 0.03) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  // Crea el contexto de audio solo una vez
  if (!playBeep.ctx) {
    playBeep.ctx = new AudioContextClass();
  }

  const ctx = playBeep.ctx;

  // Si el contexto está suspendido, lo reanuda
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

// Sonido al repartir carta
function playDealSound() {
  playBeep(520, 0.06, "triangle", 0.02);
}

// Sonido al revelar carta oculta
function playFlipSound() {
  playBeep(760, 0.08, "square", 0.025);
}

// Sonido de victoria
function playWinSound() {
  playBeep(660, 0.09, "triangle", 0.03);
  setTimeout(() => playBeep(880, 0.11, "triangle", 0.03), 90);
  setTimeout(() => playBeep(1100, 0.15, "triangle", 0.03), 180);
}

// Sonido de derrota
function playLoseSound() {
  playBeep(420, 0.12, "sawtooth", 0.025);
  setTimeout(() => playBeep(300, 0.18, "sawtooth", 0.022), 120);
}

// Sonido al apostar fichas
function playChipSound() {
  playBeep(600, 0.04, "square", 0.018);
}


// Crea visualmente una carta en HTML
function createCardElement(card, options = {}) {
  const { hidden = false, animate = false } = options;

  const cardEl = document.createElement("div");
  cardEl.classList.add("card");

  // Agrega clase para animación de reparto
  if (animate) {
    cardEl.classList.add("dealing");
  }

  // Si la carta está oculta, se muestra el reverso
  if (hidden) {
    cardEl.classList.add("back");

    const pattern = document.createElement("div");
    pattern.classList.add("card-pattern");
    cardEl.appendChild(pattern);

    return cardEl;
  }

  // Si la carta es roja, agrega clase especial
  if (card.suit === "♥" || card.suit === "♦") {
    cardEl.classList.add("red");
  }

  // Guarda el contenido en atributos y texto
  cardEl.setAttribute("data-top", `${card.value}${card.suit}`);
  cardEl.setAttribute("data-bottom", `${card.value}${card.suit}`);
  cardEl.textContent = `${card.value}${card.suit}`;

  return cardEl;
}

// Limpia el tablero para una nueva ronda
function clearBoard() {
  dealerCardsEl.innerHTML = "";
  playerCardsEl.innerHTML = "";
  dealerScoreEl.textContent = "Puntaje: 0";
  playerScoreEl.textContent = "Puntaje: 0";
  hiddenDealerCardElement = null;
  hiddenDealerCard = null;
}

// Actualiza puntajes en pantalla
function updateScores(showDealerFull = false) {
  const playerScore = calculateScore(playerHand);
  playerScoreEl.textContent = `Puntaje: ${playerScore}`;

  if (showDealerFull) {
    // Muestra todo el puntaje del dealer
    const dealerScore = calculateScore(dealerHand);
    dealerScoreEl.textContent = `Puntaje: ${dealerScore}`;
  } else {
    // Solo muestra el valor de la primera carta visible del dealer
    const visibleScore = dealerHand.length > 0 ? getCardNumericValue(dealerHand[0]) : 0;
    dealerScoreEl.textContent = `Puntaje: ${visibleScore}`;
  }
}

// Toma una carta del deck y la agrega a una mano
function dealCard(hand) {
  const card = deck.pop();
  hand.push(card);
  return card;
}

// Agrega una carta visualmente al contenedor correspondiente
function appendCardToUI(container, card, hidden = false) {
  const cardEl = createCardElement(card, { hidden, animate: true });
  container.appendChild(cardEl);
  playDealSound();
  return cardEl;
}

// Revela la carta oculta del dealer con animación
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

  // Primera carta del jugador
  card = dealCard(playerHand);
  appendCardToUI(playerCardsEl, card, false);
  updateScores(false);
  await wait(340);

  // Primera carta del dealer
  card = dealCard(dealerHand);
  appendCardToUI(dealerCardsEl, card, false);
  updateScores(false);
  await wait(340);

  // Segunda carta del jugador
  card = dealCard(playerHand);
  appendCardToUI(playerCardsEl, card, false);
  updateScores(false);
  await wait(340);

  // Segunda carta del dealer, oculta
  card = dealCard(dealerHand);
  hiddenDealerCard = card;
  hiddenDealerCardElement = appendCardToUI(dealerCardsEl, card, true);
  updateScores(false);
  await wait(360);
}

// Agrega dinero a la apuesta actual
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

// Limpia la apuesta y devuelve el dinero al saldo
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


// Desactiva botones de acción durante la ronda
function disableRoundButtons() {
  hitBtn.disabled = true;
  standBtn.disabled = true;
}

// Activa botones de acción
function enableRoundButtons() {
  hitBtn.disabled = false;
  standBtn.disabled = false;
}

// Activa o desactiva controles de apuesta
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

// Verifica si alguien tiene blackjack al inicio
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

  if (currentBet <= 0) {
    setMessage("Primero debes apostar fichas para comenzar.", "lose");
    return;
  }

  roundInProgress = true;
  gameOver = false;
  setBettingEnabled(false);
  disableRoundButtons();

  // Crear y mezclar nueva baraja
  deck = createDeck();
  shuffleDeck(deck);
  playerHand = [];
  dealerHand = [];

  setMessage("Repartiendo cartas...");
  await initialDealSequence();

  // Si no hubo blackjack, comienza el turno del jugador
  if (!checkBlackjack()) {
    enableRoundButtons();
    setMessage("Tu turno: pide una carta o plántate.");
  }
}

// Acción del jugador al pedir una carta
async function playerHit() {
  if (gameOver || !roundInProgress) return;

  disableRoundButtons();

  const card = dealCard(playerHand);
  appendCardToUI(playerCardsEl, card, false);
  updateScores(false);

  await wait(360);

  const playerScore = calculateScore(playerHand);

  // Si se pasa de 21, pierde
  if (playerScore > 21) {
    endGame("Te pasaste de 21. Perdiste.", "lose");
    return;
  }

  // Si llega a 21, se planta automáticamente
  if (playerScore === 21) {
    await playerStand();
    return;
  }

  enableRoundButtons();
  setMessage("Tu turno: pide una carta o plántate.");
}

// Acción del jugador al plantarse
async function playerStand() {
  if (gameOver || !roundInProgress) return;

  disableRoundButtons();
  setMessage("Turno del dealer...");

  await wait(260);
  await revealHiddenDealerCard();

  let dealerScore = calculateScore(dealerHand);

  // El dealer roba mientras tenga menos de 17
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

// Determina el ganador final de la ronda
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


// Activa un destello visual en la mesa según resultado
function triggerTableFlash(type) {
  tableSurface.classList.remove("flash-win", "flash-lose");
  void tableSurface.offsetWidth;

  if (type === "win") {
    tableSurface.classList.add("flash-win");
  } else if (type === "lose") {
    tableSurface.classList.add("flash-lose");
  }
}

// Activa un burst visual según resultado
function triggerBurst(type) {
  resultBurst.classList.remove("show-win", "show-lose");
  void resultBurst.offsetWidth;

  if (type === "win") {
    resultBurst.classList.add("show-win");
  } else if (type === "lose") {
    resultBurst.classList.add("show-lose");
  }
}

// Pago cuando el jugador gana
function payWin(multiplier = 2) {
  balance += currentBet * multiplier;
  currentBet = 0;
  updateMoneyUI();
}

// Pago en caso de empate, se devuelve la apuesta
function payPush() {
  balance += currentBet;
  currentBet = 0;
  updateMoneyUI();
}

// Pérdida de la apuesta
function loseBet() {
  currentBet = 0;
  updateMoneyUI();
}

// Revela instantáneamente la carta oculta del dealer si aún existe
function revealDealerCardImmediatelyIfNeeded() {
  if (!hiddenDealerCardElement || !hiddenDealerCard) return;

  const revealedCard = createCardElement(hiddenDealerCard, { hidden: false, animate: false });
  hiddenDealerCardElement.replaceWith(revealedCard);

  hiddenDealerCardElement = null;
  hiddenDealerCard = null;
}

// Muestra popup con el resultado de la ronda
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

// Oculta el popup de resultado
function hideResultPopup() {
  if (!resultPopup) return;

  resultPopup.classList.add("hidden");
  resultPopup.classList.remove("win", "lose", "draw");
}

// Finaliza la ronda y aplica pagos/resultados
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
    payWin(2.5); // Blackjack paga 2.5x
    triggerTableFlash("win");
    triggerBurst("win");
    playWinSound();
    showResultPopup(message, "blackjack");
  } else if (resultType === "win" || lower.includes("ganaste")) {
    setMessage("Ronda terminada.");
    payWin(2); // Victoria normal paga 2x
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

  // Si el jugador se quedó sin saldo, se muestra advertencia
  if (balance <= 0 && currentBet === 0) {
    showResultPopup("Te quedaste sin saldo. Recarga el juego manualmente o reinicia el valor inicial.", "lose");
  }
}


// Acción para entrar al juego desde la pantalla inicial
function enterGame() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (AudioContextClass && playBeep.ctx && playBeep.ctx.state === "suspended") {
    playBeep.ctx.resume();
  }

  startScreen.classList.remove("active");
  setMessage('Selecciona fichas y presiona "Nueva partida".');
}

// Eventos de botones principales
enterGameBtn.addEventListener("click", enterGame);
newGameBtn.addEventListener("click", startNewGame);
hitBtn.addEventListener("click", playerHit);
standBtn.addEventListener("click", playerStand);
clearBetBtn.addEventListener("click", clearBet);

// Eventos para las fichas de apuesta
betChipButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const value = Number(btn.dataset.value);
    addToBet(value);
  });
});

// Evento para cerrar popup de resultado
if (popupCloseBtn) {
  popupCloseBtn.addEventListener("click", hideResultPopup);
}

// Estado inicial de la interfaz
updateMoneyUI();
setBettingEnabled(true);
hideResultPopup();