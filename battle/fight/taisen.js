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
    getDocs,
    where 
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

const firebaseConfig = {
    projectId: "deck-dreamers",
    storageBucket: "deck-dreamers.appspot.com",
    // 他のFirebase設定を追加
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

class BattleGame {
    constructor() {
        this.gameId = null;
        this.playerId = null;
        this.playerNumber = null;
        this.gameState = null;
        this.unsubscribe = null;
        this.timer = null;
        this.deck = [];
        this.hand = [];
        this.godHandRemaining = 2;

        this.initializeEventListeners();
    }

    async initialize() {
        // URLからゲームIDを取得
        const urlParams = new URLSearchParams(window.location.search);
        this.gameId = urlParams.get('gameId');

        if (!this.gameId) {
            this.gameId = this.generateGameId();
            window.history.pushState({}, '', `?gameId=${this.gameId}`);
        }

        await this.joinGame();
        this.setupRealtimeListeners();
    }

    generateGameId() {
        return Math.random().toString(36).substring(2, 15);
    }

    async joinGame() {
        const gameRef = doc(db, 'games', this.gameId);
        const gameDoc = await getDoc(gameRef);

        if (!gameDoc.exists()) {
            // 新しいゲームを作成
            await this.createNewGame(gameRef);
        } else {
            // 既存のゲームに参加
            await this.joinExistingGame(gameRef, gameDoc.data());
        }
    }

    async createNewGame(gameRef) {
        const initialDeck = await this.getRandomCardsFromDatabase(30); // 山札用に30枚取得
        const initialHand = await this.getRandomCardsFromDatabase(5); // 手札用に5枚取得

        const initialState = {
            players: {
                player1: {
                    id: auth.currentUser?.uid,
                    hp: 10,
                    deck: initialDeck,
                    hand: initialHand,
                    field: null,
                    godHandRemaining: 2
                },
                player2: null
            },
            currentTurn: 'player1',
            turnTime: 60,
            status: 'waiting',
            timestamp: Date.now()
        };

        await setDoc(gameRef, initialState);
        this.playerNumber = 'player1';
        this.deck = initialDeck;
        this.hand = initialHand;
    }

    async joinExistingGame(gameRef, gameData) {
        if (!gameData.players.player2) {
            const initialDeck = await this.getRandomCardsFromDatabase(30);
            const initialHand = await this.getRandomCardsFromDatabase(5);

            await updateDoc(gameRef, {
                'players.player2': {
                    id: auth.currentUser?.uid,
                    hp: 10,
                    deck: initialDeck,
                    hand: initialHand,
                    field: null,
                    godHandRemaining: 2
                },
                status: 'playing'
            });

            this.playerNumber = 'player2';
            this.deck = initialDeck;
            this.hand = initialHand;
        } else {
            throw new Error('Game is full');
        }
    }

    async getRandomCardsFromDatabase(count) {
        const deckRef = collection(db, 'deck');
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
        const gameRef = doc(db, 'games', this.gameId);
        this.unsubscribe = onSnapshot(gameRef, (doc) => {
            const newState = doc.data();
            this.handleGameStateUpdate(newState);
        });
    }

    handleGameStateUpdate(newState) {
        this.gameState = newState;
        this.updateUI();
        
        if (this.gameState.status === 'finished') {
            this.handleGameEnd();
        }
    }

    initializeEventListeners() {
        // カードのドラッグ&ドロップ設定
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('card')) {
                this.handleDragStart(e);
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('card')) {
                this.handleDragEnd(e);
            }
        });

        document.addEventListener('dragover', (e) => {
            if (e.target.classList.contains('card-slot')) {
                this.handleDragOver(e);
            }
        });

        document.addEventListener('drop', (e) => {
            if (e.target.classList.contains('card-slot')) {
                this.handleDrop(e);
            }
        });
    }

    handleDragStart(e) {
        if (!this.isPlayerTurn() || !e.target.classList.contains('card')) return;

        const card = e.target;
        if (card.classList.contains('god-hand') && this.godHandRemaining <= 0) {
            e.preventDefault();
            return;
        }

        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: card.dataset.type,
            value: card.dataset.value,
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
        if (!slot || !this.isPlayerTurn()) return;

        const cardData = JSON.parse(e.dataTransfer.getData('text/plain'));
        slot.style.borderColor = '#666';

        if (cardData.type === 'god') {
            await this.playGodCard(cardData);
        } else {
            await this.playNormalCard(cardData, slot);
        }
    }

    async playNormalCard(cardData, slot) {
        const gameRef = doc(db, 'games', this.gameId);
        const fieldUpdate = {};
        fieldUpdate[`players.${this.playerNumber}.field`] = cardData;

        await updateDoc(gameRef, fieldUpdate);
        this.removeCardFromHand(cardData);
        await this.endTurn();
    }

    async playGodCard(cardData) {
        if (this.godHandRemaining <= 0) return;

        const gameRef = doc(db, 'games', this.gameId);
        await updateDoc(gameRef, {
            [`players.${this.playerNumber}.godHandRemaining`]: this.godHandRemaining - 1
        });

        this.executeGodCardEffect(cardData.effect);
    }

    executeGodCardEffect(effect) {
        switch (effect) {
            case 'damage_up':
                // ダメージ増加の効果を実装
                break;
            case 'discard':
                // 手札破棄の効果を実装
                break;
        }
    }

    removeCardFromHand(cardData) {
        const index = this.hand.findIndex(card => 
            card.type === cardData.type && 
            card.value === cardData.value && 
            card.effect === cardData.effect
        );
        if (index !== -1) {
            this.hand.splice(index, 1);
        }
    }

    isPlayerTurn() {
        return this.gameState?.currentTurn === this.playerNumber;
    }

    async endTurn() {
        const gameRef = doc(db, 'games', this.gameId);
        const nextTurn = this.playerNumber === 'player1' ? 'player2' : 'player1';
        
        await updateDoc(gameRef, {
            currentTurn: nextTurn,
            turnTime: 60
        });
    }

    updateUI() {
        this.updateHP();
        this.updateField();
        this.updateHand();
        this.updateTimer();
        this.updateGodHandDisplay();
    }

    updateHP() {
        const playerHp = this.gameState.players[this.playerNumber].hp;
        const opponentHp = this.gameState.players[this.playerNumber === 'player1' ? 'player2' : 'player1'].hp;

        document.querySelector('#player-hp').textContent = `${playerHp}/10`;
        document.querySelector('#player-hp-bar').style.width = `${playerHp * 10}%`;
        document.querySelector('#opponent-hp').textContent = `${opponentHp}/10`;
        document.querySelector('#opponent-hp-bar').style.width = `${opponentHp * 10}%`;
    }

    updateField() {
        const playerField = document.querySelector('#player-battle-slot');
        const opponentField = document.querySelector('#opponent-battle-slot');

        const playerCardData = this.gameState.players[this.playerNumber].field;
        const opponentCardData = this.gameState.players[this.playerNumber === 'player1' ? 'player2' : 'player1'].field;

        if (playerCardData) {
            playerField.innerHTML = this.createCardElement(playerCardData);
        } else {
            playerField.innerHTML = '';
        }

        if (opponentCardData) {
            opponentField.innerHTML = this.createCardElement(opponentCardData);
        } else {
            opponentField.innerHTML = '';
        }
    }

    updateHand() {
        const handContainer = document.querySelector('#player-hand');
        handContainer.innerHTML = '';
        
        this.hand.forEach(card => {
            const cardElement = this.createCardElement(card);
            handContainer.appendChild(cardElement);
        });
    }

    updateTimer() {
        const timerElement = document.querySelector('.timer');
        if (timerElement) {
            timerElement.textContent = this.gameState.turnTime;
        }
    }

    updateGodHandDisplay() {
        const remainingDisplay = document.querySelector('.god-hand-remaining');
        remainingDisplay.textContent = `残り使用回数: ${this.godHandRemaining}`;

        document.querySelectorAll('.god-hand').forEach(card => {
            if (this.godHandRemaining <= 0) {
                card.classList.add('disabled');
                card.draggable = false;
            } else {
                card.classList.remove('disabled');
                card.draggable = true;
            }
        });
    }

    createCardElement(cardData) {
        const card = document.createElement('div');
        card.className = `card ${cardData.type}`;
        card.draggable = true;
        card.dataset.type = cardData.type;
        card.dataset.value = cardData.value;
        card.dataset.effect = cardData.effect;

        card.innerHTML = `
            <div class="card-content">
                <div class="card-value">${cardData.value || ''}</div>
                <div class="card-type">${this.getCardTypeText(cardData)}</div>
            </div>
        `;

        return card;
    }

    getCardTypeText(cardData) {
        switch (cardData.type) {
            case 'attack': return '攻撃';
            case 'heal': return '回復';
            case 'effect': return '効果';
            case 'god': return '神';
            default: return cardData.type;
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
    const game = new BattleGame();
    game.initialize().catch(console.error);
});