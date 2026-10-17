/**
 * ============================================================
 * ANTONIO RUN - MOTOR DO JOGO E MECÂNICAS DO FIGMA
 * ============================================================
 */

// Elementos DOM
const gameBoard = document.getElementById('game-board');
const scenery = document.getElementById('scenery');
const clouds = document.querySelector('.clouds');
const antonio = document.getElementById('antonio');
const dog = document.getElementById('dog');
const coinsContainer = document.getElementById('coins-container');
const floatingScores = document.getElementById('floating-scores');

// HUD
const gameHud = document.getElementById('game-hud');
const hudPlayerName = document.getElementById('hud-player-name');
const hudTimerValue = document.getElementById('hud-timer-value');
const hudCoinsValue = document.getElementById('hud-coins-value');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const mobileTouchHint = document.getElementById('mobile-touch-hint');

// Modais e Máscara
const screenMask = document.getElementById('screen-mask');
const menuModal = document.getElementById('menu-modal');
const gameOverModal = document.getElementById('game-over-modal');
const rankingModal = document.getElementById('ranking-modal');

// Inputs e Botões
const playerNameInput = document.getElementById('player-name-input');
const startGameBtn = document.getElementById('start-game-btn');
const showRankingBtn = document.getElementById('show-ranking-btn');
const restartGameBtn = document.getElementById('restart-game-btn');
const rankingRestartBtn = document.getElementById('ranking-restart-btn');
const rankingTableBody = document.getElementById('ranking-table-body');

// Stats no Game Over
const statsCoins = document.getElementById('stats-coins');
const statsTime = document.getElementById('stats-time');
const statsScore = document.getElementById('stats-score');

// ============================================================
// SISTEMA DE ÁUDIO RETRO (SINTETIZADOR WEB AUDIO API 8-BIT)
// ============================================================
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, type, duration, startTime = 0, gainVal = 0.15) {
  if (!soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);

    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime + startTime);
    osc.stop(audioCtx.currentTime + startTime + duration);
  } catch (e) {
    // Silencia erros caso bloqueado pelo navegador
  }
}

function playJumpSound() {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {}
}

function playCoinSound() {
  if (!soundEnabled) return;
  initAudio();
  playTone(987.77, 'square', 0.08, 0, 0.18);      // B5
  playTone(1318.51, 'square', 0.22, 0.07, 0.18);   // E6
}

function playGameOverSound() {
  if (!soundEnabled) return;
  initAudio();
  playTone(400, 'sawtooth', 0.15, 0, 0.2);
  playTone(340, 'sawtooth', 0.18, 0.15, 0.2);
  playTone(280, 'sawtooth', 0.22, 0.33, 0.2);
  playTone(200, 'sawtooth', 0.45, 0.55, 0.25);
}

function playClickSound() {
  if (!soundEnabled) return;
  initAudio();
  playTone(520, 'triangle', 0.06, 0, 0.1);
}

// Alternar som
soundToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  soundEnabled = !soundEnabled;
  soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
  if (soundEnabled) playClickSound();
});

// ============================================================
// ESTADO DO JOGO E VARIÁVEIS
// ============================================================
let gameState = 'MENU'; // 'MENU' | 'PLAYING' | 'GAME_OVER' | 'RANKING'
let playerName = 'Antonio';
let secondsElapsed = 0;
let coinsCount = 0;
let isJumping = false;

let gameLoopInterval = null;
let timerInterval = null;
let coinSpawnTimeout = null;
let activeCoins = []; // lista de elementos de moedas ativas

// ============================================================
// MECÂNICA DE PULO
// ============================================================
function triggerJump() {
  if (gameState !== 'PLAYING') return;
  if (isJumping) return;

  isJumping = true;
  antonio.classList.add('jump');
  playJumpSound();

  // Duração da animação é 520ms
  setTimeout(() => {
    antonio.classList.remove('jump');
    isJumping = false;
  }, 520);
}

// Controles de teclado e toque
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    // Evita rolagem da página com a barra de espaço
    if (document.activeElement !== playerNameInput) {
      e.preventDefault();
      triggerJump();
    }
  }
});

// Toque na tela (celular e tablet)
gameBoard.addEventListener('pointerdown', (e) => {
  // Ignora cliques dentro de inputs ou botões dos modais
  if (e.target.closest('button') || e.target.closest('input')) return;
  if (gameState === 'PLAYING') {
    e.preventDefault();
    triggerJump();
  }
});

