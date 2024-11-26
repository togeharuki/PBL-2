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
            apiKey: "YOUR_API_KEY" // 実際のAPIキーに置き換えてください
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
            // 新しいゲームを作成
            await this.createNewGame(gameRef);
            this.showWaitingMessage();
        } else {
            // 既存のゲームに参加
            await this.joinExistingGame(gameRef, gameDoc.data());
            this.hideWaitingMessage();
        }

        // リアルタイムアップデートの監視を開始
        this.setupRealtimeListeners();
        this.startTimer();
    }

    showWaitingMessage() {
        const waitingMessage = document.getElementById('waiting-message');
        if (waitingMessage) {
            waitingMessage.style.display = 'flex';
            const shareInput = document.getElementById('share-game-id');
            if (shareInput) {
                shareInput.value = this.gameId;
            }
        }
    }

    hideWaitingMessage() {
        const waitingMessage = document.getElementById('waiting-message');
        if (waitingMessage) {
            waitingMessage.style.display = 'none';
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
        } else {
            throw new Error('ゲームが満員です');
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
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    setupRealtimeListeners() {
        const gameRef = doc(this.db, 'games', this.gameId);
        this.unsubscribe = onSnapshot(gameRef, (doc) => {
            const gameData = doc.data();
            this.handleGameStateUpdate(gameData);
        });
    }

    startTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setInterval(() => {
            if (this.timeLeft > 0) {
                this.timeLeft--;
                document.querySelector('.timer').textContent = this.timeLeft;
                
                if (this.timeLeft <= 0) {
                    this.handleTimeUp();
                }
            }
        }, 1000);
    }
    handleGameStateUpdate(gameData) {
        if (!gameData) return;

        const opponent = this.playerNumber === 'player1' ? 'player2' : 'player1';
        
        // ゲーム状態の更新
        this.playerHp = gameData.players[this.playerNumber].hp;
        this.opponentHp = gameData.players[opponent].hp;
        this.isPlayerTurn = gameData.currentTurn === this.playerNumber;
        this.timeLeft = gameData.turnTime;
        this.godHandsRemaining = gameData.players[this.playerNumber].godHandRemaining;
        this.effectCardUsed = gameData.players[this.playerNumber].effectCardUsed;
        
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
        // カードのドラッグ&ドロップ設定
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
            card.addEventListener('mouseenter', this.showCardDetails.bind(this));
            card.addEventListener('mouseleave', this.hideCardDetails.bind(this));
        });

        // カードスロットの設定
        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.addEventListener('dragover', this.handleDragOver.bind(this));
            slot.addEventListener('drop', this.handleDrop.bind(this));
        });

        // コピーボタンの設定
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
        
        const card = e.target;
        if (card.classList.contains('god-hand') && this.godHandsRemaining <= 0) {
            e.preventDefault();
            return;
        }

        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: card.dataset.type,
            value: parseInt(card.dataset.value) || 0,
            effect: card.dataset.effect
        }));
        card.style.opacity = '0.5';
    }

    handleDragEnd(e) {
        e.target.style.opacity = '1';
    }

    handleDragOver(e) {
        e.preventDefault();
        e.target.style.borderColor = '#4CAF50';
    }

    async handleDrop(e) {
        e.preventDefault();
        const slot = e.target.closest('.card-slot');
        if (!slot || !this.isPlayerTurn) return;

        slot.style.borderColor = '#666';
        const cardData = JSON.parse(e.dataTransfer.getData('text/plain'));

        if (cardData.type === 'god') {
            if (this.godHandsRemaining > 0) {
                await this.playGodCard(cardData);
            }
        } else {
            await this.playNormalCard(cardData, slot);
        }
    }

    async playNormalCard(cardData, slot) {
        const gameRef = doc(this.db, 'games', this.gameId);

        if (cardData.type === 'effect' && !this.effectCardUsed) {
            await this.executeEffect(cardData.effect);
            await updateDoc(gameRef, {
                [`players.${this.playerNumber}.effectCardUsed`]: true
            });
        } else {
            await updateDoc(gameRef, {
                [`players.${this.playerNumber}.field`]: cardData,
                [`players.${this.playerNumber}.hand`]: this.playerHand.filter(card => 
                    card.id !== cardData.id)
            });
        }

        await this.endTurn();
    }

    async playGodCard(cardData) {
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

    async executeEffect(effect) {
        const gameRef = doc(this.db, 'games', this.gameId);
        
        switch (effect) {
            case 'draw':
                if (this.playerDeck.length > 0) {
                    const drawnCard = this.playerDeck[0];
                    this.playerHand.push(drawnCard);
                    this.playerDeck.shift();
                    
                    await updateDoc(gameRef, {
                        [`players.${this.playerNumber}.hand`]: this.playerHand,
                        [`players.${this.playerNumber}.deck`]: this.playerDeck
                    });
                }
                break;
            case 'view_hand':
                // 相手の手札を表示する処理
                break;
        }
    }

    async endTurn() {
        if (!this.isPlayerTurn) return;

        const gameRef = doc(this.db, 'games', this.gameId);
        const nextTurn = this.playerNumber === 'player1' ? 'player2' : 'player1';
        
        await updateDoc(gameRef, {
            currentTurn: nextTurn,
            turnTime: 60
        });

        this.timeLeft = 60;
        this.startTimer();
    }

    updateUI() {
        this.updateHP();
        this.updateField();
        this.updateHand();
        this.updateDeckCount();
        this.updateGodHandDisplay();
    }

    updateHP() {
        document.querySelector('#player-hp').textContent = `${this.playerHp}/10`;
        document.querySelector('#player-hp-bar').style.width = `${this.playerHp * 10}%`;
        document.querySelector('#opponent-hp').textContent = `${this.opponentHp}/10`;
        document.querySelector('#opponent-hp-bar').style.width = `${this.opponentHp * 10}%`;
    }

    updateField() {
        const playerSlot = document.querySelector('#player-battle-slot');
        const opponentSlot = document.querySelector('#opponent-battle-slot');

        if (this.gameState?.players[this.playerNumber]?.field) {
            playerSlot.innerHTML = this.createCardElement(this.gameState.players[this.playerNumber].field);
        } else {
            playerSlot.innerHTML = '';
        }

        const opponent = this.playerNumber === 'player1' ? 'player2' : 'player1';
        if (this.gameState?.players[opponent]?.field) {
            opponentSlot.innerHTML = this.createCardElement(this.gameState.players[opponent].field);
        } else {
            opponentSlot.innerHTML = '';
        }
    }

    updateHand() {
        const handContainer = document.querySelector('#player-hand');
        handContainer.innerHTML = '';
        
        this.playerHand.forEach(card => {
            const cardElement = this.createCardElement(card);
            handContainer.appendChild(cardElement);
        });
    }

    updateDeckCount() {
        document.querySelector('#player-deck-count').textContent = this.playerDeck.length;
    }

    updateGodHandDisplay() {
        const remainingDisplay = document.querySelector('.god-hand-remaining');
        remainingDisplay.textContent = `残り使用回数: ${this.godHandsRemaining}`;

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
        popup.style.display = 'block';
        popup.style.left = `${e.pageX + 10}px`;
        popup.style.top = `${e.pageY + 10}px`;
        
        popup.innerHTML = this.getCardDetailsHTML(card.dataset);
    }

    hideCardDetails() {
        document.querySelector('.card-popup').style.display = 'none';
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
                <h3>${cardData.type === 'god' ? '神の一手' : cardData.type}</h3>
                <p>${cardData.value ? `数値: ${cardData.value}` : ''}</p>
                <p>${cardData.effect ? `効果: ${effectDescriptions[cardData.effect]}` : ''}</p>
            </div>
        `;
    }

    handleTimeUp() {
        this.endTurn();
    }

    handleGameEnd() {
        const winner = this.playerHp > 0 ? 'あなた' : '相手';
        alert(`ゲーム終了！ ${winner}の勝利です！`);
        
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.timer) {
            clearInterval(this.timer);
        }
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