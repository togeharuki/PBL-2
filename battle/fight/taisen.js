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
        type: "attack",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/斬撃.jpg"
    },
    {
        name: "突撃",
        effect: "ダメージ4",
        type: "attack",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/突撃.jpg"
    },
    {
        name: "大斬撃",
        effect: "ダメージ5",
        type: "attack",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/大斬撃.jpg"
    },
    {
        name: "連撃",
        effect: "ダメージ2x2",
        type: "attack",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/連撃.jpg"
    },
    // 防御カード
    {
        name: "盾",
        effect: "防御+2",
        type: "defense",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/盾.jpg"
    },
    {
        name: "鉄壁",
        effect: "防御+3",
        type: "defense",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/鉄壁.jpg"
    },
    // 回復カード
    {
        name: "回復",
        effect: "HP+2",
        type: "heal",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/回復.jpg"
    },
    {
        name: "大回復",
        effect: "HP+3",
        type: "heal",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/大回復.jpg"
    },
    // 特殊効果カード
    {
        name: "ドロー",
        effect: "カードを1枚引く",
        type: "effect",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/ドロー.jpg"
    },
    {
        name: "強化",
        effect: "次の攻撃+2",
        type: "effect",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/強化.jpg"
    },
    // 追加の攻撃カード
    {
        name: "炎撃",
        effect: "ダメージ4+燃焼1",
        type: "attack",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/炎撃.jpg"
    },
    {
        name: "氷撃",
        effect: "ダメージ3+スロー",
        type: "attack",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/氷撃.jpg"
    },
    // 追加の防御カード
    {
        name: "反射",
        effect: "防御+2+反射1",
        type: "defense",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/反射.jpg"
    },
    {
        name: "回避",
        effect: "次の攻撃回避",
        type: "defense",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/回避.jpg"
    },
    // 追加の効果カード
    {
        name: "強奪",
        effect: "相手の手札を1枚奪う",
        type: "effect",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/強奪.jpg"
    }
];
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
            console.error('初期化エラー:', error);
            throw error;
        }

        this.gameId = `${this.roomId}_table${this.tableNumber}`;
        console.log('生成されたゲームID:', this.gameId);

        // 初期化を非同期で実行
        this.initializeGame().catch(error => {
            console.error('ゲーム初期化中にエラーが発生:', error);
            alert('ゲームの初期化に失敗しました。ページを再読み込みしてください。');
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
                    
                    // 自分のターンが始まった時にカードを引く
                    if (!previousTurn && this.gameState.isPlayerTurn) {
                        console.log('ターン開始時のドロー処理を実行');
                        await this.drawCard();
                        
                        // バトルフェーズを開始
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

            console.log('更新後のゲーム状態:', {
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

            // 手札の更新
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
                        <div class="card-image">
                            <img src="${card.image}" alt="${card.name}" 
                                 onerror="this.src='https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/default/card-back.jpg'">
                        </div>
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
        
        const handContainer = document.createElement('div');
        handContainer.className = 'hand-container';
        
        const opponentHandCount = this.gameState.opponentHandCount || 0;
        for (let i = 0; i < opponentHandCount; i++) {
            const cardBack = document.createElement('div');
            cardBack.className = 'card card-back';
            cardBack.style.position = 'absolute';
            cardBack.style.left = `${i * 120}px`;
            cardBack.style.zIndex = i;
            
            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';
            cardContent.innerHTML = `
                <img src="https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/default/card-back.jpg" 
                     alt="カードの裏面"
                     onerror="this.src='https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/default/card-back.jpg'">
            `;
            
            cardBack.appendChild(cardContent);
            handContainer.appendChild(cardBack);
        }

        opponentHand.appendChild(handContainer);
    }

    updateBattleZone() {
        // プレイヤーのバトルゾーン更新
        const playerBattleSlot = document.getElementById('player-battle-slot');
        if (playerBattleSlot) {
            playerBattleSlot.innerHTML = '';
            const playerCard = this.battleState.isAttacker ? this.battleState.attackerCard : this.battleState.defenderCard;
            if (playerCard) {
                const cardElement = document.createElement('div');
                cardElement.className = `card ${playerCard.type}`;
                cardElement.innerHTML = `
                    <div class="card-content">
                        <div class="card-front">
                            <div class="card-image">
                                <img src="${playerCard.image || `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${playerCard.name}.jpg`}" 
                                     alt="${playerCard.name}"
                                     onerror="this.src='https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/default/card-back.jpg'">
                            </div>
                            <div class="card-name">${playerCard.name}</div>
                            <div class="card-effect">${playerCard.effect}</div>
                        </div>
                    </div>
                `;
                playerBattleSlot.appendChild(cardElement);
            }
        }

        // 相手のバトルゾーン更新
        const opponentBattleSlot = document.getElementById('opponent-battle-slot');
        if (opponentBattleSlot) {
            opponentBattleSlot.innerHTML = '';
            const opponentCard = this.battleState.isAttacker ? this.battleState.defenderCard : this.battleState.attackerCard;
            if (opponentCard) {
                const cardElement = document.createElement('div');
                cardElement.className = 'card card-back';
                cardElement.innerHTML = `
                    <div class="card-content">
                        <img src="https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/default/card-back.jpg" 
                             alt="カードの裏面"
                             onerror="this.src='https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/default/card-back.jpg'">
                    </div>
                `;
                opponentBattleSlot.appendChild(cardElement);
            }
        }
    }
    // バトルスタート表示用のメソッド
    showBattleStart() {
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

        const battleStartText = document.createElement('div');
        battleStartText.textContent = 'バトルスタート！';
        battleStartText.style.cssText = `
            color: #fff;
            font-size: 48px;
            font-weight: bold;
            text-shadow: 0 0 10px #ff0, 0 0 20px #ff0, 0 0 30px #ff0;
            animation: battleStart 1.5s ease-out forwards;
        `;

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

        battleStartOverlay.appendChild(battleStartText);
        document.body.appendChild(battleStartOverlay);

        setTimeout(() => {
            battleStartOverlay.remove();
        }, 1500);
    }

    createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.type}`;
        cardElement.draggable = true;
        cardElement.dataset.cardId = card.id;

        const cardContent = document.createElement('div');
        cardContent.className = 'card-content';

        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        cardFront.innerHTML = `
            <div class="card-image">
                <img src="${card.image || `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${card.name}.jpg`}" 
                     alt="${card.name}"
                     onerror="this.src='https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/default/card-back.jpg'">
            </div>
            <div class="card-name">${card.name}</div>
            <div class="card-effect">${card.effect}</div>
        `;

        cardContent.appendChild(cardFront);
        cardElement.appendChild(cardContent);

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
}

// ゲームの初期化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOMContentLoaded イベント発火');
        const game = new Game();
        console.log('Gameインスタンス作成完了');

        // 画像のプリロード
        initialCards.forEach(card => {
            const img = new Image();
            img.src = card.image || `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${card.name}.jpg`;
            img.onerror = () => {
                img.src = 'https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/default/card-back.jpg';
            };
        });

    } catch (error) {
        console.error('ゲーム初期化エラー:', error);
        console.error('エラーのスタックトレース:', error.stack);
        alert('ゲームの初期化に失敗しました。ページを再読み込みしてください。');
    }
});