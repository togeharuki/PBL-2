class Card {
    constructor(power, isHeal = false) {
        this.power = power;
        this.isHeal = isHeal;
    }

    createCardElement(player, onClick) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${this.isHeal ? 'heal-card' : ''}`;
        
        const powerElement = document.createElement('div');
        powerElement.className = 'card-power';
        powerElement.textContent = `${this.isHeal ? '回復\n' : ''}${this.power}`;
        
        cardElement.appendChild(powerElement);
        cardElement.onclick = () => onClick(this, cardElement, player);
        cardElement.__data = this;
        
        return cardElement;
    }
}

class Player {
    constructor(id) {
        this.id = id;
        this.hp = 10000;
        this.deck = [];
        this.hand = [];
        this.graveyard = [];
        this.hasCreatedCard = false;
        this.hasSelectedCard = false;
    }

    initializeDeck() {
        for (let i = 0; i < 30; i++) {
            this.deck.push(new Card(
                Math.floor(Math.random() * 3000) + 1000,
                Math.random() < 0.2
            ));
        }
    }

    drawCard() {
        if (this.deck.length > 0) {
            const card = this.deck.pop();
            this.hand.push(card);
            this.updateUI();
        }
    }

    updateUI() {
        document.getElementById(`player${this.id}-hp`).textContent = this.hp;
        document.getElementById(`player${this.id}-deck-count`).textContent = this.deck.length;

        const handElement = document.getElementById(`player${this.id}-hand`);
        handElement.innerHTML = '';
        this.hand.forEach(card => {
            handElement.appendChild(card.createCardElement(this.id, playCard));
        });
    }
}

class Game {
    constructor() {
        this.player1 = new Player(1);
        this.player2 = new Player(2);
        this.timeRemaining = 60;
        this.timer = null;
    }

    initialize() {
        this.player1.initializeDeck();
        this.player2.initializeDeck();
        this.drawInitialHands();
        this.initializeEventListeners();
        this.startRound();
    }

    drawInitialHands() {
        for (let i = 0; i < 5; i++) {
            this.player1.drawCard();
            this.player2.drawCard();
        }
    }

    initializeEventListeners() {
        document.getElementById('player1-create-card').onclick = () => this.createCustomCard(1);
        document.getElementById('player2-create-card').onclick = () => this.createCustomCard(2);
    }

    createCustomCard(playerId) {
        const player = playerId === 1 ? this.player1 : this.player2;
        if (!player.hasCreatedCard) {
            const power = Math.floor(Math.random() * 5000) + 1000;
            const isHeal = Math.random() < 0.3;
            const card = new Card(power, isHeal);
            player.hand.push(card);
            player.hasCreatedCard = true;
            player.updateUI();
            document.getElementById(`player${playerId}-create-card`).disabled = true;
        }
    }

    startRound() {
        this.timeRemaining = 60;
        this.player1.hasSelectedCard = false;
        this.player2.hasSelectedCard = false;
        this.updateTimer();

        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimer();

            if (this.timeRemaining <= 0) {
                clearInterval(this.timer);
                if (!this.player1.hasSelectedCard) this.selectRandomCard(1);
                if (!this.player2.hasSelectedCard) this.selectRandomCard(2);
            }
        }, 1000);
    }

    updateTimer() {
        const timerElement = document.getElementById('timer');
        timerElement.textContent = this.timeRemaining;
        if (this.timeRemaining <= 10) {
            timerElement.style.color = '#ff4444';
        } else {
            timerElement.style.color = '#4a90e2';
        }
    }

    selectRandomCard(playerId) {
        const player = playerId === 1 ? this.player1 : this.player2;
        if (player.hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * player.hand.length);
            const card = player.hand[randomIndex];
            const handElement = document.getElementById(`player${playerId}-hand`);
            const cardElement = handElement.children[randomIndex];
            playCard(card, cardElement, playerId);
        }
    }

    resolveBattle() {
        clearInterval(this.timer);
        const battleZone1 = document.getElementById('player1-battle-zone');
        const battleZone2 = document.getElementById('player2-battle-zone');
        const card1 = battleZone1.firstChild?.__data;
        const card2 = battleZone2.firstChild?.__data;

        if (card1 && card2) {
            let message = '';

            if (card1.isHeal && card2.isHeal) {
                this.player1.hp += card1.power;
                this.player2.hp += card2.power;
                message = `両プレイヤーが回復!\nP1: +${card1.power} HP\nP2: +${card2.power} HP`;
            } else if (card1.isHeal) {
                this.player1.hp += card1.power;
                this.player1.hp -= card2.power;
                message = `P1が${card1.power}回復し、${card2.power}のダメージを受けた！`;
            } else if (card2.isHeal) {
                this.player2.hp += card2.power;
                this.player2.hp -= card1.power;
                message = `P2が${card2.power}回復し、${card1.power}のダメージを受けた！`;
            } else {
                const damage = Math.abs(card1.power - card2.power);
                if (card1.power > card2.power) {
                    this.player2.hp -= damage;
                    message = `P1の勝利！P2に${damage}のダメージ！`;
                } else if (card2.power > card1.power) {
                    this.player1.hp -= damage;
                    message = `P2の勝利！P1に${damage}のダメージ！`;
                } else {
                    message = "引き分け！";
                }
            }

            this.showBattleResult(message);
            
            setTimeout(() => {
                this.player1.graveyard.push(card1);
                this.player2.graveyard.push(card2);
                this.player1.updateUI();
                this.player2.updateUI();

                if (this.isGameOver()) {
                    this.endGame();
                } else {
                    battleZone1.innerHTML = '';
                    battleZone2.innerHTML = '';
                    this.player1.drawCard();
                    this.player2.drawCard();
                    this.startRound();
                }
            }, 2000);
        }
    }

    showBattleResult(message) {
        const resultElement = document.getElementById('battle-result');
        resultElement.textContent = message;
        resultElement.style.display = 'block';
        setTimeout(() => {
            resultElement.style.display = 'none';
        }, 2000);
    }

    isGameOver() {
        return this.player1.hp <= 0 || 
               this.player2.hp <= 0 || 
               (this.player1.deck.length === 0 && this.player2.deck.length === 0);
    }

    endGame() {
        clearInterval(this.timer);
        let winner;
        if (this.player1.hp <= 0 && this.player2.hp <= 0) {
            winner = "引き分け";
        } else if (this.player1.hp <= 0) {
            winner = "プレイヤー2";
        } else if (this.player2.hp <= 0) {
            winner = "プレイヤー1";
        } else if (this.player1.hp > this.player2.hp) {
            winner = "プレイヤー1";
        } else if (this.player2.hp > this.player1.hp) {
            winner = "プレイヤー2";
        } else {
            winner = "引き分け";
        }

        const gameOverMessage = `
            ゲーム終了！
            ${winner === "引き分け" ? "引き分け" : `${winner}の勝利！`}
            
            最終結果:
            プレイヤー1 HP: ${this.player1.hp}
            プレイヤー2 HP: ${this.player2.hp}
        `;

        this.showBattleResult(gameOverMessage);
        document.getElementById('player1-create-card').disabled = true;
        document.getElementById('player2-create-card').disabled = true;
    }
}

function playCard(card, cardElement, playerId) {
    const player = playerId === 1 ? game.player1 : game.player2;
    if (!player.hasSelectedCard) {
        const battleZone = document.getElementById(`player${playerId}-battle-zone`);
        battleZone.innerHTML = '';
        const playedCard = card.createCardElement(playerId, () => {});
        
        // エフェクトの適用
        playedCard.classList.add('card-played');
        playedCard.classList.add('card-entrance');
        
        if (card.isHeal) {
            playedCard.classList.add('heal-card-glow');
        } else {
            playedCard.classList.add('card-glow');
        }
        
        battleZone.appendChild(playedCard);
        battleZone.classList.add('battle-zone-activate');
        
        // パーティクルエフェクト
        setTimeout(() => {
            createParticles(playedCard, 20, card.isHeal);
        }, 300);
        
        const handIndex = player.hand.indexOf(card);
        if (handIndex !== -1) {
            player.hand.splice(handIndex, 1);
        }
        player.updateUI();
        
        player.hasSelectedCard = true;

        // サウンドエフェクト
        const playSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodHQql4yLlmAhoZvY2xvCQUEBwcfHRwYDQ0VJy0zRVlSN0koIVpzdWNMNi11dYJ1Y0c3CwQBBRUsO1FVb1c5EhYzFxEOaDkvVk8/HTxK');
        playSound.volume = 0.3;
        playSound.play().catch(() => {});

        if (game.player1.hasSelectedCard && game.player2.hasSelectedCard) {
            setTimeout(() => game.resolveBattle(), 500);
        }
    }
}

function createParticles(element, count, isHeal = false) {
    const rect = element.getBoundingClientRect();
    const particles = [];
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = `particle ${isHeal ? 'particle-heal' : 'particle-attack'}`;
        
        const size = Math.random() * 8 + 4;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        
        particle.style.left = startX + 'px';
        particle.style.top = startY + 'px';
        
        document.body.appendChild(particle);
        particles.push({
            element: particle,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1
        });
    }
    
    let frame = 0;
    const animate = () => {
        frame++;
        let allDead = true;
        
        particles.forEach(p => {
            if (p.life > 0) {
                allDead = false;
                p.life -= 0.02;
                p.element.style.opacity = p.life;
                
                const currentX = parseFloat(p.element.style.left);
                const currentY = parseFloat(p.element.style.top);
                
                p.element.style.left = (currentX + p.vx) + 'px';
                p.element.style.top = (currentY + p.vy) + 'px';
            } else if (p.element.parentNode) {
                p.element.parentNode.removeChild(p.element);
            }
        });
        
        if (!allDead) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
}
        

// ゲームの初期化と開始
const game = new Game();
game.initialize();