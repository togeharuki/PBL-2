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

// カードの裏面画像URL
const CARD_BACK_IMAGE = './カードの裏面.png';

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

// カードのスタイル
const cardStyle = {
    width: '100px',
    height: '140px',
    backgroundColor: '#fff',
    borderRadius: '5px',
    border: '2px solid #000',
    margin: '5px',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    overflow: 'hidden'
};

// カードを表示する関数
function renderCard(card, isFaceDown = false) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card-item';
    Object.assign(cardElement.style, cardStyle);

    if (isFaceDown) {
        // 裏面表示の場合
        cardElement.innerHTML = `
            <div style="width: 100%; height: 100%;">
                <img src="https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/card-back.jpg" 
                     alt="カード裏面" 
                     style="width: 100%; height: 100%; object-fit: contain;">
            </div>
        `;
    } else {
        // 表面表示の場合
        cardElement.innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column;">
                <div style="height: 70px; overflow: hidden;">
                    <img src="${card.image}" alt="${card.name}" 
                         style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="text-align: center; padding: 5px; background-color: #1a237e; color: white;">
                    ${card.name}
                </div>
                <div style="text-align: center; padding: 5px; flex-grow: 1; display: flex; align-items: center; justify-content: center;">
                    ${card.effect}
                </div>
            </div>
        `;
    }

    return cardElement;
}

// カードの効果をフォーマットする関数
function formatCardEffect(effect) {
    if (!effect) return '';
    
    // 攻撃カード（D）の場合
    if (effect.includes('D')) {
        return `${effect}`;
    }
    // 回復カード（H）の場合
    else if (effect.includes('H')) {
        return `${effect}`;
    }
    // それ以外の効果カードの場合
    return effect;
}

// カードの種類を判定する関数
function getCardType(effect) {
    if (!effect) return 'normal';
    if (effect.includes('D')) return 'attack';
    if (effect.includes('H')) return 'heal';
    return 'effect';
}

// カードグリッドを作成する関数
function createCardGrid(cards, containerId, isFaceDown = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center;
        padding: 10px;
    `;

    cards.forEach(card => {
        const cardElement = renderCard(card, isFaceDown);
        container.appendChild(cardElement);
    });
}

// カード画像のパスを取得する関数
function getCardImagePath(card) {
    if (card.image) return card.image;
    const cardName = encodeURIComponent(card.name);
    return `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${cardName}.jpg`;
}

