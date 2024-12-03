export class UIManager {
    constructor(gameCore, cardSystem) {
        this.gameCore = gameCore;
        this.cardSystem = cardSystem;
        this.timer = null;
    }

    updateUI() {
        this.updateHPDisplay();
        this.updateDeckCount();
        this.updateHandDisplay();
        this.updateGodHandDisplay();
        this.updateTurnIndicator();
    }

    updateHPDisplay() {
        const playerState = this.gameCore.gameState.players[this.gameCore.playerId];
        const opponentState = this.gameCore.gameState.players[this.gameCore.opponentId];

        document.getElementById('player-hp').textContent = `${playerState.hp}/10`;
        document.getElementById('opponent-hp').textContent = `${opponentState.hp}/10`;
        
        document.getElementById('player-hp-bar').style.width = `${(playerState.hp / 10) * 100}%`;
        document.getElementById('opponent-hp-bar').style.width = `${(opponentState.hp / 10) * 100}%`;
    }

    updateDeckCount() {
        const playerState = this.gameCore.gameState.players[this.gameCore.playerId];
        const opponentState = this.gameCore.gameState.players[this.gameCore.opponentId];

        document.getElementById('player-deck-count').textContent = playerState.deck.length;
        document.getElementById('opponent-deck-count').textContent = opponentState.deck.length;
    }

    updateHandDisplay() {
        const playerHandElement = document.getElementById('player-hand');
        const opponentHandElement = document.getElementById('opponent-hand');
        
        this.updatePlayerHand(playerHandElement);
        this.updateOpponentHand(opponentHandElement);
    }

    updatePlayerHand(element) {
        element.innerHTML = '';
        const playerState = this.gameCore.gameState.players[this.gameCore.playerId];
        
        playerState.hand.forEach(card => {
            const cardElement = this.createCardElement(card, true);
            cardElement.draggable = true;
            cardElement.dataset.cardId = card.id;
            
            this.addCardEventListeners(cardElement, card);
            element.appendChild(cardElement);
        });
    }

    updateOpponentHand(element) {
        element.innerHTML = '';
        const opponentState = this.gameCore.gameState.players[this.gameCore.opponentId];
        const opponentHandCount = opponentState.hand.length;

        for (let i = 0; i < opponentHandCount; i++) {
            const cardBack = document.createElement('div');
            cardBack.className = 'card opponent-card';
            element.appendChild(cardBack);
        }
    }

    createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.type}`;
        cardElement.draggable = true;
        cardElement.dataset.cardId = card.id;
        
        const cardContent = document.createElement('div');
        cardContent.className = 'card-content';
        
        const cardValue = document.createElement('div');
        cardValue.className = 'card-value';
        cardValue.textContent = card.value || card.effect || '';
        
        const cardType = document.createElement('div');
        cardType.className = 'card-type';
        cardType.textContent = card.name || this.cardSystem.getCardTypeText(card.type);
        
        cardContent.appendChild(cardValue);
        cardContent.appendChild(cardType);
        cardElement.appendChild(cardContent);
        
        return cardElement;
    }

    addCardEventListeners(cardElement, card) {
        cardElement.addEventListener('dragstart', (e) => {
            if (!this.gameCore.isPlayerTurn) return;
            e.dataTransfer.setData('text/plain', card.id);
            cardElement.classList.add('dragging');
        });
        
        cardElement.addEventListener('dragend', () => {
            cardElement.classList.remove('dragging');
        });

        cardElement.addEventListener('mouseenter', () => {
            this.showCardDetails(card);
        });

        cardElement.addEventListener('mouseleave', () => {
            this.hideCardDetails();
        });
    }

    updateGodHandDisplay() {
        const playerState = this.gameCore.gameState.players[this.gameCore.playerId];
        document.querySelector('.god-hand-remaining').textContent = 
            `残り使用回数: ${playerState.godHandRemaining}`;
    }

    updateTurnIndicator() {
        const turnIndicator = document.getElementById('turn-indicator');
        if (turnIndicator) {
            turnIndicator.textContent = this.gameCore.isPlayerTurn ? 'あなたのターン' : '相手のターン';
            turnIndicator.className = `turn-indicator ${this.gameCore.isPlayerTurn ? 'your-turn' : 'opponent-turn'}`;
        }
    }

    showCardDetails(card) {
        const popup = document.querySelector('.card-popup');
        if (!popup || !card) return;

        let details = '';
        switch(card.type) {
            case 'attack':
                details = `攻撃力: ${card.value}`;
                break;
            case 'heal':
                details = `回復量: ${card.value}`;
                break;
            case 'effect':
                details = this.cardSystem.getEffectDescription(card.effect);
                break;
            case 'god':
                details = this.cardSystem.getGodCardDescription(card.effect);
                break;
            default:
                details = 'カードの詳細情報がありません';
        }
        
        popup.textContent = details;
        popup.style.display = 'block';
        document.addEventListener('mousemove', this.updatePopupPosition);
    }

    hideCardDetails() {
        const popup = document.querySelector('.card-popup');
        if (!popup) return;

        popup.style.display = 'none';
        document.removeEventListener('mousemove', this.updatePopupPosition);
    }

    updatePopupPosition(e) {
        const popup = document.querySelector('.card-popup');
        if (!popup) return;

        const padding = 10;
        popup.style.left = `${e.pageX + padding}px`;
        popup.style.top = `${e.pageY + padding}px`;
    }

    initializeTimer() {
        const timerElement = document.querySelector('.timer');
        if (!timerElement) return;

        if (this.timer) {
            clearInterval(this.timer);
        }

        if (this.gameCore.isPlayerTurn) {
            let timeLeft = 60;
            timerElement.textContent = timeLeft;

            this.timer = setInterval(() => {
                timeLeft--;
                timerElement.textContent = timeLeft;

                if (timeLeft <= 0) {
                    clearInterval(this.timer);
                    this.handleTimeUp();
                }
            }, 1000);
        }
    }

    showResultModal(result) {
        const resultModal = document.getElementById('result-modal');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        
        if (result.type === 'defeat') {
            resultTitle.textContent = '敗北...';
            resultMessage.textContent = '相手の勝利です';
        } else if (result.type === 'victory') {
            resultTitle.textContent = '勝利！';
            resultMessage.textContent = 'あなたの勝利です！';
        } else if (result.type === 'deckout') {
            resultTitle.textContent = 'デッキ切れ';
            resultMessage.textContent = result.winner === this.gameCore.playerId ? '勝利！' : '敗北...';
        }
        
        resultModal.style.display = 'flex';
    }

    cleanup() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
} 