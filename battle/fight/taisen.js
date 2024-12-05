const firebaseConfig = {
    apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
    authDomain: "deck-dreamers.firebaseapp.com",
    projectId: "deck-dreamers",
    storageBucket: "deck-dreamers.appspot.com",
    messagingSenderId: "165933225805",
    appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
};

// Firebase初期化
const app = window.initializeApp(firebaseConfig);
const db = window.getFirestore(app);

// 初期カードデータを拡充
const initialCards = [
    // 攻撃カード
    {
        name: "斬撃",
        effect: "ダメージ3",
        type: "attack"
    },
    {
        name: "突撃",
        effect: "ダメージ4",
        type: "attack"
    },
    {
        name: "大斬撃",
        effect: "ダメージ5",
        type: "attack"
    },
    {
        name: "連撃",
        effect: "ダメージ2x2",
        type: "attack"
    },
    // 防御カード
    {
        name: "盾",
        effect: "防御+2",
        type: "defense"
    },
    {
        name: "鉄壁",
        effect: "防御+3",
        type: "defense"
    },
    // 回復カード
    {
        name: "回復",
        effect: "HP+2",
        type: "heal"
    },
    {
        name: "大回復",
        effect: "HP+3",
        type: "heal"
    },
    // 特殊効果カード
    {
        name: "ドロー",
        effect: "カードを1枚引く",
        type: "effect"
    },
    {
        name: "強化",
        effect: "次の攻撃+2",
        type: "effect"
    },
    // 追加の攻撃カード
    {
        name: "炎撃",
        effect: "ダメージ4+燃焼1",
        type: "attack"
    },
    {
        name: "氷撃",
        effect: "ダメージ3+スロー",
        type: "attack"
    },
    // 追加の防御カード
    {
        name: "反射",
        effect: "防御+2+反射1",
        type: "defense"
    },
    {
        name: "回避",
        effect: "次の攻撃回避",
        type: "defense"
    },
    // 追加の効果カード
    {
        name: "強奪",
        effect: "相手の手札を1枚奪う",
        type: "effect"
    }
];