// ============================================================
// GERADOR DINÂMICO DE MOEDAS FLUTUANTES (ALTA FREQUÊNCIA E PADRÕES)
// ============================================================
function scheduleNextCoin() {
  if (gameState !== 'PLAYING') return;

  // Spawna com muito mais frequência: a cada 900ms a 1800ms
  const delay = Math.random() * 900 + 900;
  coinSpawnTimeout = setTimeout(() => {
    spawnCoinPattern();
    scheduleNextCoin();
  }, delay);
}

function spawnSingleCoin(offsetX = 0, customHeight = null) {
  if (gameState !== 'PLAYING') return;

  const boardWidth = gameBoard.offsetWidth;
  const isMobile = window.innerWidth <= 768;

  const coin = document.createElement('img');
  coin.src = 'images/coin.png';
  coin.className = 'coin-item';
  coin.alt = 'Moeda';

  let bottomOffset;
  if (customHeight !== null) {
    bottomOffset = isMobile ? Math.max(45, customHeight - 25) : customHeight;
  } else {
    // Varia entre baixo, médio e alto
    const heights = isMobile ? [55, 95, 135] : [70, 115, 160];
    bottomOffset = heights[Math.floor(Math.random() * heights.length)];
  }

  coin.style.bottom = `${bottomOffset}px`;
  const initialX = boardWidth + 20 + offsetX;
  coin.style.left = `${initialX}px`;

  coinsContainer.appendChild(coin);

  const baseSpeed = isMobile ? 3.0 : 3.5; // segundos base para cruzar a tela
  const currentSpeedRate = Math.min(1.0 + (secondsElapsed * 0.025), 2.4);
  const speed = baseSpeed / currentSpeedRate;
  const startTime = performance.now();
  const startX = initialX;
  const targetX = -60;

  const coinObj = {
    element: coin,
    collected: false,
    update: (now) => {
      if (coinObj.collected) return true;
      const elapsed = (now - startTime) / 1000;
      const progress = elapsed / speed;
      const currentX = startX - (startX - targetX) * progress;

      coin.style.left = `${currentX}px`;

      // Se saiu da tela, remove
      if (currentX <= targetX) {
        if (coin.parentNode) coin.parentNode.removeChild(coin);
        return false;
      }
      return true;
    }
  };

  activeCoins.push(coinObj);
}

function spawnCoinPattern() {
  if (gameState !== 'PLAYING') return;
  const rand = Math.random();

  if (rand < 0.35) {
    // 1 moeda individual
    spawnSingleCoin(0);
  } else if (rand < 0.65) {
    // 2 moedas em sequência
    spawnSingleCoin(0, 105);
    spawnSingleCoin(55, 105);
  } else if (rand < 0.85) {
    // 3 moedas em arco de pulo (curva do salto)
    spawnSingleCoin(0, 75);
    spawnSingleCoin(50, 150);
    spawnSingleCoin(100, 75);
  } else {
    // Trilha de 3 moedas altas no ar
    spawnSingleCoin(0, 135);
    spawnSingleCoin(48, 135);
    spawnSingleCoin(96, 135);
  }
}

function showFloatingScore(x, y, text) {
  const popup = document.createElement('div');
  popup.className = 'floating-score';
  popup.textContent = text;
  popup.style.left = `${x}px`;
  popup.style.bottom = `${y}px`;
  floatingScores.appendChild(popup);

  setTimeout(() => {
    if (popup.parentNode) popup.parentNode.removeChild(popup);
  }, 750);
}

