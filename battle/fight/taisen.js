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

        // 初期化を非同期で実行
        this.initializeGame().catch(error => {
            console.error('ゲーム初期化中にエラーが発生:', error);
            alert('ゲームの初期化に失敗しました。ページを再読み込みしてくだ��');
        });

        // イベントリスナーの設定
        this.setupEventListeners();
    }

    setupEventListeners() {
        // カードのドラッグ&ドロップイベント
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

        if (battleSlot) {
            battleSlot.addEventListener('dragover', (e) => {
                if (this.gameState.isPlayerTurn) {
                    e.preventDefault();
                    battleSlot.classList.add('valid-target');
                }
            });

            battleSlot.addEventListener('dragleave', () => {
                battleSlot.classList.remove('valid-target');
            });

            battleSlot.addEventListener('drop', (e) => {
                e.preventDefault();
                battleSlot.classList.remove('valid-target');
                const cardId = e.dataTransfer.getData('text/plain');
                if (cardId && this.gameState.isPlayerTurn) {
                    this.playCard(cardId);
                }
            });
        }
    }

    async initializeGame() {
        try {
            console.log('initializeGame開始');
            
            console.log('Firestoreリファレンス作成開始');
            const gamesRef = window.collection(db, 'games');
            const gameDocRef = window.doc(gamesRef, this.gameId);
            
            console.log('ゲームドキュメント取得開始');
            const gameDocSnap = await window.getDoc(gameDocRef);
            console.log('ゲームドキュメントの存在:', gameDocSnap.exists());

            // マッチング中のオーバーレイを表示
            const matchingOverlay = document.getElementById('matching-overlay');
            if (matchingOverlay) {
                matchingOverlay.style.display = 'flex';
            }

            try {
                if (!gameDocSnap.exists()) {
                    // 新規ゲーム作成の処理
                    await this.createNewGame(gameDocRef);
                } else {
                    // 既存ゲームへの参加処理
                    await this.joinExistingGame(gameDocRef, gameDocSnap.data());
                }

                // リアルタイム更新のリスナーを設定
                this.setupRealtimeListener();
                console.log('ゲーム初期化完了');
                return true;
            } catch (error) {
                // エラーが発生した場合、オーバーレイを非表示にする
                if (matchingOverlay) {
                    matchingOverlay.style.display = 'none';
                }
                throw error;
            }
        } catch (error) {
            console.error('ゲーム初期化エラー:', error);
            console.error('エラーのスタックトレース:', error.stack);
            throw error;
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
                turnIndicator.textContent = this.gameState.isPlayerTurn ? 'あなたのターン' : '相手のターン';
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

    async getCardEffect() {
        try {
            console.log('getCardEffect開始');
            const playerId = this.playerId;
            console.log('プレイヤーID:', playerId);

            // プレイヤーのデッキを取得
            const deckRef = window.doc(db, 'Deck', playerId);
            const deckDoc = await window.getDoc(deckRef);

            if (!deckDoc.exists()) {
                console.log('デッキが見つからないため、新規作成します');
                // 新規デッキを作成
                const newDeck = {
                    cards: initialCards.map(card => ({
                        ...card,
                        isCreated: false,
                        // ユニークなIDを生成
                        id: `${card.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    }))
                };
                await window.setDoc(deckRef, newDeck);
                return newDeck.cards;
            }

            const deckData = deckDoc.data();
            if (!deckData.cards || !Array.isArray(deckData.cards)) {
                throw new Error('デッキのカードデータが不正です');
            }

            console.log('カード情報取得完了');
            const allCards = deckData.cards.map(card => ({
                // カードのIDを保持、ない場合は新しく生成
                id: card.id || `${card.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: card.type,
                effect: card.effect,
                name: card.name,
                isCreated: card.isCreated
            }));

            console.log(`取得したカード数: ${allCards.length}`);

            if (allCards.length === 0) {
                throw new Error('カードが取得できませんでした');
            }

            return allCards;
        } catch (error) {
            console.error('カード効果の取得に失敗:', error);
            console.error('エラーの詳細:', {
                gameId: this.gameId,
                playerId: this.playerId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async createNewGame(gameDocRef) {
        console.log('新規ゲーム作成開始');
        const cards = await this.getCardEffect();
        console.log('取得したカード:', cards);
        
        if (!Array.isArray(cards) || cards.length === 0) {
            throw new Error('有効なカードが取得できませんでした');
        }

        // カードをシャッフル
        const shuffledDeck = this.shuffleArray([...cards]);
        const initialHand = shuffledDeck.slice(0, 5);
        const remainingDeck = shuffledDeck.slice(5);

        const initialGameState = {
            players: {
                [this.playerId]: {
                    hp: 10,
                    deck: remainingDeck,
                    hand: initialHand,
                    handCount: 5,
                    godHandRemaining: 2
                }
            },
            currentTurn: this.playerId,
            turnTime: 60,
            status: 'waiting',
            tableNumber: this.tableNumber,
            createdAt: new Date().getTime()
        };
        
        console.log('初期ゲーム状態:', initialGameState);
        await window.setDoc(gameDocRef, initialGameState);
        console.log('初期状態の保存完了');
        return this.waitForOpponent(gameDocRef);
    }

    async joinExistingGame(gameDocRef, gameData) {
        console.log('既存ゲームに参加を試みます:', gameData);
        
        if (gameData.status === 'waiting' && !gameData.players[this.playerId]) {
            try {
                const cards = await this.getCardEffect();
                console.log('取得したカード:', cards);
                
                if (!Array.isArray(cards) || cards.length === 0) {
                    throw new Error('有効なカードが取得できませんでした');
                }

                // カード���シャッフル
                const shuffledDeck = this.shuffleArray([...cards]);
                const initialHand = shuffledDeck.slice(0, 5);
                const remainingDeck = shuffledDeck.slice(5);

                const playerData = {
                    hp: 10,
                    deck: remainingDeck,
                    hand: initialHand,
                    handCount: 5,
                    godHandRemaining: 2
                };

                // 更新するデータを準備
                const updateData = {
                    [`players.${this.playerId}`]: playerData,
                    status: 'playing'
                };

                console.log('ゲームデータを更新します:', updateData);
                await window.updateDoc(gameDocRef, updateData);

                // ローカルのゲーム状態も更新
                const updatedGameData = {
                    ...gameData,
                    players: {
                        ...gameData.players,
                        [this.playerId]: playerData
                    },
                    status: 'playing'
                };

                console.log('ゲーム状態を更新します:', updatedGameData);
                await this.updateGameState(updatedGameData);
                
                return updatedGameData;
            } catch (error) {
                console.error('ゲームへの参加に失敗:', error);
                throw error;
            }
        } else if (Object.keys(gameData.players).length >= 2) {
            console.error('テーブルが満席です');
            throw new Error('このテーブルは既に対戦が始まっています。');
        } else {
            console.error('不正な状態でのゲーム参加:', gameData);
            throw new Error('ゲームに参加できません。');
        }
    }

    setupTimer() {
        const timerElement = document.querySelector('.timer');
        if (!timerElement) return;

        let timeLeft = this.gameState.turnTime;
        
        // 既存のタイマーをクリア
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                timerElement.textContent = timeLeft;
            } else {
                // タイマーが0になった時の処理
                clearInterval(this.timerInterval);
                this.endTurn();
            }
        }, 1000);
    }

    endTurn() {
        // ターンの終了処理を実装
    }

    // playCard メソッドを修正
    async playCard(cardId) {
        try {
            console.log('カードをプレイ:', cardId);
            if (!this.gameState.isPlayerTurn) {
                console.log('自分のターンではありません');
                return;
            }

            // プレイするカードを手札から探す（IDで完全一致）
            const cardToPlay = this.gameState.playerHand.find(card => card.id === cardId);
            if (!cardToPlay) {
                console.error('プレイしようとしたカードが見つかりません:', cardId);
                return;
            }

            // 手札から特定のIDのカードのみを除去
            const newHand = this.gameState.playerHand.filter(card => card.id !== cardId);
            console.log('更新後の手札:', newHand);

            // バトルスロットにカードを配置
            const battleSlot = document.getElementById('player-battle-slot');
            if (battleSlot) {
                battleSlot.innerHTML = '';
                const cardElement = document.createElement('div');
                cardElement.className = `card ${cardToPlay.type}`;
                cardElement.dataset.cardId = cardToPlay.id; // IDを設定
                cardElement.innerHTML = `
                    <div class="card-content">
                        <div class="card-front">
                            <div class="card-name">${cardToPlay.name}</div>
                            <div class="card-effect">${cardToPlay.effect}</div>
                        </div>
                    </div>
                `;
                battleSlot.appendChild(cardElement);
            }

            // 相手のプレイヤーIDを取得
            const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);

            // Firestoreの状態を更新
            const gameRef = window.doc(db, 'games', this.gameId);
            await window.updateDoc(gameRef, {
                [`players.${this.playerId}.hand`]: newHand,
                [`players.${this.playerId}.handCount`]: newHand.length,
                'battleState.playerCard': cardToPlay,
                'currentTurn': opponentId,
                'turnTime': 60
            });

            // ローカルの状態を更新
            this.gameState.playerHand = newHand;
            this.battleState.playerCard = cardToPlay;
            this.gameState.isPlayerTurn = false;

            // タイマーをクリア
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }

            // UIを更新
            this.updateUI();

            console.log('カードのプレイ完了:', cardToPlay);
        } catch (error) {
            console.error('カードのプレイに失敗:', error);
            console.error('エラーの詳細:', {
                cardId,
                gameState: this.gameState,
                error: error.message,
                stack: error.stack
            });
        }
    }

    // drawCard メソッドを追加
    async drawCard() {
        try {
            if (this.gameState.playerDeck.length === 0) {
                console.log('山札が空です');
                return;
            }

            // 山札の一番上のカードを取得
            const drawnCard = this.gameState.playerDeck[0];
            const newDeck = this.gameState.playerDeck.slice(1);
            const newHand = [...this.gameState.playerHand, drawnCard];

            // Firestoreの状態を更新
            const gameRef = window.doc(db, 'games', this.gameId);
            await window.updateDoc(gameRef, {
                [`players.${this.playerId}.deck`]: newDeck,
                [`players.${this.playerId}.hand`]: newHand,
                [`players.${this.playerId}.handCount`]: newHand.length
            });

            // ローカルの状態を更新
            this.gameState.playerDeck = newDeck;
            this.gameState.playerHand = newHand;

            console.log('カードを1枚引きました:', drawnCard);
            this.updateUI();
        } catch (error) {
            console.error('カードを引く処理に失敗:', error);
            console.error('エラーの詳細:', {
                deckLength: this.gameState.playerDeck.length,
                handLength: this.gameState.playerHand.length,
                error: error.message,
                stack: error.stack
            });
        }
    }
}

// ゲームの初期化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOMContentLoaded イベント発火');
        const game = new Game();
        console.log('Gameインスタンス作成完了');
    } catch (error) {
        console.error('ゲーム初期化エラー:', error);
        console.error('エラーのスタックトレース:', error.stack);
        alert('ゲームの初期化に失敗しました。ページを再読み込みしてください。');
    }
});
