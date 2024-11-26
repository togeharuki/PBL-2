// Firebase設定とSDKのインポート
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    onSnapshot,
    query,
    limit,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class Game {
    constructor() {
        // Firebase初期化
        const firebaseConfig = {
            apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
            authDomain: "deck-dreamers.firebaseapp.com",
            projectId: "deck-dreamers",
            storageBucket: "deck-dreamers.appspot.com",
            messagingSenderId: "165933225805",
            appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
        };

        const app = initializeApp(firebaseConfig);
        this.db = getFirestore(app);
        
        // URLパラメータから情報を取得
        const urlParams = new URLSearchParams(window.location.search);
        this.gameId = urlParams.get('gameId');
        this.playerId = urlParams.get('playerId') || localStorage.getItem('playerId');

        // ゲーム状態の初期化
        this.gameState = null;
        this.playerNumber = null;
        this.opponentId = null;
        this.playerHp = 10;
        this.opponentHp = 10;
        this.timeLeft = 60;
        this.isPlayerTurn = false;
        this.effectCardUsed = false;
        this.godHandsRemaining = 2;
        this.playerDeck = [];
        this.playerHand = [];
        this.unsubscribe = null;
        this.timer = null;

        if (!this.gameId || !this.playerId) {
            alert('ゲーム情報が不正です');
            window.location.href = '../Room/room.html';
            return;
        }

        // ゲームの初期化
        this.initializeGame();
        this.initializeEventListeners();
    }

    async initializeGame() {
        try {
            const gameRef = doc(this.db, 'games', this.gameId);
            const gameDoc = await getDoc(gameRef);

            if (!gameDoc.exists()) {
                throw new Error('ゲームが見つかりません');
            }

            const gameData = gameDoc.data();
            this.gameState = gameData;

            // プレイヤー情報の設定
            const playerIds = Object.keys(gameData.players);
            if (!playerIds.includes(this.playerId)) {
                throw new Error('プレイヤー情報が不正です');
            }

            this.opponentId = playerIds.find(id => id !== this.playerId);
            
            // デッキの初期化
            if (!gameData.players[this.playerId].deck.length) {
                const initialDeck = await this.getRandomCardsFromDatabase(30);
                const initialHand = initialDeck.slice(0, 5);
                const remainingDeck = initialDeck.slice(5);

                await updateDoc(gameRef, {
                    [`players.${this.playerId}.deck`]: remainingDeck,
                    [`players.${this.playerId}.hand`]: initialHand
                });

                this.playerDeck = remainingDeck;
                this.playerHand = initialHand;
            } else {
                this.playerDeck = gameData.players[this.playerId].deck;
                this.playerHand = gameData.players[this.playerId].hand;
            }

            // リアルタイム更新の監視を開始
            this.setupRealtimeListeners();
            this.updateUI();
            this.startTimer();

        } catch (error) {
            console.error('ゲーム初期化エラー:', error);
            alert('ゲームの初期化に失敗しました');
            window.location.href = '../Room/room.html';
        }
    }

    async getRandomCardsFromDatabase(count) {
        const deckRef = collection(this.db, 'deck');
        const q = query(deckRef, limit(count));
        const querySnapshot = await getDocs(q);
        
        const cards = [];
        querySnapshot.forEach((doc) => {
            const cardData = doc.data();
            cards.push({
                id: doc.id,
                type: cardData.type,
                value: cardData.value,
                effect: cardData.effect,
                name: cardData.name,
                image: cardData.image
            });
        });
        
        return this.shuffleArray(cards);
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    setupRealtimeListeners() {
        const gameRef = doc(this.db, 'games', this.gameId);
        this.unsubscribe = onSnapshot(gameRef, (doc) => {
            if (doc.exists()) {
                this.handleGameStateUpdate(doc.data());
            }
        });
    }

    startTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setInterval(() => {
            if (this.timeLeft > 0 && this.isPlayerTurn) {
                this.timeLeft--;
                document.querySelector('.timer').textContent = this.timeLeft;
                
                if (this.timeLeft <= 0) {
                    this.handleTimeUp();
                }
            }
        }, 1000);
    }

    async handleGameStateUpdate(newState) {
        this.gameState = newState;
        const playerState = newState.players[this.playerId];
        const opponentState = newState.players[this.opponentId];

        // 状態の更新
        this.playerHp = playerState.hp;
        this.opponentHp = opponentState.hp;
        this.isPlayerTurn = newState.currentTurn === this.playerId;
        this.timeLeft = newState.turnTime;
        this.godHandsRemaining = playerState.godHandRemaining;
        this.playerDeck = playerState.deck;
        this.playerHand = playerState.hand;

        // UI更新
        this.updateUI();
        this.updateTurnIndicator();

        // 勝敗判定
        if (this.playerHp <= 0 || this.opponentHp <= 0) {
            this.handleGameEnd();
        }
    }
    initializeEventListeners() {
        // 神の一手カードのイベントリスナー
        document.querySelectorAll('.god-hand').forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
            card.addEventListener('mouseenter', this.showCardDetails.bind(this));
            card.addEventListener('mouseleave', this.hideCardDetails.bind(this));
        });

        // カードスロットのイベントリスナー
        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (this.isPlayerTurn) {
                    e.target.style.borderColor = '#4CAF50';
                }
            });
            slot.addEventListener('dragleave', (e) => {
                e.target.style.borderColor = '#666';
            });
            slot.addEventListener('drop', this.handleDrop.bind(this));
        });

        // プレイヤーの手札エリアの設定
        const playerHand = document.getElementById('player-hand');
        if (playerHand) {
            playerHand.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('card')) {
                    this.handleDragStart(e);
                }
            });
        }
    }

    handleDragStart(e) {
        if (!this.isPlayerTurn) {
            e.preventDefault();
            return;
        }

        const card = e.target.closest('.card');
        if (!card) return;
        
        if (card.classList.contains('god-hand') && this.godHandsRemaining <= 0) {
            e.preventDefault();
            return;
        }

        const cardData = {
            type: card.dataset.type,
            value: card.dataset.value,
            effect: card.dataset.effect,
            id: card.dataset.id
        };

        e.dataTransfer.setData('text/plain', JSON.stringify(cardData));
        card.style.opacity = '0.5';
    }

    handleDragEnd(e) {
        e.target.style.opacity = '1';
    }

    async handleDrop(e) {
        e.preventDefault();
        if (!this.isPlayerTurn) return;

        const slot = e.target.closest('.card-slot');
        if (!slot) return;

        slot.style.borderColor = '#666';

        try {
            const cardData = JSON.parse(e.dataTransfer.getData('text/plain'));
            
            if (cardData.type === 'god') {
                if (this.godHandsRemaining > 0) {
                    await this.playGodCard(cardData);
                }
            } else {
                await this.playNormalCard(cardData, slot);
            }
        } catch (error) {
            console.error('Card drop error:', error);
        }
    }

    async playNormalCard(cardData, slot) {
        const gameRef = doc(this.db, 'games', this.gameId);

        // フィールドにカードを配置
        await updateDoc(gameRef, {
            [`players.${this.playerId}.field`]: cardData
        });

        // 手札からカードを削除
        const newHand = this.playerHand.filter(card => card.id !== cardData.id);
        await updateDoc(gameRef, {
            [`players.${this.playerId}.hand`]: newHand
        });

        // カードの効果を処理
        if (cardData.type === 'attack') {
            await this.processAttack(cardData.value);
        } else if (cardData.type === 'heal') {
            await this.processHeal(cardData.value);
        } else if (cardData.type === 'effect') {
            await this.processEffect(cardData.effect);
        }

        await this.endTurn();
    }

    async processAttack(damage) {
        const gameRef = doc(this.db, 'games', this.gameId);
        const opponentField = this.gameState.players[this.opponentId].field;
        
        if (opponentField && opponentField.type === 'attack') {
            // 攻撃力を比較して処理
            if (damage > opponentField.value) {
                const actualDamage = damage - opponentField.value;
                await this.updateOpponentHP(-actualDamage);
            }
        } else {
            // 直接ダメージ
            await this.updateOpponentHP(-damage);
        }
    }

    async processHeal(amount) {
        const newHp = Math.min(this.playerHp + amount, 10);
        await this.updatePlayerHP(newHp);
    }

    async processEffect(effect) {
        switch (effect) {
            case 'draw':
                await this.drawCard();
                break;
            case 'view_hand':
                await this.viewOpponentHand();
                break;
        }
    }

    async playGodCard(cardData) {
        const gameRef = doc(this.db, 'games', this.gameId);
        await updateDoc(gameRef, {
            [`players.${this.playerId}.godHandRemaining`]: this.godHandsRemaining - 1
        });

        switch (cardData.effect) {
            case 'damage_up':
                await this.updateOpponentHP(-5);
                break;
            case 'discard':
                await this.discardOpponentCard();
                break;
        }
    }

    async drawCard() {
        if (this.playerDeck.length === 0) return;

        const drawnCard = this.playerDeck[0];
        const newDeck = this.playerDeck.slice(1);
        const newHand = [...this.playerHand, drawnCard];

        const gameRef = doc(this.db, 'games', this.gameId);
        await updateDoc(gameRef, {
            [`players.${this.playerId}.deck`]: newDeck,
            [`players.${this.playerId}.hand`]: newHand
        });
    }

    async updatePlayerHP(newValue) {
        const gameRef = doc(this.db, 'games', this.gameId);
        await updateDoc(gameRef, {
            [`players.${this.playerId}.hp`]: newValue
        });
    }

    async updateOpponentHP(changeAmount) {
        const gameRef = doc(this.db, 'games', this.gameId);
        const newHp = Math.max(0, Math.min(10, this.opponentHp + changeAmount));
        await updateDoc(gameRef, {
            [`players.${this.opponentId}.hp`]: newHp
        });
    }

    async endTurn() {
        if (!this.isPlayerTurn) return;

        const gameRef = doc(this.db, 'games', this.gameId);
        await updateDoc(gameRef, {
            currentTurn: this.opponentId,
            turnTime: 60
        });
    }

    updateUI() {
        this.updateHP();
        this.updateHand();
        this.updateField();
        this.updateDeckCount();
        this.updateGodHandDisplay();
    }

    updateHP() {
        document.querySelector('#player-hp').textContent = `${this.playerHp}/10`;
        document.querySelector('#player-hp-bar').style.width = `${this.playerHp * 10}%`;
        document.querySelector('#opponent-hp').textContent = `${this.opponentHp}/10`;
        document.querySelector('#opponent-hp-bar').style.width = `${this.opponentHp * 10}%`;
    }

    updateHand() {
        const handContainer = document.querySelector('#player-hand');
        handContainer.innerHTML = '';
        
        this.playerHand.forEach(card => {
            const cardElement = this.createCardElement(card);
            handContainer.appendChild(cardElement);
        });

        // 相手の手札（裏向き）を表示
        const opponentHand = document.querySelector('#opponent-hand');
        opponentHand.innerHTML = '';
        const opponentHandCount = this.gameState?.players[this.opponentId]?.hand.length || 0;
        
        for (let i = 0; i < opponentHandCount; i++) {
            const hiddenCard = document.createElement('div');
            hiddenCard.className = 'card hidden-card';
            hiddenCard.innerHTML = `
                <div class="card-content">
                    <div class="card-value">?</div>
                    <div class="card-type">不明</div>
                </div>
            `;
            opponentHand.appendChild(hiddenCard);
        }
    }

    updateField() {
        const playerField = document.querySelector('#player-battle-slot');
        const opponentField = document.querySelector('#opponent-battle-slot');

        const playerFieldCard = this.gameState?.players[this.playerId]?.field;
        const opponentFieldCard = this.gameState?.players[this.opponentId]?.field;

        playerField.innerHTML = playerFieldCard ? this.createCardElement(playerFieldCard).outerHTML : '';
        opponentField.innerHTML = opponentFieldCard ? this.createCardElement(opponentFieldCard).outerHTML : '';
    }

    updateDeckCount() {
        document.querySelector('#player-deck-count').textContent = this.playerDeck.length;
        document.querySelector('#opponent-deck-count').textContent = 
            this.gameState?.players[this.opponentId]?.deck.length || 0;
    }

    updateGodHandDisplay() {
        document.querySelector('.god-hand-remaining').textContent = 
            `残り使用回数: ${this.godHandsRemaining}`;

        document.querySelectorAll('.god-hand').forEach(card => {
            if (this.godHandsRemaining <= 0) {
                card.classList.add('disabled');
                card.draggable = false;
            } else {
                card.classList.remove('disabled');
                card.draggable = true;
            }
        });
    }

    updateTurnIndicator() {
        const indicator = document.querySelector('#turn-indicator');
        indicator.textContent = this.isPlayerTurn ? 'あなたのターン' : '相手のターン';
        indicator.style.color = this.isPlayerTurn ? '#4ecdc4' : '#ff9800';
    }

    createCardElement(cardData) {
        const card = document.createElement('div');
        card.className = `card ${cardData.type}`;
        card.draggable = true;
        card.dataset.type = cardData.type;
        card.dataset.value = cardData.value;
        card.dataset.effect = cardData.effect;
        card.dataset.id = cardData.id;

        card.innerHTML = `
            <div class="card-content">
                <div class="card-value">${cardData.value || cardData.effect || ''}</div>
                <div class="card-type">${this.getCardTypeText(cardData.type)}</div>
            </div>
        `;

        return card;
    }

    getCardTypeText(type) {
        const typeMap = {
            attack: '攻撃',
            heal: '回復',
            effect: '効果',
            god: '神'
        };
        return typeMap[type] || type;
    }

    showCardDetails(e) {
        const card = e.target.closest('.card');
        if (!card) return;

        const popup = document.querySelector('.card-popup');
        popup.style.display = 'block';
        popup.style.left = `${e.pageX + 10}px`;
        popup.style.top = `${e.pageY + 10}px`;
        
        const cardData = {
            type: card.dataset.type,
            value: card.dataset.value,
            effect: card.dataset.effect
        };
        
        popup.innerHTML = this.getCardDetailsHTML(cardData);
    }

    hideCardDetails() {
        document.querySelector('.card-popup').style.display = 'none';
    }

    handleGameEnd() {
        const winner = this.playerHp > 0 ? 'あなた' : '相手';
        const resultModal = document.getElementById('result-modal');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');

        resultTitle.textContent = 'ゲーム終了';
        resultMessage.textContent = `${winner}の勝利です！`;
        resultModal.style.display = 'flex';

        this.cleanup();
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});