export class Game {
    constructor() {
        console.log('Game クラスのコンストラクタを開始');
        
        this.battleState = {
            playerCard: null,
            opponentCard: null,
            isEffectCardUsed: false,
            battleResult: null,
            isAttacker: false,
            battlePhase: 'waiting',
            canPlayCard: false,
            attackerCard: null,
            defenderCard: null
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
            console.error('初期エラー:', error);
            throw error;
        }

        this.gameId = `${this.roomId}_table${this.tableNumber}`;
        console.log('生成されたゲームID:', this.gameId);

        // 初期化を非同期で実行
        this.initializeGame().catch(error => {
            console.error('ゲーム初期化中にエラーが発生:', error);
            alert('ゲームの初期化に失敗しました。ページを再読み込みしてください。');
        });

        // イベントリスナー設定
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
            const unsubscribe = window.onSnapshot(gameDocRef, async (doc) => {
                const gameData = doc.data();
                if (gameData && gameData.status === 'playing' && Object.keys(gameData.players).length === 2) {
                    console.log('対戦相手が見つかりました');
                    clearTimeout(timeoutId);
                    unsubscribe();
                    
                    // マッチング中のオーバーレイを非表示
                    const matchingOverlay = document.getElementById('matching-overlay');
                    if (matchingOverlay) {
                        matchingOverlay.style.display = 'none';
                    }

                    await this.updateGameState(gameData);
                    
                    // 自分のターンの場合、ドロー処理を実行
                    if (gameData.currentTurn === this.playerId) {
                        console.log('初期ドロー処理を実行');
                        await this.drawCard();
                        this.startBattlePhase();
                    }
                    
                    this.updateUI();
                    resolve(gameData);
                }
            }, (error) => {
                console.error('対戦相手待機中にエラーが発生:', error);
                reject(error);
            });

            // タイムアウト処理
            timeoutId = setTimeout(() => {
                unsubscribe();
                console.log('対戦相手待機タイムアウト');
                
                // ゲームドキュメントを削除
                window.deleteDoc(gameDocRef).catch(error => {
                    console.error('ゲームドキュメントの削除に失敗:', error);
                });
                
                reject(new Error('対戦相手が見つかりませんでした'));
            }, 120000);
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
                    
                    // 自分のターンが始まった時にカードをく
                    if (!previousTurn && this.gameState.isPlayerTurn) {
                        console.log('ターン開始時のドロー処理を実行');
                        await this.drawCard();
                        
                        // バトルェーズを開始
                        if (this.battleState.battlePhase === 'waiting') {
                            this.startBattlePhase();
                        }
                    }
                    
                    this.updateUI();
                }
            }
        }, (error) => {
            console.error('リアルタイムアップデートエラー:', error);
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

            console.log('プレイヤー状態:', {
                playerId: this.playerId,
                playerDeck: playerState.deck?.length,
                opponentId,
                opponentDeck: opponentState?.deck?.length
            });

            // バトル状態の更新
            if (gameData.battleState) {
                this.battleState = {
                    ...gameData.battleState,
                    canPlayCard: gameData.battleState.canPlayCard ?? (gameData.currentTurn === this.playerId)
                };
            }

            // ゲーム状態の更新
            this.gameState = {
                playerHp: playerState.hp || 10,
                opponentHp: opponentState?.hp || 10,
                playerDeck: Array.isArray(playerState.deck) ? playerState.deck : [],
                playerHand: Array.isArray(playerState.hand) ? playerState.hand : [],
                opponentHandCount: opponentState?.handCount || 0,
                opponentDeckCount: opponentState?.deck?.length || 0,
                isPlayerTurn: gameData.currentTurn === this.playerId,
                turnTime: gameData.turnTime || 60
            };

            console.log('更新後の���ーム態:', {
                isPlayerTurn: this.gameState.isPlayerTurn,
                playerDeckCount: this.gameState.playerDeck.length,
                opponentDeckCount: this.gameState.opponentDeckCount,
                handLength: this.gameState.playerHand.length,
                battlePhase: this.battleState.battlePhase
            });
        } catch (error) {
            console.error('ゲーム状態の更新に失敗:', error);
            throw error;
        }
    }

    updateUI() {
        try {
            console.log('UI更新開始:', {
                playerDeckCount: this.gameState.playerDeck.length,
                opponentDeckCount: this.gameState.opponentDeckCount,
                isPlayerTurn: this.gameState.isPlayerTurn
            });
            
            // HP表示の更新
            document.getElementById('player-hp').textContent = `${this.gameState.playerHp}/10`;
            document.getElementById('opponent-hp').textContent = `${this.gameState.opponentHp}/10`;

            // デッキ数の更新
            const playerDeckCount = document.getElementById('player-deck-count');
            const opponentDeckCount = document.getElementById('opponent-deck-count');
            
            if (playerDeckCount) {
                playerDeckCount.textContent = this.gameState.playerDeck.length.toString();
            }
            if (opponentDeckCount) {
                opponentDeckCount.textContent = this.gameState.opponentDeckCount.toString();
            }

            // 札の更新
            this.updateHandDisplay();

            // 相手の手札の更新
            this.updateOpponentHandDisplay();

            // バトルゾーンの更新
            this.updateBattleZone();

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
            console.error('エラーの詳細:', error.stack);
        }
    }

    updateOpponentHandDisplay() {
        const opponentHand = document.getElementById('opponent-hand');
        if (!opponentHand) return;

        opponentHand.innerHTML = '';
        
        // 札の位置を調整するためのコンテ
        const handContainer = document.createElement('div');
        handContainer.className = 'hand-container';
        
        // 相手の手札枚数分だけ裏向きのカードを表示
        const opponentHandCount = this.gameState.opponentHandCount || 5;
        for (let i = 0; i < opponentHandCount; i++) {
            const cardBack = document.createElement('div');
            cardBack.className = 'card card-back';
            // カードの位置を少しずつずらす
            cardBack.style.position = 'absolute';
            cardBack.style.left = `${i * 120}px`; // カード同士の間隔を調整
            cardBack.style.zIndex = i;
            
            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';
            cardContent.innerHTML = `<img src="./カードの裏面.png" alt="カードの裏面">`;
            
            cardBack.appendChild(cardContent);
            handContainer.appendChild(cardBack);
        }

        opponentHand.appendChild(handContainer);
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
                console.log('デッキが見つかないため、新規作成します');
                // 新規デッキを作成
                const newDeck = {
                    cards: initialCards.map(card => ({
                        ...card,
                        isCreated: false,
                        id: `${card.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        image: `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${encodeURIComponent(card.name)}.jpg`
                    }))
                };
                await window.setDoc(deckRef, newDeck);
                return newDeck.cards;
            }

            const deckData = deckDoc.data();
            if (!deckData.cards || !Array.isArray(deckData.cards)) {
                throw new Error('デッキのカードの形式が正です');
            }

            console.log('カード情報取得完了');
            const allCards = deckData.cards.map(card => ({
                id: card.id || `${card.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: card.type,
                effect: card.effect,
                name: card.name,
                isCreated: card.isCreated,
                image: card.image || `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${encodeURIComponent(card.name)}.jpg`
            }));

            console.log('取得したカード:', allCards);

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

        console.log('初期デッキ状態:', {
            totalCards: cards.length,
            initialHand: initialHand.length,
            remainingDeck: remainingDeck.length
        });

        const initialGameState = {
            players: {
                [this.playerId]: {
                    hp: 10,
                    deck: remainingDeck,
                    hand: initialHand,
                    handCount: 5
                }
            },
            currentTurn: this.playerId,
            turnTime: 60,
            status: 'waiting',
            battleState: {
                battlePhase: 'waiting',
                canPlayCard: true,
                isAttacker: true,
                attackerCard: null,
                defenderCard: null,
                isEffectCardUsed: false,
                battleResult: null
            },
            tableNumber: this.tableNumber,
            createdAt: new Date().getTime()
        };
        
        console.log('初期ゲーム状態:', initialGameState);
        await window.setDoc(gameDocRef, initialGameState);
        console.log('初期状態の保存完了');
        
        // 対戦相手を待つ
        const gameData = await this.waitForOpponent(gameDocRef);
        
        // バトルスタート表示を追加
        this.showBattleStart();
        
        return gameData;
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

                // カードをシャッフル
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

                // 既存バトル状態を取得
                const existingBattleState = gameData.battleState || {};

                // 更新するデータを準備
                const updateData = {
                    [`players.${this.playerId}`]: playerData,
                    status: 'playing',
                    currentTurn: gameData.currentTurn, // 既存のターンを維持
                    battleState: {
                        ...existingBattleState,
                        battlePhase: existingBattleState.battlePhase || 'waiting',
                        canPlayCard: existingBattleState.canPlayCard !== undefined ? existingBattleState.canPlayCard : true,
                        isAttacker: existingBattleState.isAttacker !== undefined ? existingBattleState.isAttacker : false,
                        attackerCard: existingBattleState.attackerCard || null,
                        defenderCard: existingBattleState.defenderCard || null,
                        isEffectCardUsed: existingBattleState.isEffectCardUsed || false,
                        battleResult: existingBattleState.battleResult || null
                    }
                };

                console.log('ゲームデータを更新します:', updateData);
                await window.updateDoc(gameDocRef, updateData);

                // ローカルのゲーム状態を更新
                const updatedGameData = {
                    ...gameData,
                    players: {
                        ...gameData.players,
                        [this.playerId]: playerData
                    },
                    status: 'playing',
                    currentTurn: gameData.currentTurn,
                    battleState: updateData.battleState
                };

                console.log('ゲーム状態を更新します:', updatedGameData);
                await this.updateGameState(updatedGameData);

                // バトルスタート表示を追加
                this.showBattleStart();

                // 自分のターンの場合は初期ドローを実行
                if (updatedGameData.currentTurn === this.playerId) {
                    console.log('加プレイヤーの初期ドロー処理を実行');
                    await this.drawCard();
                    this.startBattlePhase();
                }
                
                return updatedGameData;
            } catch (error) {
                console.error('ゲームへの参加に失敗:', error);
                throw error;
            }
        } else if (Object.keys(gameData.players).length >= 2) {
            console.error('テーブルが席です');
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

        this.timerInterval = setInterval(async () => {
            if (timeLeft > 0) {
                timeLeft--;
                timerElement.textContent = timeLeft;
                
                // り5になったら警告表示
                if (timeLeft <= 5) {
                    timerElement.style.color = 'red';
                }
            } else {
                clearInterval(this.timerInterval);
                timerElement.style.color = ''; // 色をリセット
                
                // 自分のターンの場合のみ、自動的にカードを出す
                if (this.gameState.isPlayerTurn) {
                    console.log('タイムアップ - 自動的にカードを出ます');
                    await this.endTurn();
                }
            }
        }, 1000);
    }

    async endTurn() {
        console.log('ターン終了処理開始:', {
            isPlayerTurn: this.gameState.isPlayerTurn,
            battlePhase: this.battleState.battlePhase,
            playerHand: this.gameState.playerHand
        });
        
        // 自分のターンでない場合は何しない
        if (!this.gameState.isPlayerTurn) {
            console.log('自分のターンではないため、処理をスキップ');
            return;
        }

        try {
            // タイマーをクリア
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }

            // 手札がある場合、切なカード選択してす
            if (this.gameState.playerHand.length > 0) {
                // バトルフェーズに応じて適切なカードを選択
                let validCards;
                if (this.battleState.battlePhase === 'defense') {
                    // 防御フェーズの場合は防御カードを優先
                    validCards = this.gameState.playerHand.filter(card => card.type === 'defense');
                    if (validCards.length === 0) {
                        // 防御カードがない場合は全カードから選択
                        validCards = this.gameState.playerHand;
                    }
                } else {
                    // 攻撃フェーズまたは待機ェーズの場合は攻撃カードを優先
                    validCards = this.gameState.playerHand.filter(card => card.type === 'attack');
                    if (validCards.length === 0) {
                        // 攻撃カードがない場合は全カードから選択
                        validCards = this.gameState.playerHand;
                    }
                }

                const randomIndex = Math.floor(Math.random() * validCards.length);
                const randomCard = validCards[randomIndex];
                console.log('選択された��ード:', randomCard);

                // カードプレイ
                await this.playCard(randomCard);
            } else {
                console.log('手札がないため、ターンを終了します');
                // 手札がない場合は直接ターンを終了
                const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);
                const gameRef = window.doc(db, 'games', this.gameId);
                
                const updateData = {
                    currentTurn: opponentId,
                    turnTime: 60
                };

                // バトルフェーズが'waiting'でない場合は、フェーズも更新
                if (this.battleState.battlePhase !== 'waiting') {
                    updateData.battleState = {
                        ...this.battleState,
                        battlePhase: 'waiting',
                        canPlayCard: true
                    };
                }

                await window.updateDoc(gameRef, updateData);
            }
        } catch (error) {
            console.error('ターン終了処理でエラーが発生:', error);
            console.error('エラーの詳細:', {
                error: error.message,
                stack: error.stack,
                gameState: this.gameState,
                battleState: this.battleState
            });
        }
    }

    // バトルフェーズの開始
    startBattlePhase() {
        console.log('バトルフェーズ開始:', {
            playerId: this.playerId,
            isPlayerTurn: this.gameState.isPlayerTurn,
            currentTurn: this.gameData.currentTurn
        });
        
        // 自分が先攻プレイヤーかうかを判断
        const isFirstPlayer = Object.keys(this.gameData.players)[0] === this.playerId;
        
        // 新しいバトル状態を作成
        const newBattleState = {
            battlePhase: this.gameState.isPlayerTurn ? 'attack' : 'defense',
            canPlayCard: this.gameState.isPlayerTurn,
            isAttacker: isFirstPlayer, // 先攻プレイヤーが攻撃側
            attackerCard: null,
            defenderCard: null,
            isEffectCardUsed: false,
            battleResult: null
        };

        console.log('作成するバトル態:', newBattleState);

        // ローカルの状態を更新
        this.battleState = newBattleState;

        // Firestoreの状態を更新
        const gameRef = window.doc(db, 'games', this.gameId);
        const updateData = {
            battleState: newBattleState
        };

        console.log('バトルフェー更新データ:', updateData);

        window.updateDoc(gameRef, updateData)
            .then(() => {
                console.log('バトルフェーズの状態を更新しました:', this.battleState);
                
                // UIの更新
                this.updateUI();
            })
            .catch(error => {
                console.error('バトルフェーズの��新に失敗:', error);
                console.error('エラーの詳細:', {
                    error: error.message,
                    stack: error.stack,
                    gameState: this.gameState,
                    battleState: this.battleState
                });
            });
    }

    // カードをプレイする処理
    async playCard(card) {
        try {
            console.log('カードをプレイ:', card);

            // カードを出せない状態かチェック
            if (!this.gameState.isPlayerTurn) {
                console.log('自分のターンではありません');
                return;
            }

            // プレイするカードを手札から探す
            let cardToPlay = typeof card === 'object' ? card : this.gameState.playerHand.find(c => c.id === card);
            if (!cardToPlay) {
                console.error('プレイしようとしたカードが見つかりません:', card);
                return;
            }

            // 手札から特定のカードのみを除去
            const newHand = this.gameState.playerHand.filter(c => c.id !== cardToPlay.id);

            // 相手のプレイヤーIDを取得
            const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);

            // バトルカードの場合
            if (cardToPlay.effect && (cardToPlay.effect.includes('D') || cardToPlay.effect.includes('H'))) {
                // 攻撃側の場合
                if (this.battleState.battlePhase === 'attack' || this.battleState.battlePhase === 'waiting') {
                    // 攻撃カードを出す
                    await this.updateGameState({
                        [`players.${this.playerId}.hand`]: newHand,
                        [`players.${this.playerId}.handCount`]: newHand.length,
                        'battleState.battlePhase': 'defense',
                        'battleState.attackerCard': cardToPlay,
                        'currentTurn': opponentId,
                        'turnTime': 60
                    });
                }
                // 守備側の場合
                else if (this.battleState.battlePhase === 'defense') {
                    // 守備カードを出す
                    await this.updateGameState({
                        [`players.${this.playerId}.hand`]: newHand,
                        [`players.${this.playerId}.handCount`]: newHand.length,
                        'battleState.battlePhase': 'result',
                        'battleState.defenderCard': cardToPlay
                    });

                    // バトルフェーズを実行
                    await this.executeBattlePhase();
                }
            }
            // 効果カードの場合
            else {
                await this.activateEffectCard(cardToPlay, newHand);
            }

        } catch (error) {
            console.error('カードのプレイに失敗:', error);
        }
    }

    // バトルフェーズの実行
    async executeBattlePhase() {
        console.log('バトルフェーズを開始します');

        // 両方のカードが出されているか確認
        if (!this.battleState.attackerCard || !this.battleState.defenderCard) {
            console.log('両方のカードが出されていません');
            return;
        }

        // カードを表にする（アニメーション付き）
        await this.revealBattleCards();

        // 数値の比較とダメージ計算
        const attackValue = this.extractCardValue(this.battleState.attackerCard.effect);
        const defendValue = this.extractCardValue(this.battleState.defenderCard.effect);
        
        console.log('バトル結果:', {
            attackValue,
            defendValue,
            isPlayerAttacker: this.battleState.isAttacker
        });

        let damage = 0;
        if (attackValue > defendValue) {
            damage = attackValue - defendValue;
            // ダメージを与える
            await this.applyBattleDamage(damage);
        }

        // バトル結果の表示
        await this.showBattleResult(attackValue, defendValue, damage);

        // ターンの切り替え
        await this.switchTurns();
    }

    // カームの状態を更新
    async updateGameState(updates) {
        const gameRef = window.doc(db, 'games', this.gameId);
        await window.updateDoc(gameRef, updates);
    }

    // カードの数値を抽出
    extractCardValue(effect) {
        if (!effect) return 0;
        const match = effect.match(/D(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    // ターンの切り替え
    async switchTurns() {
        // 攻守を入れ替え
        const newIsAttacker = !this.battleState.isAttacker;
        const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);

        // ゲームの状態を更新
        await this.updateGameState({
            'battleState.battlePhase': 'attack',
            'battleState.attackerCard': null,
            'battleState.defenderCard': null,
            'battleState.isAttacker': newIsAttacker,
            'currentTurn': opponentId,
            'turnTime': 60
        });

        // UIを更新
        this.updateUI();
        this.updateTurnIndicator();
    }

    // ターン表示の更新
    updateTurnIndicator() {
        const turnIndicator = document.getElementById('turn-indicator');
        if (!turnIndicator) return;

        const isAttacker = this.battleState.isAttacker;
        const isPlayerTurn = this.gameState.isPlayerTurn;
        let turnText = '';
        let turnClass = '';

        if (isPlayerTurn) {
            turnText = isAttacker ? 'あなたのターン（攻撃側）' : 'あなたのターン（守備側）';
            turnClass = isAttacker ? 'turn-indicator attacker' : 'turn-indicator defender';
        } else {
            turnText = isAttacker ? '相手のターン（守備側）' : '相手のターン（攻撃側）';
            turnClass = isAttacker ? 'turn-indicator defender' : 'turn-indicator attacker';
        }

        turnIndicator.textContent = turnText;
        turnIndicator.className = turnClass;
    }

    // バトル結果の計算
    async calculateBattleResult() {
        const attackerCard = this.battleState.attackerCard;
        const defenderCard = this.battleState.defenderCard;

        if (!attackerCard || !defenderCard) {
            console.error('バトル結果の計算に必要なカードが不足しています');
            return;
        }

        console.log('バトル結果計算開始:', {
            attackerCard,
            defenderCard
        });

        // カードの数値を取得
        const attackValue = parseInt(attackerCard.value) || 0;
        const defendValue = parseInt(defenderCard.value) || 0;

        console.log('バトル数値:', {
            attackValue,
            defendValue
        });

        let damage = 0;
        if (attackValue > defendValue) {
            // 攻撃側の値が守備値を超過している場合、その差分がダメージとなる
            damage = attackValue - defendValue;
        }

        console.log('計算されたダメージ:', damage);

        // ダメージの適用
        await this.applyDamage(damage);
    }

    // ダメージの適用
    async applyDamage(damage) {
        const gameRef = window.doc(db, 'games', this.gameId);
        const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);

        // ダメージを受けるプレイヤーのHPを更新
        const targetPlayerId = this.battleState.isAttacker ? opponentId : this.playerId;
        const currentHp = this.gameData.players[targetPlayerId].hp;
        const newHp = Math.max(0, currentHp - damage);

        console.log('ダメージ適用:', {
            targetPlayerId,
            currentHp,
            damage,
            newHp
        });

        // 新しいバトル状態を作成
        const newBattleState = {
            battlePhase: 'waiting',
            canPlayCard: true,
            isAttacker: !this.battleState.isAttacker,
            attackerCard: null,
            defenderCard: null,
            isEffectCardUsed: false,
            battleResult: {
                damage: damage,
                targetPlayer: targetPlayerId,
                attackerCard: this.battleState.attackerCard,
                defenderCard: this.battleState.defenderCard
            }
        };

        // Firestoreの状態を更新
        await window.updateDoc(gameRef, {
            [`players.${targetPlayerId}.hp`]: newHp,
            battleState: newBattleState,
            currentTurn: opponentId
        });

        // ローカルの状態を更新
        this.battleState = newBattleState;
        this.gameState.isPlayerTurn = false;

        console.log('バトル終了:', {
            damage,
            targetPlayer: targetPlayerId,
            newHp,
            nextTurn: 'opponent'
        });

        // UIを更新
        this.updateUI();
    }

    // バトルフェーズの終了
    async endBattlePhase() {
        // 攻守の入れ替
        const nextTurnPlayerId = Object.keys(this.gameData.players).find(id => id !== this.playerId);

        // バトルゾーンのクリアとターンの切り替え
        const gameRef = window.doc(db, 'games', this.gameId);
        await window.updateDoc(gameRef, {
            'battleState.attackerCard': null,
            'battleState.defenderCard': null,
            'battleState.battlePhase': 'waiting',
            'battleState.battleResult': null,
            'currentTurn': nextTurnPlayerId,
            'turnTime': 60
        });

        // 新しいターンの開始
        if (nextTurnPlayerId === this.playerId) {
            this.startBattlePhase();
        }
    }

    // drawCard メソドを追加
    async drawCard() {
        try {
            if (this.gameState.playerDeck.length === 0) {
                console.log('山札が空です');
                return;
            }

            // 山札の一番上カードを取得
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

    // バトルゾーンの表示を更新するメソッド
    updateBattleZone() {
        // プレイヤーのバトルゾーン更新
        const playerBattleSlot = document.getElementById('player-battle-slot');
        if (playerBattleSlot) {
            playerBattleSlot.innerHTML = '';
            
            // バトルゾーンのコンテナを作成
            const battleZoneContainer = document.createElement('div');
            battleZoneContainer.style.cssText = `
                display: flex;
                justify-content: center;
                align-items: center;
                width: 100%;
                padding: 10px;
                position: relative;
                gap: 20px;
            `;

            // 左側のバトルゾーン（攻撃ゾーン）
            const leftZone = document.createElement('div');
            leftZone.className = 'attacker-zone';
            leftZone.style.cssText = `
                width: 200px;
                height: 280px;
                background-color: rgba(0, 0, 0, 0.5);
                border: 2px dashed rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
            `;

            // 攻撃アイコン
            const attackIcon = document.createElement('div');
            attackIcon.style.cssText = `
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                color: #ff4444;
                font-size: 24px;
            `;
            attackIcon.innerHTML = '⚔️';
            leftZone.appendChild(attackIcon);

            // 右側のバトルゾーン（守備ゾーン）
            const rightZone = document.createElement('div');
            rightZone.className = 'defender-zone';
            rightZone.style.cssText = `
                width: 200px;
                height: 280px;
                background-color: rgba(0, 0, 0, 0.5);
                border: 2px dashed rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
            `;

            // 守備アイコン
            const defenseIcon = document.createElement('div');
            defenseIcon.style.cssText = `
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                color: #4444ff;
                font-size: 24px;
            `;
            defenseIcon.innerHTML = '🛡️';
            rightZone.appendChild(defenseIcon);

            // 中央の情報表示
            const centerInfo = document.createElement('div');
            centerInfo.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                z-index: 10;
            `;

            // ターン表示
            const turnDisplay = document.createElement('div');
            turnDisplay.style.cssText = `
                background-color: #ff4444;
                color: white;
                padding: 5px 15px;
                border-radius: 4px;
                margin-bottom: 10px;
                font-size: 14px;
            `;
            turnDisplay.textContent = this.gameState.isPlayerTurn ? '相手のターン' : 'あなたのターン';

            // タイマー表示
            const timerDisplay = document.createElement('div');
            timerDisplay.style.cssText = `
                color: #ffd700;
                font-size: 24px;
                font-weight: bold;
            `;
            timerDisplay.textContent = this.gameState.turnTime;

            centerInfo.appendChild(turnDisplay);
            centerInfo.appendChild(timerDisplay);

            // カードの配置
            if (this.battleState.attackerCard || this.battleState.defenderCard) {
                const cardElement = document.createElement('div');
                cardElement.className = 'card card-back';
                cardElement.style.cssText = `
                    width: 180px;
                    height: 250px;
                    background-color: #1a1a1a;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                `;

                // プレイヤーが攻撃側の場合
                if (this.battleState.isAttacker) {
                    if (this.battleState.attackerCard) {
                        leftZone.appendChild(cardElement.cloneNode(true));
                    }
                } else {
                    if (this.battleState.defenderCard) {
                        rightZone.appendChild(cardElement.cloneNode(true));
                    }
                }
            }

            battleZoneContainer.appendChild(leftZone);
            battleZoneContainer.appendChild(centerInfo);
            battleZoneContainer.appendChild(rightZone);
            playerBattleSlot.appendChild(battleZoneContainer);
        }

        // 相手のバトルゾーンも同様に更新
        // ... 同様のコードで相手のバトルゾーンを更新
    }

    // バトルスタート表示用新しいメソッドを追加
    showBattleStart() {
        // バトルスタートのオーバーレイを作成
        const battleStartOverlay = document.createElement('div');
        battleStartOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        // バトルスタートのテキストを作成
        const battleStartText = document.createElement('div');
        battleStartText.textContent = 'バトルスタート！';
        battleStartText.style.cssText = `
            color: #fff;
            font-size: 48px;
            font-weight: bold;
            text-shadow: 0 0 10px #ff0, 0 0 20px #ff0, 0 0 30px #ff0;
            animation: battleStart 1.5s ease-out forwards;
        `;

        // アニメーションのスイルを追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes battleStart {
                0% {
                    transform: scale(0.5);
                    opacity: 0;
                }
                50% {
                    transform: scale(1.2);
                    opacity: 1;
                }
                100% {
                    transform: scale(1);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        // オーバーレイにテキストを追加
        battleStartOverlay.appendChild(battleStartText);
        document.body.appendChild(battleStartOverlay);

        // アニメーション終了後にオーバーレイを削除
        setTimeout(() => {
            battleStartOverlay.remove();
        }, 1500);
    }

    // カードを表示する関数
    createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.type}`;
        cardElement.draggable = true;
        cardElement.dataset.cardId = card.id;
        cardElement.style.width = '100px';
        cardElement.style.height = '140px';
        cardElement.style.backgroundColor = '#fff';
        cardElement.style.border = '1px solid #000';
        cardElement.style.borderRadius = '5px';
        cardElement.style.display = 'flex';
        cardElement.style.flexDirection = 'column';
        cardElement.style.position = 'relative';
        cardElement.style.overflow = 'hidden';

        // カードの内容を表示（写真と名前のみ）
        cardElement.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column;">
                <div style="height: 100px; overflow: hidden;">
                    <img src="${card.image}" 
                         alt="${card.name}" 
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.src='https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/default.jpg'">
                </div>
                <div style="text-align: center; padding: 5px; font-size: 14px; background-color: #1a237e; color: white;">
                    ${card.name}
                </div>
            </div>
        `;

        // カードクリックイベントの追加
        cardElement.addEventListener('click', () => {
            this.showCardDetail(card);
        });

        // カードがドラッグ可能な場合のスタイル
        if (this.gameState.isPlayerTurn) {
            cardElement.style.cursor = 'pointer';
        }

        return cardElement;
    }

    // 札の表示を更新する関数
    updateHandDisplay() {
        const playerHand = document.getElementById('player-hand');
        if (!playerHand) return;

        playerHand.innerHTML = '';
        
        const handContainer = document.createElement('div');
        handContainer.className = 'hand-container';
        handContainer.style.position = 'relative';
        handContainer.style.height = '150px';
        handContainer.style.margin = '10px 0';
        
        this.gameState.playerHand.forEach((card, index) => {
            const cardElement = this.createCardElement(card);
            
            // カードの位置を調整
            cardElement.style.position = 'absolute';
            cardElement.style.left = `${index * 120}px`;
            cardElement.style.zIndex = index;

            handContainer.appendChild(cardElement);
        });

        playerHand.appendChild(handContainer);
    }

    // カードの効果をフォーマットするメソッド
    formatCardEffect(effect) {
        if (!effect) return '';
        
        // 攻撃カード（D）の場合
        if (effect.includes('D')) {
            return `${effect}`;
        }
        // 回復カード（H）の場合
        else if (effect.includes('H')) {
            return `${effect}`;
        }
        // それ以外の効果カードの場合
        return effect;
    }

    // カード詳細を表示する関数
    async showCardDetail(card) {
        // 既存モーダルがあれば削除
        const existingModal = document.querySelector('.card-detail-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // カードの説明を取得
        const description = await this.getCardDescription(card);

        // モーダルの作成
        const modal = document.createElement('div');
        modal.className = 'card-detail-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            z-index: 1000;
            width: 300px;
            max-height: 80vh;
            overflow-y: auto;
        `;

        // カードの種類に基づいてボタンのテキストを設定
        const isBattleCard = card.effect && (card.effect.includes('D') || card.effect.includes('H'));
        const buttonText = isBattleCard ? '召喚' : '発動';

        // モーダルの内容
        modal.innerHTML = `
            <div style="text-align: center;">
                <div style="margin-bottom: 20px;">
                    <img src="${card.image}" 
                         alt="${card.name}" 
                         style="width: 200px; height: 200px; object-fit: cover;"
                         onerror="this.src='https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/default.jpg'">
                </div>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #1a237e; font-size: 18px;">${card.name}</h3>
                    <div style="border-top: 1px solid #ddd; padding-top: 10px;">
                        <p style="margin: 5px 0; font-size: 14px; color: #000;">
                            <strong style="color: #000;">効果:</strong> <span style="color: #000;">${card.effect || '効果なし'}</span>
                        </p>
                        <p style="margin: 5px 0; font-size: 14px; color: #000;">
                            <strong style="color: #000;">説明:</strong> <span style="color: #000;">${description}</span>
                        </p>
                    </div>
                </div>
                <div style="display: flex; justify-content: center; gap: 10px;">
                    <button class="action-button" style="
                        background-color: #1a237e;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                        min-width: 100px;
                    ">${buttonText}</button>
                    <button class="close-button" style="
                        background-color: #666;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                        min-width: 100px;
                    ">閉じる</button>
                </div>
            </div>
        `;

        // 背景オーバーレイの作成
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 999;
        `;

        // ボタンのイベントリスナー
        const actionButton = modal.querySelector('.action-button');
        actionButton.addEventListener('click', () => {
            if (isBattleCard) {
                // バトルカードの場合
                this.playCard(card);
            } else {
                // 効果カードの場合
                this.activateEffectCard(card);
            }
            modal.remove();
            overlay.remove();
        });

        const closeButton = modal.querySelector('.close-button');
        closeButton.addEventListener('click', () => {
            modal.remove();
            overlay.remove();
        });

        // モーダルと背景を表示
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }

    // カードの説明を取得する関数
    async getCardDescription(card) {
        if (!card.effect) return '効果なし';

        try {
            // Deckコレクションからカード情報を取得
            const snapshot = await window.getDocs(window.collection(db, 'Deck'));
            let explanation = null;

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.name === card.name && data.explanation) {
                    explanation = data.explanation;
                }
            });

            if (explanation) {
                return explanation;
            }

            // Deckコレクションに説明がない場合は、デフォルトの説明を生成
            // 攻撃カードの場合（例：⚡ D3 ⚡）
            const damageMatch = card.effect.match(/D(\d+)/);
            if (damageMatch) {
                return `相手に${damageMatch[1]}ダメージを与える`;
            }

            // 回復カードの場合（例：✨ H2 ✨）
            const healMatch = card.effect.match(/H(\d+)/);
            if (healMatch) {
                return `HPを${healMatch[1]}回復する`;
            }

            // 上記以外の場合は効果をそのまま返す
            return card.effect;
        } catch (error) {
            console.error('カードの説明の取得に失敗:', error);
            return card.effect;
        }
    }

    // 効果カードを発動する関数
    async activateEffectCard(card) {
        try {
            console.log('効果カードを発動:', card);

            // 効果の種類を判断
            if (card.effect.includes('ドロー')) {
                await this.drawCard();
            } else if (card.effect.includes('強制')) {
                // 強制ダメージ効果の処理
                const damageMatch = card.effect.match(/\d+/);
                const damage = damageMatch ? parseInt(damageMatch[0]) : 0;
                await this.applyDamage(damage);
            } else {
                // 攻撃カードの場（例：⚡ D3 ⚡）
                const damageMatch = card.effect.match(/D(\d+)/);
                if (damageMatch) {
                    const damage = parseInt(damageMatch[1]);
                    await this.applyDamage(damage);
                } else {
                    console.log('未実装の効果:', card.effect);
                }
            }

            // カードを手札から除去
            const newHand = this.gameState.playerHand.filter(c => c.id !== card.id);
            
            // Firestoreの状態を更新
            const gameRef = window.doc(db, 'games', this.gameId);
            await window.updateDoc(gameRef, {
                [`players.${this.playerId}.hand`]: newHand,
                [`players.${this.playerId}.handCount`]: newHand.length
            });

            // ローカルの状態を更新
            this.gameState.playerHand = newHand;
            this.updateUI();

        } catch (error) {
            console.error('効果カードの発動に失敗:', error);
        }
    }

    // バトルカードを表にする
    async revealBattleCards() {
        // アニメーション付きでカードを表する処理
        const attackerCard = document.querySelector('.attacker-zone .card');
        const defenderCard = document.querySelector('.defender-zone .card');

        if (attackerCard) {
            attackerCard.style.transform = 'rotateY(180deg)';
            attackerCard.innerHTML = `
                <div class="card-content">
                    <img src="${this.battleState.attackerCard.image}" alt="${this.battleState.attackerCard.name}">
                    <div class="card-effect">${this.battleState.attackerCard.effect}</div>
                </div>
            `;
        }

        if (defenderCard) {
            defenderCard.style.transform = 'rotateY(180deg)';
            defenderCard.innerHTML = `
                <div class="card-content">
                    <img src="${this.battleState.defenderCard.image}" alt="${this.battleState.defenderCard.name}">
                    <div class="card-effect">${this.battleState.defenderCard.effect}</div>
                </div>
            `;
        }

        // アニメーションの完了を待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // バトル結果を表示
    async showBattleResult(attackValue, defendValue, damage) {
        const resultOverlay = document.createElement('div');
        resultOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const resultContent = document.createElement('div');
        resultContent.style.cssText = `
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        `;

        let resultText = `
            <h2>バトル結果</h2>
            <p>攻撃力: ${attackValue}</p>
            <p>守備力: ${defendValue}</p>
        `;

        if (damage > 0) {
            resultText += `<p class="damage">ダメージ: ${damage}</p>`;
        } else {
            resultText += `<p>ダメージなし</p>`;
        }

        resultContent.innerHTML = resultText;
        resultOverlay.appendChild(resultContent);
        document.body.appendChild(resultOverlay);

        // 3秒後に結果表示を消す
        await new Promise(resolve => setTimeout(resolve, 3000));
        resultOverlay.remove();
    }

    // ダメージを適用
    async applyBattleDamage(damage) {
        // ダメージを受けるプレイヤーを特定
        const targetPlayerId = this.battleState.isAttacker ? this.playerId : Object.keys(this.gameData.players).find(id => id !== this.playerId);
        
        // 現在のHPを取得
        const currentHp = this.gameData.players[targetPlayerId].hp;
        const newHp = Math.max(0, currentHp - damage);

        // Firestoreの状態を更新
        const gameRef = window.doc(db, 'games', this.gameId);
        await window.updateDoc(gameRef, {
            [`players.${targetPlayerId}.hp`]: newHp
        });

        // ローカルの状態も更新
        if (targetPlayerId === this.playerId) {
            this.gameState.playerHp = newHp;
        } else {
            this.gameState.opponentHp = newHp;
        }
    }
}

// ゲムの初期化です
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOMContentLoaded イベント発火');
        const game = new Game();
        console.log('Gameインスンス作成完了');
    } catch (error) {
        console.error('ゲーム初期化エラー:', error);
        console.error('エラーのスタックトレース:', error.stack);
        alert('ゲームの初期化に失敗しました。ページを再読み込みみしてください。');
    }
});
