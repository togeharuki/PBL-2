export class UIManager {
    constructor(battleManager) {
        this.battleManager = battleManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // カードのドラッグ＆ドロップ
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
        });

        document.querySelectorAll('.battle-zone').forEach(zone => {
            zone.addEventListener('dragover', this.handleDragOver.bind(this));
            zone.addEventListener('drop', this.handleDrop.bind(this));
        });

        // カードホバー
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('mouseenter', this.showCardDetails.bind(this));
            card.addEventListener('mouseleave', this.hideCardDetails.bind(this));
        });

        // 神の一手ボタン
        document.querySelectorAll('.divine-move-btn').forEach(btn => {
            btn.addEventListener('click', this.handleDivineMoveClick.bind(this));
        });
    }

    updateUI() {
        this.updateHands();
        this.updateBattleZones();
        this.updateHP();
        this.updateDeckCounts();
        this.updateTurnInfo();
    }

    updateTimer() {
        const timerElement = document.getElementById('turn-timer');
        timerElement.textContent = this.battleManager.gameState.turnTimeLeft;
        
        if (this.battleManager.gameState.turnTimeLeft <= 10) {
            timerElement.classList.add('warning');
        } else {
            timerElement.classList.remove('warning');
        }
    }

    async showCardDetails(event) {
        const card = event.currentTarget;
        const cardData = this.battleManager.getCardData(card.dataset.cardId);
        
        const popup = document.createElement('div');
        popup.className = 'card-popup';
        popup.innerHTML = this.generateCardDetailsHTML(cardData);
        
        document.body.appendChild(popup);
        this.positionPopup(popup, event);
    }

    hideCardDetails() {
        const popup = document.querySelector('.card-popup');
        if (popup) {
            popup.remove();
        }
    }

    async handleDivineMoveClick(event) {
        const moveType = event.currentTarget.dataset.moveType;
        const confirmed = await this.showConfirmationModal({
            title: '神の一手',
            message: 'この効果を使用しますか？',
            effect: this.getDivineMoveDescription(moveType)
        });

        if (confirmed) {
            await this.battleManager.cardEffects.executeEffect(moveType);
        }
    }
    updateHands() {
        const playerHand = document.getElementById('player1-hand');
        const opponentHand = document.getElementById('player2-hand');
        
        // プレイヤーの手札を更新
        playerHand.innerHTML = '';
        this.battleManager.gameState.players[this.battleManager.playerId].hand.forEach(card => {
            const cardElement = this.createCardElement(card, true);
            playerHand.appendChild(cardElement);
        });
        
        // 相手の手札を更新（裏向きで表示）
        opponentHand.innerHTML = '';
        const opponent = this.getOpponent();
        for (let i = 0; i < opponent.hand.length; i++) {
            const cardBack = this.createCardBack();
            opponentHand.appendChild(cardBack);
        }
    }

    updateBattleZones() {
        const player1Zone = document.getElementById('player1-battle-zone');
        const player2Zone = document.getElementById('player2-battle-zone');
        
        player1Zone.innerHTML = '';
        player2Zone.innerHTML = '';

        // プレイヤーのバトルゾーンを更新
        const playerCard = this.battleManager.gameState.players[this.battleManager.playerId].battleZone;
        if (playerCard) {
            player1Zone.appendChild(this.createCardElement(playerCard, true));
        }

        // 相手のバトルゾーンを更新
        const opponentCard = this.getOpponent().battleZone;
        if (opponentCard) {
            player2Zone.appendChild(this.createCardElement(opponentCard, true));
        }
    }

    updateHP() {
        const player1HP = document.getElementById('player1-hp');
        const player2HP = document.getElementById('player2-hp');
        const player1HPValue = document.getElementById('player1-hp-value');
        const player2HPValue = document.getElementById('player2-hp-value');

        const playerHP = this.battleManager.gameState.players[this.battleManager.playerId].hp;
        const opponentHP = this.getOpponent().hp;

        // HPバーの更新
        player1HP.style.width = `${playerHP * 10}%`;
        player2HP.style.width = `${opponentHP * 10}%`;

        // HP値の更新
        player1HPValue.textContent = playerHP;
        player2HPValue.textContent = opponentHP;
    }

    updateDeckCounts() {
        const player1Count = document.getElementById('player1-deck-count');
        const player2Count = document.getElementById('player2-deck-count');

        player1Count.textContent = this.battleManager.gameState.players[this.battleManager.playerId].deck.length;
        player2Count.textContent = this.getOpponent().deck.length;
    }

    updateTurnInfo() {
        const turnNumber = document.getElementById('turn-number');
        turnNumber.textContent = this.battleManager.gameState.turnNumber;
    }

    createCardElement(card, isVisible) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.type}`;
        cardElement.dataset.cardId = card.id;
        
        if (isVisible) {
            cardElement.innerHTML = `
                <div class="card-inner">
                    <div class="card-value">${card.value || ''}</div>
                    <div class="card-type">${this.getCardTypeLabel(card.type)}</div>
                    <div class="card-name">${card.name}</div>
                </div>
            `;
        } else {
            cardElement.classList.add('card-back');
        }

        if (this.isCardPlayable(card)) {
            cardElement.draggable = true;
            cardElement.classList.add('playable');
        }

        return cardElement;
    }

    createCardBack() {
        const cardBack = document.createElement('div');
        cardBack.className = 'card card-back';
        return cardBack;
    }

    async showConfirmationModal(options) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>${options.title}</h2>
                    <p>${options.message}</p>
                    ${options.effect ? `<div class="effect-description">${options.effect}</div>` : ''}
                    ${options.warning ? `<p class="warning">${options.warning}</p>` : ''}
                    <div class="modal-buttons">
                        <button class="confirm-btn">はい</button>
                        <button class="cancel-btn">いいえ</button>
                    </div>
                </div>
            `;

            modal.querySelector('.confirm-btn').onclick = () => {
                modal.remove();
                resolve(true);
            };

            modal.querySelector('.cancel-btn').onclick = () => {
                modal.remove();
                resolve(false);
            };

            document.body.appendChild(modal);
        });
    }

    async showOpponentCards(cards) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>相手の手札</h2>
                    <div class="opponent-cards">
                        ${cards.map(card => `
                            <div class="card ${card.type}">
                                <div class="card-inner">
                                    <div class="card-value">${card.value || ''}</div>
                                    <div class="card-type">${this.getCardTypeLabel(card.type)}</div>
                                    <div class="card-name">${card.name}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="close-btn">閉じる</button>
                </div>
            `;

            modal.querySelector('.close-btn').onclick = () => {
                modal.remove();
                resolve();
            };

            document.body.appendChild(modal);
        });
    }

    handleDragStart(event) {
        const card = event.currentTarget;
        event.dataTransfer.setData('text/plain', card.dataset.cardId);
        card.classList.add('dragging');
    }

    handleDragEnd(event) {
        event.currentTarget.classList.remove('dragging');
    }

    handleDragOver(event) {
        event.preventDefault();
        const zone = event.currentTarget;
        if (this.isValidDropZone(zone)) {
            zone.classList.add('drag-over');
        }
    }

    async handleDrop(event) {
        event.preventDefault();
        const zone = event.currentTarget;
        zone.classList.remove('drag-over');

        const cardId = event.dataTransfer.getData('text/plain');
        const card = this.battleManager.getCardById(cardId);

        if (card && this.isValidDropZone(zone)) {
            try {
                await this.battleManager.playCard(card);
                this.updateUI();
            } catch (error) {
                this.showErrorMessage('このカードは現在プレイできません');
            }
        }
    }

    showErrorMessage(message) {
        const errorToast = document.createElement('div');
        errorToast.className = 'error-toast';
        errorToast.textContent = message;

        document.body.appendChild(errorToast);
        setTimeout(() => {
            errorToast.classList.add('fade-out');
            setTimeout(() => errorToast.remove(), 300);
        }, 2000);
    }

    async showBattleAnimation(attackerCard, defenderCard) {
        return new Promise(resolve => {
            const animation = document.createElement('div');
            animation.className = 'battle-animation';
            
            // バトルエフェクトのアニメーション
            animation.innerHTML = `
                <div class="battle-effect">
                    <div class="attacker">${attackerCard.value}</div>
                    <div class="battle-vs">VS</div>
                    <div class="defender">${defenderCard.value}</div>
                </div>
            `;

            document.body.appendChild(animation);

            setTimeout(() => {
                animation.remove();
                resolve();
            }, 1500);
        });
    }

    getDivineMoveDescription(moveType) {
        const descriptions = {
            'increaseDamage': '与えるダメージ+5',
            'discardOpponentCard': '相手の手札を1枚選んで捨てさせる',
            'temporaryPowerUp': '2ターンの間与えるダメージ+2',
            'nullifyDamage': '受けるダメージを無効化',
            'decreaseOpponentPower': '相手のカードの数値-3',
            'recoverFromGraveyard': '墓地からカードを1枚回収'
        };
        return descriptions[moveType] || '';
    }

    getCardTypeLabel(type) {
        const types = {
            'attack': '攻撃',
            'heal': '回復',
            'effect': '効果'
        };
        return types[type] || '';
    }

    isCardPlayable(card) {
        const gameState = this.battleManager.gameState;
        const currentPlayer = gameState.players[this.battleManager.playerId];

        // バトルカード（攻撃・回復）の場合
        if (card.type === 'attack' || card.type === 'heal') {
            return !currentPlayer.battleZone && gameState.currentPhase === 'battle';
        }

        // 効果カードの場合
        if (card.type === 'effect') {
            return !gameState.effectCardUsed && !currentPlayer.battleZone;
        }

        return false;
    }

    isValidDropZone(zone) {
        return zone.classList.contains('battle-zone') && 
               !zone.querySelector('.card') &&
               this.battleManager.isCurrentPlayer();
    }

    getOpponent() {
        const players = this.battleManager.gameState.players;
        return Object.values(players).find(p => p.id !== this.battleManager.playerId);
    }
}

export default UIManager;