export class Game {
    constructor() {
        console.log('Game クラスのコンストラクタを開始');
        
        this.battleState = {
            playerCard: null,
            opponentCard: null,
            isEffectCardUsed: false,
            battleResult: null
        };

        this.gameState = {
            playerHp: 10,
            opponentHp: 10,
            playerDeck: [],
            playerHand: [],
            isPlayerTurn: false,
            turnTime: 60
        };

        // URLパラメータから情報を取得
        const urlParams = new URLSearchParams(window.location.search);
        this.roomId = urlParams.get('roomId');
        this.tableNumber = urlParams.get('tableNumber');
        this.playerId = localStorage.getItem('playerId');

        console.log('ゲーム情報:', {
            roomId: this.roomId,
            tableNumber: this.tableNumber,
            playerId: this.playerId
        });

        if (!this.roomId || !this.tableNumber || !this.playerId) {
            const error = new Error('ゲーム情報が不正です');
            console.error('初期化エラー:', error);
            throw error;
        }

        this.gameId = `${this.roomId}_table${this.tableNumber}`;
        console.log('生成されたゲームID:', this.gameId);

        // ゲーム���初期化
        this.initializeGame();
        this.initializeEventListeners();

        // バトルゾーンの初期化を追加
        this.initializeBattleZone();
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

            // 自分のプレイヤー情報を追加（まだ存在しない場合）
            if (!playerIds.includes(this.playerId)) {
                console.log('自分のプレイヤー情報を追加:', this.playerId);
                await gameRef.update({
                    [`players.${this.playerId}`]: {
                        hp: 10,
                        deck: [],
                        hand: [],
                        godHandRemaining: 2
                    }
                });
                
                // 更新後のゲーム状態を再取得
                const updatedDoc = await gameRef.get();
                this.gameState = updatedDoc.data();
                playerIds.push(this.playerId);
            }

            // 対戦相手の参加を待つ
            if (playerIds.length < 2) {
                console.log('対戦相手の参加を待機中...');
                await new Promise((resolve, reject) => {
                    const waitOpponent = gameRef.onSnapshot((doc) => {
                        const currentState = doc.data();
                        const currentPlayers = Object.keys(currentState.players || {});
                        if (currentPlayers.length === 2) {
                            waitOpponent();
                            this.gameState = currentState;
                            this.opponentId = currentPlayers.find(id => id !== this.playerId);
                            console.log('対戦相手が参加しました:', this.opponentId);
                            resolve();
                        }
                    });

                    // 60秒でタイムアウト
                    setTimeout(() => {
                        waitOpponent();
                        reject(new Error('対戦相手の待機がタイムアウトしました'));
                    }, 60000);
                });
            } else {
                this.opponentId = playerIds.find(id => id !== this.playerId);
                console.log('既存の対戦相手が見つかりました:', this.opponentId);
            }

            if (!this.opponentId) {
                throw new Error('対戦相手が見つかりません');
            }

            // デッキの初期化（まだ行われていない場合）
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
            this.initializeTimer();

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
            const playerId = this.playerId;
            console.log('プレイヤーID:', playerId);

            // プレイヤーのデッキを取得
            const deckRef = db.collection('Deck').doc(playerId);
            const deckDoc = await deckRef.get();

            if (!deckDoc.exists) {
                throw new Error('デッキが見つかりません');
            }

            const deckData = deckDoc.data();
            if (!deckData.cards || !Array.isArray(deckData.cards)) {
                throw new Error('デッキのカードデータが不正です');
            }

            console.log('カード情報取得完了');
            const allCards = deckData.cards.map(card => ({
                id: card.name, // カ���ド名をIDとして使用
                type: card.type,
                effect: card.effect,
                name: card.name,
                image: card.image,
                isCreated: card.isCreated
            }));

            console.log(`取得したカード数: ${allCards.length}`);

            if (allCards.length !== 30) {
                throw new Error('デッキのカード枚数が不正です（30枚である必要があります）');
            }

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

    updateUI() {
        try {
            console.log('UI更新開始');
            
            // HP表示の更新
            document.getElementById('player-hp').textContent = `${this.gameState.playerHp}/10`;
            document.getElementById('opponent-hp').textContent = `${this.gameState.opponentHp}/10`;

            // デッキ枚数の更新
            document.getElementById('player-deck-count').textContent = this.gameState.playerDeck.length;
            document.getElementById('opponent-deck-count').textContent = this.gameState.opponentDeckCount;

            // 手札の更新
            this.updateHandDisplay();

            // 相手の手札の更新
            this.updateOpponentHandDisplay();

            // ターン表示の更新
            const turnIndicator = document.getElementById('turn-indicator');
            if (turnIndicator) {
                turnIndicator.textContent = this.gameState.isPlayerTurn ? 'あなたのターン' : '相手のターン';
                turnIndicator.className = this.gameState.isPlayerTurn ? 'turn-indicator your-turn' : 'turn-indicator opponent-turn';
            }

            // タイマーの更新
            if (this.gameState.isPlayerTurn) {
                this.setupTimer();
            }

            console.log('UI更新完了');
        } catch (error) {
            console.error('UI更新エラー:', error);
        }
    }

    updateHandDisplay() {
        const playerHand = document.getElementById('player-hand');
        if (!playerHand) return;

        playerHand.innerHTML = '';
        
        const handContainer = document.createElement('div');
        handContainer.className = 'hand-container';
        
        this.gameState.playerHand.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = `card ${card.type}`;
            cardElement.draggable = true;
            cardElement.dataset.cardId = card.id;
            
            // カードの内容を表示
            cardElement.innerHTML = `
                <div class="card-content">
                    <div class="card-front">
                        <div class="card-name">${card.name}</div>
                        <div class="card-effect">${card.effect}</div>
                    </div>
                </div>
            `;

            // カードの位置を調整
            cardElement.style.position = 'absolute';
            cardElement.style.left = `${index * 120}px`;
            cardElement.style.zIndex = index;

            // ドラッグ可能な場合のスタイル
            if (this.gameState.isPlayerTurn) {
                cardElement.classList.add('draggable');
            }

            handContainer.appendChild(cardElement);
        });

