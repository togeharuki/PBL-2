// Firebase設定とSDKのインポート
const firebaseConfig = {
    apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
    authDomain: "deck-dreamers.firebaseapp.com",
    projectId: "deck-dreamers",
    storageBucket: "deck-dreamers.appspot.com",
    messagingSenderId: "165933225805",
    appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

class Game {
    constructor() {
        this.db = db;
        
        // URLパラメータから情報を取得
        const urlParams = new URLSearchParams(window.location.search);
        this.roomId = urlParams.get('roomId');
        this.tableNumber = urlParams.get('tableNumber');
        this.playerId = localStorage.getItem('playerId');

        // ゲーム状態の初期化
        this.gameState = null;
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

        if (!this.roomId || !this.tableNumber || !this.playerId) {
            console.error('ゲーム情報が不正です');
            window.location.href = '../Room/room.html';
            return;
        }

        // ゲームIDを生成
        this.gameId = `${this.roomId}_table${this.tableNumber}`;

        // ゲームの初期化
        this.initializeGame();
        this.initializeEventListeners();
    }

    async initializeGame() {
        try {
            console.log('ゲーム初期化開始:', this.gameId);
            
            // ゲームドキュメントの作成または取得
            const gameRef = db.collection('games').doc(this.gameId);
            const gameDoc = await gameRef.get();

            if (!gameDoc.exists) {
                console.log('新規ゲーム作成');
                // 新しいゲームを作成
                const initialGameState = {
                    players: {
                        [this.playerId]: {
                            hp: 10,
                            deck: [],
                            hand: [],
                            godHandRemaining: 2
                        }
                    },
                    currentTurn: this.playerId,
                    turnTime: 60,
                    status: 'waiting'
                };

                await gameRef.set(initialGameState);
                this.gameState = initialGameState;
            } else {
                console.log('既存ゲーム読み込み');
                this.gameState = gameDoc.data();
            }

            // プレイヤー情報の設定
            console.log('プレイヤー情報設定開始');
            const playerIds = Object.keys(this.gameState.players || {});
            console.log('現在のプレイヤー:', playerIds);
            console.log('現在のプレイヤーID:', this.playerId);

            if (!playerIds.includes(this.playerId)) {
                console.log('プレイヤー追加');
                const playerUpdate = {
                    [`players.${this.playerId}`]: {
                        hp: 10,
                        deck: [],
                        hand: [],
                        godHandRemaining: 2
                    }
                };
                await gameRef.update(playerUpdate);
                
                // 更新後のゲーム状態を再取得
                const updatedDoc = await gameRef.get();
                this.gameState = updatedDoc.data();
            }

            this.opponentId = playerIds.find(id => id !== this.playerId);
            console.log('対戦相手ID:', this.opponentId);

            // デキの初期化（まだ行われていない場合）
            if (!this.gameState.players[this.playerId]?.deck?.length) {
                console.log('デッキ初期化');
                await this.initializePlayerDeck();
                
                // デッキ初期化後のゲーム状態を再取得
                const updatedDoc = await gameRef.get();
                this.gameState = updatedDoc.data();
            } else {
                console.log('既存デッキ読み込み');
                this.playerDeck = this.gameState.players[this.playerId].deck;
                this.playerHand = this.gameState.players[this.playerId].hand;
                this.godHandsRemaining = this.gameState.players[this.playerId].godHandRemaining;
            }

            // リアルタイム更新の監視を開始
            console.log('リアルタイム更新の監視を開始');
            this.setupRealtimeListeners();

            // UI更新
            console.log('UI更新開始');
            this.updateUI();

            // マッチング中のオーバーレイを非表示
            const matchingOverlay = document.getElementById('matching-overlay');
            if (matchingOverlay) {
                matchingOverlay.style.display = 'none';
            }

            // タイマーを開始
            console.log('タイマー開始');
            this.startTimer();

            console.log('ゲーム初期化完了');

        } catch (error) {
            console.error('ゲーム初期化エラー:', error);
            console.error('エラーの詳細:', {
                gameId: this.gameId,
                playerId: this.playerId,
                gameState: this.gameState,
                error: error.message,
                stack: error.stack
            });
            alert('ゲームの初期化に失敗しました。ルームに戻ります。');
            window.location.href = '../Room/room.html';
        }
    }

    async initializePlayerDeck() {
        try {
            console.log('デッキ初期化開始');
            // プレイヤーのデッキ情報を取得
            const playerRef = db.collection('Player').doc(this.playerId);
            const playerDoc = await playerRef.get();
            
            if (!playerDoc.exists) {
                throw new Error('プレイヤー情報が見つかりません');
            }

            const playerData = playerDoc.data();
            if (!playerData.deck) {
                throw new Error('プレイヤーのデッキが設定されていません');
            }

            // デッキIDを使用してデッキ情報を取得
            const deckRef = db.collection('Deck').doc(playerData.deck);
            const deckDoc = await deckRef.get();

            if (!deckDoc.exists) {
                throw new Error('デッキが見つかりません');
            }

            const deckData = deckDoc.data();
            if (!deckData.cards || !Array.isArray(deckData.cards)) {
                throw new Error('デッキのカードデータが不正です');
            }

            console.log('カード情報取得完了');
            const allCards = deckData.cards.map(cardId => {
                const cardData = deckData.cardDetails[cardId];
                return {
                    id: cardId,
                    type: cardData.type,
                    effect: cardData.effect,
                    name: cardData.name,
                    image: cardData.image,
                    isCreated: cardData.isCreated
                };
            });

            console.log(`取得したカード数: ${allCards.length}`);

            // カードをシャッフル
            const shuffledDeck = this.shuffleArray(allCards);
            const initialHand = shuffledDeck.slice(0, 5);
            const remainingDeck = shuffledDeck.slice(5);

            // Firestoreを更新
            console.log('デッキ情報をFirestoreに保存');
            const gameRef = db.collection('games').doc(this.gameId);
            await gameRef.update({
                [`players.${this.playerId}.deck`]: remainingDeck,
                [`players.${this.playerId}.hand`]: initialHand
            });

            this.playerDeck = remainingDeck;
            this.playerHand = initialHand;
            console.log('デッキ初期化完了');
        } catch (error) {
            console.error('デッキ初期化エラー:', error);
            console.error('エラーの詳細:', {
                gameId: this.gameId,
                playerId: this.playerId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    initializeEventListeners() {
        console.log('イベントリスナー初期化開始');
        
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

        // 戻るボタンの処理
        const returnButton = document.querySelector('.return-button');
        if (returnButton) {
            returnButton.addEventListener('click', () => {
                this.cleanup();
                window.location.href = '../Room/room.html';
            });
        }

        console.log('イベントリスナー初期化完了');
    }

    handleDragStart(event) {
        if (!this.isPlayerTurn) return;
        
        const card = event.target.closest('.card');
        if (!card) return;
        
        event.dataTransfer.setData('text/plain', card.dataset.cardId);
        event.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
    }

    handleDragEnd(event) {
        const card = event.target.closest('.card');
        if (card) {
            card.classList.remove('dragging');
        }
    }

    handleDrop(event) {
        event.preventDefault();
        const cardId = event.dataTransfer.getData('text/plain');
        const targetSlot = event.target.closest('.card-slot');
        
        if (!cardId || !targetSlot || !this.isPlayerTurn) return;
        
        const card = this.playerHand.find(c => c.id === cardId);
        if (card) {
            this.playCard(card, targetSlot);
        }
        
        targetSlot.style.borderColor = '#666';
    }

    showCardDetails(event) {
        const card = event.target.closest('.card');
        if (!card) return;
        
        const popup = document.querySelector('.card-popup');
        const cardData = this.playerHand.find(c => c.id === card.dataset.cardId) || {
            type: card.dataset.type,
            effect: card.dataset.effect
        };
        
        let details = '';
        switch(cardData.type) {
            case 'attack':
                details = `攻撃力: ${cardData.value}`;
                break;
            case 'heal':
                details = `回復量: ${cardData.value}`;
                break;
            case 'effect':
                details = this.getEffectDescription(cardData.effect);
                break;
            case 'god':
                details = this.getGodCardDescription(cardData.effect);
                break;
        }
        
        popup.textContent = details;
        popup.style.display = 'block';
        popup.style.left = `${event.pageX + 10}px`;
        popup.style.top = `${event.pageY + 10}px`;
    }

    hideCardDetails() {
        const popup = document.querySelector('.card-popup');
        popup.style.display = 'none';
    }

    setupRealtimeListeners() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const gameRef = db.collection('games').doc(this.gameId);
        this.unsubscribe = gameRef.onSnapshot((doc) => {
            if (doc.exists) {
                const newState = doc.data();
                this.handleGameStateUpdate(newState);
            }
        });
    }

    handleGameStateUpdate(newState) {
        this.gameState = newState;
        const playerState = newState.players[this.playerId];
        const opponentState = newState.players[this.opponentId];

        if (playerState && opponentState) {
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
    }

    updateUI() {
        // HP表示の更新
        document.getElementById('player-hp').textContent = `${this.playerHp}/10`;
        document.getElementById('opponent-hp').textContent = `${this.opponentHp}/10`;
        
        // HPバーの更新
        document.getElementById('player-hp-bar').style.width = `${(this.playerHp / 10) * 100}%`;
        document.getElementById('opponent-hp-bar').style.width = `${(this.opponentHp / 10) * 100}%`;
        
        // デッキ枚数の更新
        document.getElementById('player-deck-count').textContent = this.playerDeck.length;
        document.getElementById('opponent-deck-count').textContent = 
            this.gameState.players[this.opponentId]?.deck.length || 0;
        
        // 手札の更新
        this.updateHandDisplay();
        
        // 神の一手の残り使用回数
        document.querySelector('.god-hand-remaining').textContent = 
            `残り使用回数: ${this.godHandsRemaining}`;
    }

    updateHandDisplay() {
        const playerHandElement = document.getElementById('player-hand');
        const opponentHandElement = document.getElementById('opponent-hand');
        
        // プレイヤーの手札を更新
        playerHandElement.innerHTML = '';
        this.playerHand.forEach(card => {
            const cardElement = this.createCardElement(card);
            playerHandElement.appendChild(cardElement);
        });
        
        // 相手の手札を更新（裏向き）
        opponentHandElement.innerHTML = '';
        const opponentHandCount = this.gameState.players[this.opponentId]?.hand.length || 0;
        for (let i = 0; i < opponentHandCount; i++) {
            const cardBack = document.createElement('div');
            cardBack.className = 'card opponent-card';
            opponentHandElement.appendChild(cardBack);
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
        cardType.textContent = card.name || this.getCardTypeText(card.type);
        
        cardContent.appendChild(cardValue);
        cardContent.appendChild(cardType);
        cardElement.appendChild(cardContent);
        
        return cardElement;
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