// ============================================================
// LOOP PRINCIPAL DE FÍSICA E COLISÕES
// ============================================================
function startGameLoops() {
  const nowStart = performance.now();

  gameLoopInterval = setInterval(() => {
    if (gameState !== 'PLAYING') return;

    const boardRect = gameBoard.getBoundingClientRect();
    const antonioRect = antonio.getBoundingClientRect();
    const dogRect = dog.getBoundingClientRect();

    // 1. Verificação de Colisão com a Pretinha (Dog)
    // Usamos caixas de colisão ajustadas para ser justo e responsivo
    const padA = 12; // padding horizontal do Antonio
    const padD = 10; // padding horizontal do cachorro
    const aLeft = antonioRect.left + padA;
    const aRight = antonioRect.right - padA;
    const aBottom = antonioRect.bottom;
    const aTop = antonioRect.top + 8;

    const dLeft = dogRect.left + padD;
    const dRight = dogRect.right - padD;
    const dTop = dogRect.top + 8;
    const dBottom = dogRect.bottom;

    const isCollidingWithDog = (
      aRight > dLeft &&
      aLeft < dRight &&
      aBottom > dTop &&
      aTop < dBottom
    );

    if (isCollidingWithDog) {
      handleGameOver();
      return;
    }

    // 2. Atualização e Coleta de Moedas
    const now = performance.now();
    activeCoins = activeCoins.filter((coinObj) => {
      const stillActive = coinObj.update(now);
      if (!stillActive || coinObj.collected) return false;

      const coinRect = coinObj.element.getBoundingClientRect();
      // Checa colisão com o Antonio com margem amigável
      const touchesCoin = (
        antonioRect.right > coinRect.left - 10 &&
        antonioRect.left < coinRect.right + 10 &&
        antonioRect.bottom > coinRect.top - 10 &&
        antonioRect.top < coinRect.bottom + 10
      );

      if (touchesCoin) {
        coinObj.collected = true;
        coinsCount++;
        hudCoinsValue.textContent = coinsCount < 10 ? `0${coinsCount}` : coinsCount;
        playCoinSound();

        // Animação de coleta
        coinObj.element.classList.add('collected');
        setTimeout(() => {
          if (coinObj.element.parentNode) {
            coinObj.element.parentNode.removeChild(coinObj.element);
          }
        }, 320);

        // Pontos flutuantes
        const relX = coinRect.left - boardRect.left;
        const relY = boardRect.bottom - coinRect.bottom;
        showFloatingScore(relX, relY + 20, '+2');
        return false;
      }

      return true;
    });

  }, 1000 / 60); // 60 FPS

  // 3. Cronômetro de tempo e aceleração progressiva
  timerInterval = setInterval(() => {
    if (gameState !== 'PLAYING') return;
    secondsElapsed++;
    hudTimerValue.textContent = secondsElapsed < 10 ? `0${secondsElapsed}` : secondsElapsed;

    // Quanto mais tempo sobreviver, mais rápido o cenário, o cachorro e as moedas se movem!
    updateGameSpeed();
  }, 1000);
}

// Aumenta a velocidade do jogo progressivamente
function updateGameSpeed() {
  const speedRate = Math.min(1.0 + (secondsElapsed * 0.025), 2.4);

  try {
    const sceneryAnims = scenery.getAnimations();
    sceneryAnims.forEach(anim => { anim.playbackRate = speedRate; });

    const dogAnims = dog.getAnimations();
    dogAnims.forEach(anim => { anim.playbackRate = speedRate; });

    const cloudsAnims = clouds.getAnimations();
    cloudsAnims.forEach(anim => { anim.playbackRate = Math.min(1.0 + (secondsElapsed * 0.012), 1.8); });
  } catch (e) {
    // Fallback
    const newSceneryDuration = Math.max(6.5, 16 - (secondsElapsed * 0.25));
    scenery.style.animationDuration = `${newSceneryDuration}s`;
    const newDogDuration = Math.max(1.6, 3.6 - (secondsElapsed * 0.06));
    dog.style.animationDuration = `${newDogDuration}s`;
  }
}

// ============================================================
// GAME OVER & TRANSIÇÕES
// ============================================================
function handleGameOver() {
  gameState = 'GAME_OVER';

  // Para loops
  clearInterval(gameLoopInterval);
  clearInterval(timerInterval);
  clearTimeout(coinSpawnTimeout);

  // Pausa animações dos elementos
  scenery.classList.add('paused');
  clouds.classList.add('paused');

  // SOME COM O CACHORRO COMPLETAMENTE NO GAME OVER
  dog.style.animation = 'none';
  dog.classList.add('hide');
  dog.style.display = 'none';

  // DEIXA SÓ O SPRITE DE PERDER DO ANTONIO
  const antonioBottom = +window.getComputedStyle(antonio).bottom.replace('px', '');
  antonio.style.animation = 'none';
  antonio.style.bottom = `${antonioBottom}px`;
  antonio.src = './images/end.png';
  antonio.style.width = '88px';
  antonio.style.marginLeft = '40px';

  playGameOverSound();

  // Calcula pontuação final conforme regra do Figma:
  // Pontuação = (Moedas * 2) + Tempo
  const finalScore = (coinsCount * 2) + secondsElapsed;

  // Salva no Ranking
  saveScoreToRanking(playerName, coinsCount, secondsElapsed, finalScore);

  // Atualiza modal de Game Over
  statsCoins.textContent = `${coinsCount}`;
  statsTime.textContent = `${secondsElapsed}s`;
  statsScore.textContent = `${finalScore} pts`;

  // Exibe modal de Game Over com leve delay dramático
  setTimeout(() => {
    screenMask.classList.remove('hide');
    gameOverModal.classList.remove('hide');
    mobileTouchHint.classList.add('hide');
  }, 600);
}

