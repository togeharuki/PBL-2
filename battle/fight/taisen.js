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
            projectId: "deck-dreamers",
            storageBucket: "deck-dreamers.appspot.com",
            // 他の設定を追加
        };

        const app = initializeApp(firebaseConfig);
        this.db = getFirestore(app);
        
        // ゲーム状態の初期化
        this.gameId = this.generateGameId();
        this.playerNumber = null;
        this.playerHp = 10;
        this.opponentHp = 10;
        this.timeLeft = 60;
        this.isPlayerTurn = true;
        this.effectCardUsed = false;
        this.godHandsRemaining = 2;
        this.playerDeck = [];
        this.playerHand = [];
        this.graveyard = [];
        this.unsubscribe = null;
        this.timer = null;

        // 初期化処理
        this.initializeGame();
        this.initializeEventListeners();
        this.updateGameInfo();
    }

    updateGameInfo() {
        // ゲームID表示の更新
        const gameIdElement = document.getElementById('game-id');
        if (gameIdElement) {
            gameIdElement.textContent = this.gameId;
        }
        
        // シェア用入力欄の更新
        const shareInput = document.getElementById('share-game-id');
        if (shareInput) {
            shareInput.value = this.gameId;
        }
    }

    generateGameId() {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('gameId');
        if (gameId) return gameId;
        
        const newGameId = Math.random().toString(36).substring(2, 15);
        window.history.pushState({}, '', `?gameId=${newGameId}`);
        return newGameId;
    }

    async initializeGame() {
        const gameRef = doc(this.db, 'games', this.gameId);
        const gameDoc = await getDoc(gameRef);

        if (!gameDoc.exists()) {
            await this.createNewGame(gameRef);
            this.showWaitingMessage();
        } else {
            await this.joinExistingGame(gameRef, gameDoc.data());
            this.hideWaitingMessage();
        }

        // リアルタイムアップデートの監視を開始
        this.setupRealtimeListeners();
    }

    showWaitingMessage() {
        const waitingMessage = document.getElementById('waiting-message');
        const gameStatus = document.getElementById('game-status');
        if (waitingMessage) {
            waitingMessage.style.display = 'flex';
        }
        if (gameStatus) {
            gameStatus.textContent = 'マッチング中...';
        }
    }

    hideWaitingMessage() {
        const waitingMessage = document.getElementById('waiting-message');
        const gameStatus = document.getElementById('game-status');
        if (waitingMessage) {
            waitingMessage.style.display = 'none';
        }
        if (gameStatus) {
            gameStatus.textContent = 'ゲーム中';
        }
    }

    async createNewGame(gameRef) {
        const initialDeck = await this.getRandomCardsFromDatabase(30);
        const initialHand = initialDeck.slice(0, 5);
        const remainingDeck = initialDeck.slice(5);

        const initialState = {
            players: {
                player1: {
                    hp: 10,
                    deck: remainingDeck,
                    hand: initialHand,
                    field: null,
                    graveyard: [],
                    godHandRemaining: 2,
                    effectCardUsed: false
                },
                player2: null
            },
            currentTurn: 'player1',
            turnTime: 60,
            status: 'waiting'
        };

        await setDoc(gameRef, initialState);
        this.playerNumber = 'player1';
        this.playerDeck = remainingDeck;
        this.playerHand = initialHand;
        this.updateUI();
    }

    async joinExistingGame(gameRef, gameData) {
        if (!gameData.players.player2) {
            const initialDeck = await this.getRandomCardsFromDatabase(30);
            const initialHand = initialDeck.slice(0, 5);
            const remainingDeck = initialDeck.slice(5);

            await updateDoc(gameRef, {
                'players.player2': {
                    hp: 10,
                    deck: remainingDeck,
                    hand: initialHand,
                    field: null,
                    graveyard: [],
                    godHandRemaining: 2,
                    effectCardUsed: false
                },
                status: 'playing'
            });

            this.playerNumber = 'player2';
            this.playerDeck = remainingDeck;
            this.playerHand = initialHand;
            this.updateUI();
        }
    }
    async getRandomCardsFromDatabase(count) {
        const deckRef = collection(this.db, 'deck');
        const q = query(deckRef, limit(count));
        const querySnapshot = await getDocs(q);
        
        const cards = [];
        querySnapshot.forEach((doc) => {
            cards.push({
                id: doc.id,
                ...doc.data()
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

    handleGameStateUpdate(gameData) {
        if (!gameData || !this.playerNumber) return;

        const opponent = this.playerNumber === 'player1' ? 'player2' : 'player1';
        
        // ゲーム状態の更新
        this.playerHp = gameData.players[this.playerNumber].hp;
        this.opponentHp = gameData.players[opponent]?.hp || 10;
        this.isPlayerTurn = gameData.currentTurn === this.playerNumber;
        this.timeLeft = gameData.turnTime;
        this.godHandsRemaining = gameData.players[this.playerNumber].godHandRemaining;
        this.playerHand = gameData.players[this.playerNumber].hand;
        this.playerDeck = gameData.players[this.playerNumber].deck;
        
        if (gameData.status === 'playing') {
            this.hideWaitingMessage();
        }

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
                e.target.style.borderColor = '#4CAF50';
            });
            slot.addEventListener('dragleave', (e) => {
                e.target.style.borderColor = '#666';
            });
            slot.addEventListener('drop', this.handleDrop.bind(this));
        });

        // コピーボタンのイベントリスナー
        const copyButton = document.getElementById('copy-id');
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                const shareInput = document.getElementById('share-game-id');
                if (shareInput) {
                    shareInput.select();
                    document.execCommand('copy');
                    alert('ゲームIDがコピーされました！');
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
            effect: card.dataset.effect
        };

        e.dataTransfer.setData('text/plain', JSON.stringify(cardData));
        card.style.opacity = '0.5';
    }

    handleDragEnd(e) {
        e.target.style.opacity = '1';
    }

    async handleDrop(e) {
        e.preventDefault();
        const slot = e.target.closest('.card-slot');
        if (!slot || !this.isPlayerTurn) return;

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

        if (cardData.type === 'effect' && !this.effectCardUsed) {
            await this.executeEffect(cardData.effect);
            await updateDoc(gameRef, {
                [`players.${this.playerNumber}.effectCardUsed`]: true,
                [`players.${this.playerNumber}.field`]: cardData
            });
        } else {
            await updateDoc(gameRef, {
                [`players.${this.playerNumber}.field`]: cardData
            });
        }

        // カードを手札から削除
        const newHand = this.playerHand.filter(card => 
            !(card.type === cardData.type && 
              card.value === cardData.value && 
              card.effect === cardData.effect)
        );

        await updateDoc(gameRef, {
            [`players.${this.playerNumber}.hand`]: newHand
        });

        await this.endTurn();
    }

    async playGodCard(cardData) {
        if (this.godHandsRemaining <= 0) return;

        const gameRef = doc(this.db, 'games', this.gameId);
        await updateDoc(gameRef, {
            [`players.${this.playerNumber}.godHandRemaining`]: this.godHandsRemaining - 1
        });

        switch (cardData.effect) {
            case 'damage_up':
                await this.applyDamageUp();
                break;
            case 'discard':
                await this.discardOpponentCard();
                break;
        }
    }

    async applyDamageUp() {
        const gameRef = doc(this.db, 'games', this.gameId);
        const opponent = this.playerNumber === 'player1' ? 'player2' : 'player1';
        
        // 相手のHPを5減らす
        const newHp = Math.max(0, this.opponentHp - 5);
        await updateDoc(gameRef, {
            [`players.${opponent}.hp`]: newHp
        });
    }

    async executeEffect(effect) {
        const gameRef = doc(this.db, 'games', this.gameId);
        
        switch (effect) {
            case 'draw':
                if (this.playerDeck.length > 0) {
                    const newHand = [...this.playerHand, this.playerDeck[0]];
                    const newDeck = this.playerDeck.slice(1);
                    
                    await updateDoc(gameRef, {
                        [`players.${this.playerNumber}.hand`]: newHand,
                        [`players.${this.playerNumber}.deck`]: newDeck
                    });
                }
                break;
        }
    }

    updateUI() {
        this.updateHP();
        this.updateField();
        this.updateHand();
        this.updateDeckCount();
        this.updateGraveyard();
        this.updateGodHandDisplay();
    }

    updateHP() {
        const playerHpElement = document.querySelector('#player-hp');
        const playerHpBarElement = document.querySelector('#player-hp-bar');
        const opponentHpElement = document.querySelector('#opponent-hp');
        const opponentHpBarElement = document.querySelector('#opponent-hp-bar');

        if (playerHpElement && playerHpBarElement) {
            playerHpElement.textContent = `${this.playerHp}/10`;
            playerHpBarElement.style.width = `${this.playerHp * 10}%`;
        }

        if (opponentHpElement && opponentHpBarElement) {
            opponentHpElement.textContent = `${this.opponentHp}/10`;
            opponentHpBarElement.style.width = `${this.opponentHp * 10}%`;
        }
    }

    updateHand() {
        const handContainer = document.querySelector('#player-hand');
        if (!handContainer) return;

        handContainer.innerHTML = '';
        this.playerHand.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = `card ${card.type}`;
            cardElement.draggable = true;
            cardElement.dataset.type = card.type;
            cardElement.dataset.value = card.value;
            cardElement.dataset.effect = card.effect;

            cardElement.innerHTML = `
                <div class="card-content">
                    <div class="card-value">${card.value || card.effect || ''}</div>
                    <div class="card-type">${this.getCardTypeText(card.type)}</div>
                </div>
            `;

            // カードのイベントリスナーを追加
            cardElement.addEventListener('dragstart', this.handleDragStart.bind(this));
            cardElement.addEventListener('dragend', this.handleDragEnd.bind(this));
            cardElement.addEventListener('mouseenter', this.showCardDetails.bind(this));
            cardElement.addEventListener('mouseleave', this.hideCardDetails.bind(this));

            handContainer.appendChild(cardElement);
        });
    }

    getCardTypeText(type) {
        switch (type) {
            case 'attack': return '攻撃';
            case 'heal': return '回復';
            case 'effect': return '効果';
            case 'god': return '神';
            default: return type;
        }
    }

    updateDeckCount() {
        const playerDeckCount = document.querySelector('#player-deck-count');
        const opponentDeckCount = document.querySelector('#opponent-deck-count');

        if (playerDeckCount) {
            playerDeckCount.textContent = this.playerDeck.length;
        }

        if (opponentDeckCount) {
            opponentDeckCount.textContent = '?';
        }
    }

    updateGraveyard() {
        const playerGraveyardCount = document.querySelector('#player-graveyard-count');
        const opponentGraveyardCount = document.querySelector('#opponent-graveyard-count');

        if (playerGraveyardCount) {
            playerGraveyardCount.textContent = this.graveyard.length;
        }

        if (opponentGraveyardCount) {
            opponentGraveyardCount.textContent = '?';
        }
    }

    updateGodHandDisplay() {
        const remainingDisplay = document.querySelector('.god-hand-remaining');
        if (remainingDisplay) {
            remainingDisplay.textContent = `残り使用回数: ${this.godHandsRemaining}`;
        }

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
        if (indicator) {
            indicator.textContent = this.isPlayerTurn ? 'あなたのターン' : '相手のターン';
            indicator.style.color = this.isPlayerTurn ? '#4ecdc4' : '#ff9800';
        }
    }

    showCardDetails(e) {
        const card = e.target.closest('.card');
        if (!card) return;

        const popup = document.querySelector('.card-popup');
        if (!popup) return;

        popup.style.display = 'block';
        popup.style.left = `${e.pageX + 10}px`;
        popup.style.top = `${e.pageY + 10}px`;
        
        popup.innerHTML = this.getCardDetailsHTML(card.dataset);
    }

    hideCardDetails() {
        const popup = document.querySelector('.card-popup');
        if (popup) {
            popup.style.display = 'none';
        }
    }

    getCardDetailsHTML(cardData) {
        const effectDescriptions = {
            'draw': 'カードを1枚引く',
            'view_hand': '相手の手札を確認',
            'damage_up': 'ダメージ+5',
            'discard': '相手の手札を1枚破棄'
        };

        return `
            <div class="card-detail-content">
                <h3>${cardData.type === 'god' ? '神の一手' : this.getCardTypeText(cardData.type)}</h3>
                ${cardData.value ? `<p>数値: ${cardData.value}</p>` : ''}
                ${cardData.effect ? `<p>効果: ${effectDescriptions[cardData.effect] || cardData.effect}</p>` : ''}
            </div>
        `;
    }

    async endTurn() {
        if (!this.isPlayerTurn) return;

        const gameRef = doc(this.db, 'games', this.gameId);
        const nextTurn = this.playerNumber === 'player1' ? 'player2' : 'player1';
        
        await updateDoc(gameRef, {
            currentTurn: nextTurn,
            turnTime: 60,
            [`players.${this.playerNumber}.effectCardUsed`]: false
        });
    }

    handleGameEnd() {
        const resultModal = document.getElementById('result-modal');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        
        if (resultModal && resultTitle && resultMessage) {
            const winner = this.playerHp > 0 ? 'あなた' : '相手';
            resultTitle.textContent = 'ゲーム終了';
            resultMessage.textContent = `${winner}の勝利です！`;
            resultModal.style.display = 'flex';
        }

        this.cleanup();
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});