        playerHand.appendChild(handContainer);
    }

    updateOpponentHandDisplay() {
        const opponentHand = document.getElementById('opponent-hand');
        if (!opponentHand) return;

        opponentHand.innerHTML = '';
        
        // 手札の位置を調整するためのコンテナ
        const handContainer = document.createElement('div');
        handContainer.className = 'hand-container';
        
        // 相手の手札の枚数分だけ裏向きのカードを表示
        const opponentHandCount = this.gameState.opponentHandCount || 5;
        for (let i = 0; i < opponentHandCount; i++) {
            const cardBack = document.createElement('div');
            cardBack.className = 'card card-back';
            // カーの位置を少しずつずらす
            cardBack.style.position = 'absolute';
            cardBack.style.left = `${i * 120}px`; // カード同士の間隔を調整
            cardBack.style.zIndex = i;
            
            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';
            cardContent.innerHTML = `<img src="/battle/gatya/写真/カードの裏面.png" alt="カードの裏面">`;
            
            cardBack.appendChild(cardContent);
            handContainer.appendChild(cardBack);
        }

        opponentHand.appendChild(handContainer);
    }

    createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.type}`;
        cardElement.draggable = true;
        cardElement.dataset.cardId = card.id;

        const cardContent = document.createElement('div');
        cardContent.className = 'card-content';

        // カードの表面を作成
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        cardFront.innerHTML = `
            <div class="card-name">${card.name}</div>
            <div class="card-effect">${card.effect}</div>
        `;

        cardContent.appendChild(cardFront);
        cardElement.appendChild(cardContent);

        // カードのホバーエフェクトを追加
        cardElement.addEventListener('mouseenter', () => {
            if (this.gameState.isPlayerTurn) {
                cardElement.classList.add('card-hover');
            }
        });

        cardElement.addEventListener('mouseleave', () => {
            cardElement.classList.remove('card-hover');
        });

        return cardElement;
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
        const battleSlot = document.getElementById('player-battle-slot');

        if (playerHand) {
            playerHand.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('card') && this.gameState.isPlayerTurn) {
                    e.dataTransfer.setData('text/plain', e.target.dataset.cardId);
                    e.target.classList.add('dragging');
                }
            });

            playerHand.addEventListener('dragend', (e) => {
                if (e.target.classList.contains('card')) {
                    e.target.classList.remove('dragging');
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

    showCardDetails(card) {
        try {
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
                    details = this.getEffectDescription(card.effect);
                    break;
                case 'god':
                    details = this.getGodCardDescription(card.effect);
                    break;
                default:
                    details = 'カードの詳細情報がありません';
            }
            
            popup.textContent = details;
            popup.style.display = 'block';

            // マウスの位置に合わせてポップアップを表示
            document.addEventListener('mousemove', this.updatePopupPosition);
        } catch (error) {
            console.error('カード詳細表示エラー:', error);
        }
    }

    async waitForOpponent(gameDocRef) {
        console.log('対戦相手を待っています...');
        
        return new Promise((resolve, reject) => {
            let timeoutId;
            const unsubscribe = window.onSnapshot(gameDocRef, (doc) => {
                const gameData = doc.data();
                if (gameData && gameData.status === 'playing' && Object.keys(gameData.players).length === 2) {
                    console.log('対戦相手が見つかりまし');
                    clearTimeout(timeoutId); // タイムアウトをクリア
                    unsubscribe(); // リスナーを解除
                    
                    // マッチング中のオーバーレイを非表示
                    const matchingOverlay = document.getElementById('matching-overlay');
                    if (matchingOverlay) {
                        matchingOverlay.style.display = 'none';
                    }

                    this.updateGameState(gameData).then(() => {
                        this.updateUI();
                        resolve(gameData);
                    });
                }
            }, (error) => {
                console.error('対戦相手待機中にエラーが発生:', error);
                reject(error);
            });

            // タイムアウト処理
            timeoutId = setTimeout(() => {
                unsubscribe(); // リスナーを解除
                console.log('対戦相手待機タイムアウト');
                
                // ゲームドキュメントを削除
                window.deleteDoc(gameDocRef).catch(error => {
                    console.error('ゲームドキュメントの削除に失敗:', error);
                });
                
                reject(new Error('対戦相手が見つかりまんで��た'));
            }, 120000); // タイムアウトを2分延長
        });
    }

    setupRealtimeListener() {
        const gameRef = window.doc(db, 'games', this.gameId);
        window.onSnapshot(gameRef, async (doc) => {
            if (doc.exists()) {
                const gameData = doc.data();
                if (gameData.status === 'playing') {
                    // マッチング中のオーバーレイを非表示
                    const matchingOverlay = document.getElementById('matching-overlay');
                    if (matchingOverlay) {
                        matchingOverlay.style.display = 'none';
                    }
                    
                    const previousTurn = this.gameState?.isPlayerTurn;
                    await this.updateGameState(gameData);
                    
                    // 自分のターンが始まった時にカードを引く
                    if (!previousTurn && this.gameState.isPlayerTurn) {
                        await this.drawCard();
                    }
                    
                    this.updateUI();
                }
            }
        });
    }

    async updateGameState(gameData) {
        try {
            console.log('updateGameState開始:', gameData);
            
            if (!gameData || !gameData.players) {
                console.error('無効なゲームデータ:', gameData);
                return;
            }

            // gameDataを保存
            this.gameData = gameData;

            const playerState = gameData.players[this.playerId];
            if (!playerState) {
                console.error('プレイヤー情報が見つかりません:', {
                    playerId: this.playerId,
                    players: gameData.players
                });
                return;
            }

            const opponentId = Object.keys(gameData.players).find(id => id !== this.playerId);
            const opponentState = opponentId ? gameData.players[opponentId] : null;

            this.gameState = {
                playerHp: playerState.hp || 10,
                opponentHp: opponentState?.hp || 10,
                playerDeck: playerState.deck || [],
                playerHand: playerState.hand || [],
                opponentHandCount: opponentState?.handCount || 5,
                isPlayerTurn: gameData.currentTurn === this.playerId,
                turnTime: gameData.turnTime || 60
            };

            // バトル状態も更新
            if (gameData.battleState) {
                this.battleState = gameData.battleState;
            }

            console.log('ゲーム状態を更新しました:', this.gameState);
        } catch (error) {
            console.error('ゲーム状態の更新に失敗:', error);
            throw error;
        }
    }

    updateUI() {
        try {
            console.log('UI更新開始');
            
            // HP表示の更新
            document.getElementById('player-hp').textContent = `${this.gameState.playerHp}/10`;
            document.getElementById('opponent-hp').textContent = `${this.gameState.opponentHp}/10`;

            // デッキ枚数の更新
            document.getElementById('player-deck-count').textContent = this.gameState.playerDeck.length;

            // 手札の更新
            this.updateHandDisplay();

            // 相手の手札の更新
            this.updateOpponentHandDisplay();

            // ターン表示の更新
            const turnIndicator = document.getElementById('turn-indicator');
            if (turnIndicator) {
                turnIndicator.textContent = this.gameState.isPlayerTurn ? 'なたのターン' : '相手のターン';
                turnIndicator.className = this.gameState.isPlayerTurn ? 'turn-indicator your-turn' : 'turn-indicator opponent-turn';
            }

            // タマーの更新
            if (this.gameState.isPlayerTurn) {
                this.setupTimer();
            }

            console.log('UI更新完了');
        } catch (error) {
            console.error('UI更新エラー:', error);
        }
    }

    updateHandDisplay() {
        const playerHand = document.getElementById('player-hand');
        if (!playerHand) return;

        playerHand.innerHTML = '';
        
        const handContainer = document.createElement('div');
        handContainer.className = 'hand-container';
        
        this.gameState.playerHand.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = `card ${card.type}`;
            cardElement.draggable = true;
            cardElement.dataset.cardId = card.id;
            
            // カードの内容を表示
            cardElement.innerHTML = `
                <div class="card-content">
                    <div class="card-front">
                        <div class="card-name">${card.name}</div>
                        <div class="card-effect">${card.effect}</div>
                    </div>
                </div>
            `;

            // カードの位置を調整
            cardElement.style.position = 'absolute';
            cardElement.style.left = `${index * 120}px`;
            cardElement.style.zIndex = index;

            // ドラッグ可能な場合のスタイル
            if (this.gameState.isPlayerTurn) {
                cardElement.classList.add('draggable');
            }

            handContainer.appendChild(cardElement);
        });

        playerHand.appendChild(handContainer);
    }

    updateOpponentHandDisplay() {
        const opponentHand = document.getElementById('opponent-hand');
        if (!opponentHand) return;

        opponentHand.innerHTML = '';
        
        // 手札の位置を調整するためのコンテナ
        const handContainer = document.createElement('div');
        handContainer.className = 'hand-container';
        
        // 相手の手札の枚数分だけ裏向きのカードを表示
        const opponentHandCount = this.gameState.opponentHandCount || 5;
        for (let i = 0; i < opponentHandCount; i++) {
            const cardBack = document.createElement('div');
            cardBack.className = 'card card-back';
            // カー���の位置を少しずつずらす
            cardBack.style.position = 'absolute';
            cardBack.style.left = `${i * 120}px`; // カード同士の間隔を調整
            cardBack.style.zIndex = i;
            
            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';
            cardContent.innerHTML = `<img src="/battle/gatya/写真/カードの裏面.png" alt="カードの裏面">`;
            
            cardBack.appendChild(cardContent);
            handContainer.appendChild(cardBack);
        }

        opponentHand.appendChild(handContainer);
    }

    createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.type}`;
        cardElement.draggable = true;
        cardElement.dataset.cardId = card.id;

        const cardContent = document.createElement('div');
        cardContent.className = 'card-content';

        // カードの表面を作成
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        cardFront.innerHTML = `
            <div class="card-name">${card.name}</div>
            <div class="card-effect">${card.effect}</div>
        `;

        cardContent.appendChild(cardFront);
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

    getCardTypeText(type) {
        const typeMap = {
            attack: '攻撃',
            heal: '回復',
            effect: '効果',
            god: '神'
        };
        return typeMap[type] || type;
    }

    initializeTimer() {
        const timerElement = document.querySelector('.timer');
        if (!timerElement) return;

        if (this.timer) {
            clearInterval(this.timer);
        }

        // 自分のターンの場合のみタイマーを開始
        if (this.isPlayerTurn) {
            this.timeLeft = 60;
            timerElement.textContent = this.timeLeft;

            this.timer = setInterval(async () => {
                this.timeLeft--;
                timerElement.textContent = this.timeLeft;

                if (this.timeLeft <= 0) {
                    clearInterval(this.timer);
                    await this.handleTimeUp();
                }
            }, 1000);
        }
    }

    async handleTimeUp() {
        if (!this.isPlayerTurn || this.playerHand.length === 0) return;

        try {
            // ランダムにカードを選択して使用
            const randomIndex = Math.floor(Math.random() * this.playerHand.length);
            const randomCard = this.playerHand[randomIndex];
            const slot = document.querySelector('.card-slot');
            
            if (slot) {
                await this.playCard(randomCard, slot);
            }
        } catch (error) {
            console.error('タイムアップ処理エラー:', error);
        }
    }

    cleanup() {
        console.log('クリーンアップ処理開始');
        
        // タイマーのクリーンアップ
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        // リアルタイムリスナーのクリーンアップ
        if (this.unsubscribe) {
            try {
                this.unsubscribe();
                this.unsubscribe = null;
            } catch (error) {
                console.error('リスナーのクリーンアップエラー:', error);
            }
        }
        
        console.log('クリーンアップ処理完了');
    }

    getEffectDescription(effect) {
        const effectDescriptions = {
            'draw': 'カードを1枚ドローする',
            'check': '相手の手札を2枚確認する',
            'boost': 'カードの数値を+2する',
            // 他の効果の説明を追加
        };
        return effectDescriptions[effect] || '効果カード';
    }

    getGodCardDescription(effect) {
        const godCardDescriptions = {
            'damage_up': 'ダメージ+5',
            'discard': '手札を捨てる',
            'nullify': 'ダメージを無効化',
            'recover': 'カードを回収する'
        };
        return godCardDescriptions[effect] || '神の一手カード';
    }

    updateTurnIndicator() {
        const turnIndicator = document.getElementById('turn-indicator');
        if (turnIndicator) {
            turnIndicator.textContent = this.isPlayerTurn ? 'あなたのターン' : '相手のターン';
            turnIndicator.className = `turn-indicator ${this.isPlayerTurn ? 'your-turn' : 'opponent-turn'}`;
        }
    }

    handleGameEnd() {
        const resultModal = document.getElementById('result-modal');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        
        if (this.playerHp <= 0) {
            resultTitle.textContent = '敗北...';
            resultMessage.textContent = '相手の勝利です';
        } else if (this.opponentHp <= 0) {
            resultTitle.textContent = '勝利！';
            resultMessage.textContent = 'あなたの勝利です！';
        } else if (this.playerDeck.length === 0) {
            resultTitle.textContent = 'デッキ切れ';
            resultMessage.textContent = this.playerHp > this.opponentHp ? '勝利！' : '敗北...';
        }
        
        resultModal.style.display = 'flex';
    }

    async playCard(card, slot) {
        if (!this.isPlayerTurn || !card) return;

        try {
            const gameRef = db.collection('games').doc(this.gameId);
            
            // バトルゾーンにカードを配置
            await gameRef.update({
                [`battleZone.${this.playerId}`]: {
                    card: card,
                    isRevealed: false
                }
            });

            // 手札からカードを除去
            const newHand = this.playerHand.filter(c => c.id !== card.id);
            await gameRef.update({
                [`players.${this.playerId}.hand`]: newHand,
                currentTurn: this.opponentId,
                turnTime: 60
            });

            // 攻撃側の場合は相手の応答を待つ
            if (this.gameState.battleZone?.attacker === this.playerId) {
                await this.waitForOpponentResponse();
            }
            // 守備側の場合はバトル処理を実行
            else if (this.gameState.battleZone?.attacker === this.opponentId) {
                await this.processBattle();
            }

        } catch (error) {
            console.error('カード使用エラー:', error);
            alert('カードの使用に失敗しました');
        }
    }

    async waitForOpponentResponse() {
        return new Promise((resolve, reject) => {
            const unsubscribe = db.collection('games').doc(this.gameId).onSnapshot((doc) => {
                const state = doc.data();
                if (state.battleZone?.[this.opponentId]?.card) {
                    unsubscribe();
                    this.processBattle();
                    resolve();
                }
            });

            // 60秒でタイムアウト
            setTimeout(() => {
                unsubscribe();
                reject(new Error('相手の応答待ちがタイムアウトしました'));
            }, 60000);
        });
    }

    async processBattle() {
        const gameRef = db.collection('games').doc(this.gameId);
        const state = this.gameState;
        const attackerCard = state.battleZone[state.battleZone.attacker].card;
        const defenderCard = state.battleZone[state.battleZone.defender].card;

        // カードを表にする
        await gameRef.update({
            [`battleZone.${state.battleZone.attacker}.isRevealed`]: true,
            [`battleZone.${state.battleZone.defender}.isRevealed`]: true
        });

        // バトル結果の処理
        if (attackerCard.type === 'attack' && defenderCard.type === 'attack') {
            // 攻撃vs攻撃の場合
            const damage = Math.max(0, attackerCard.value - defenderCard.value);
            if (damage > 0) {
                await gameRef.update({
                    [`players.${state.battleZone.defender}.hp`]: firebase.firestore.FieldValue.increment(-damage)
                });
            }
        } else if (attackerCard.type === 'heal') {
            // 回復カードの処理
            const heal = Math.min(attackerCard.value, 10 - state.players[state.battleZone.attacker].hp);
            await gameRef.update({
                [`players.${state.battleZone.attacker}.hp`]: firebase.firestore.FieldValue.increment(heal)
            });
        }

        // バトルゾーンをクリア（カードを墓地へ）
        await gameRef.update({
            battleZone: {},
            [`players.${state.battleZone.attacker}.graveyard`]: firebase.firestore.FieldValue.arrayUnion(attackerCard),
            [`players.${state.battleZone.defender}.graveyard`]: firebase.firestore.FieldValue.arrayUnion(defenderCard)
        });
    }

    // バトルゾーンの状態を監視するリスナーを追加
    setupBattleZoneListener() {
        const gameRef = db.collection('games').doc(this.gameId);
        gameRef.onSnapshot((doc) => {
            const state = doc.data();
            if (state.battleZone) {
                this.updateBattleZoneDisplay(state.battleZone);
            }
        });
    }

    // バトルゾーンの表示を更新
    updateBattleZoneDisplay(battleZone) {
        const playerSlot = document.getElementById('player-battle-slot');
        const opponentSlot = document.getElementById('opponent-battle-slot');

        // プレイヤーのカード表示を更新
        if (battleZone[this.playerId]?.card) {
            const card = battleZone[this.playerId].card;
            const isRevealed = battleZone[this.playerId].isRevealed;
            playerSlot.innerHTML = this.createCardElement(card, isRevealed).outerHTML;
        } else {
            playerSlot.innerHTML = '';
        }

        // 相手のカード表示を更新
        if (battleZone[this.opponentId]?.card) {
            const card = battleZone[this.opponentId].card;
            const isRevealed = battleZone[this.opponentId].isRevealed;
            opponentSlot.innerHTML = this.createCardElement(card, isRevealed).outerHTML;
        } else {
            opponentSlot.innerHTML = '';
        }
    }

    // カード要素を作成（裏表の状態も考慮）
    createCardElement(card, isRevealed) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.type}`;
        
        if (isRevealed) {
            // カードの表面を表示
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
        } else {
            // カードの裏面を表示
            cardElement.classList.add('card-back');
        }
        
        return cardElement;
    }

    // バトルゾーンのドロップイベントを設定
    initializeBattleZone() {
        const playerBattleSlot = document.getElementById('player-battle-slot');
        
        playerBattleSlot.addEventListener('dragover', (e) => {
            if (!this.isPlayerTurn) return;
            e.preventDefault();
            e.currentTarget.style.borderColor = '#4CAF50';
        });
        
        playerBattleSlot.addEventListener('dragleave', (e) => {
            e.currentTarget.style.borderColor = '#666';
        });
        
        playerBattleSlot.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#666';
            
            if (!this.isPlayerTurn) return;
            
            const cardId = e.dataTransfer.getData('text/plain');
            const card = this.playerHand.find(c => c.id === cardId);
            if (card) {
                await this.playCard(card, e.currentTarget);
            }
        });
    }
}

// DOMContentLoadedイベントで初期化
document.addEventListener('DOMContentLoaded', () => {
    // Firebaseの初期化を待ってからゲームを開始
    if (db) {
        console.log('ゲーム初期化開始');
        const game = new Game();
        console.log('Gameインスタンス作成完了');
    } catch (error) {
        console.error('ゲーム初期化エラー:', error);
        console.error('エラーのスタックトレース:', error.stack);
        alert('ゲームの初期化に失敗しました。ページを再読み込みしてください。');
    }
});