// ============================================================
// GERENCIADOR DE RANKING (LOCALSTORAGE)
// ============================================================
const DEFAULT_RANKING = [
  { name: 'Antonio', coins: 5, time: 20, score: 30 },
  { name: 'Pretinha', coins: 4, time: 15, score: 23 },
  { name: 'Junior', coins: 3, time: 12, score: 18 },
  { name: 'Runner', coins: 2, time: 10, score: 14 }
];

function getRanking() {
  try {
    const data = localStorage.getItem('antonio_run_ranking');
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {}
  return [...DEFAULT_RANKING];
}

function saveScoreToRanking(name, coins, time, score) {
  const ranking = getRanking();
  ranking.push({
    name: name.trim() || 'Antonio',
    coins: coins,
    time: time,
    score: score
  });

  // Ordena por pontuação decrescente
  ranking.sort((a, b) => b.score - a.score);

  // Mantém os 10 melhores
  const top10 = ranking.slice(0, 10);
  try {
    localStorage.setItem('antonio_run_ranking', JSON.stringify(top10));
  } catch (e) {}
}

function renderRankingTable() {
  const ranking = getRanking();
  rankingTableBody.innerHTML = '';

  ranking.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    tr.className = `rank-row rank-${idx + 1}`;

    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`;

    tr.innerHTML = `
      <td class="rank-pos">${medal}</td>
      <td class="rank-name">${entry.name}</td>
      <td>${entry.coins}</td>
      <td>${entry.time}s</td>
      <td class="rank-score">${entry.score}</td>
    `;
    rankingTableBody.appendChild(tr);
  });
}

// ============================================================
// INÍCIO E REINICIALIZAÇÃO DA PARTIDA
// ============================================================
function startGame() {
  playClickSound();
  initAudio();

  // Salva nome digitado
  const inputVal = playerNameInput.value.trim();
  playerName = inputVal ? inputVal : 'Antonio';
  hudPlayerName.textContent = playerName;

  // Esconde modais
  menuModal.classList.add('hide');
  gameOverModal.classList.add('hide');
  rankingModal.classList.add('hide');
  screenMask.classList.add('hide');

  // Mostra HUD
  gameHud.classList.remove('hide');
  if (window.innerWidth <= 768) {
    mobileTouchHint.classList.remove('hide');
  }

  // Reseta variáveis
  secondsElapsed = 0;
  coinsCount = 0;
  isJumping = false;
  hudTimerValue.textContent = '00';
  hudCoinsValue.textContent = '00';

  // Limpa moedas antigas
  coinsContainer.innerHTML = '';
  activeCoins = [];

  // Restaura elementos visuais do Antonio
  antonio.src = 'images/antonio.gif';
  antonio.style.width = '';
  antonio.style.bottom = '';
  antonio.style.marginLeft = '';
  antonio.style.animation = '';
  antonio.classList.remove('jump');

  // Restaura e reexibe a Pretinha (cachorrinho)
  dog.classList.remove('hide');
  dog.style.display = '';
  dog.style.animation = '';
  dog.style.left = '';
  dog.classList.remove('running');
  dog.classList.remove('paused');
  void dog.offsetWidth;
  dog.classList.add('running');

  // Reseta a velocidade das animações para a velocidade normal inicial
  try {
    scenery.getAnimations().forEach(a => { a.playbackRate = 1.0; });
    dog.getAnimations().forEach(a => { a.playbackRate = 1.0; });
    clouds.getAnimations().forEach(a => { a.playbackRate = 1.0; });
  } catch (e) {}

  scenery.classList.remove('paused');
  clouds.classList.remove('paused');

  // Define estado e inicia loops
  gameState = 'PLAYING';
  startGameLoops();
  scheduleNextCoin();
}

function showRankingScreen() {
  playClickSound();
  gameState = 'RANKING';
  gameOverModal.classList.add('hide');
  menuModal.classList.add('hide');
  renderRankingTable();
  rankingModal.classList.remove('hide');
  screenMask.classList.remove('hide');
}

// ============================================================
// EVENT LISTENERS DOS BOTÕES
// ============================================================
startGameBtn.addEventListener('click', startGame);
restartGameBtn.addEventListener('click', startGame);
rankingRestartBtn.addEventListener('click', startGame);
showRankingBtn.addEventListener('click', showRankingScreen);

// Focar input ao carregar
window.addEventListener('DOMContentLoaded', () => {
  renderRankingTable();
});
