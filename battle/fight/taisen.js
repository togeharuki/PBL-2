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
            defenderCard: null,
            cardsPlayedThisTurn: 0,
            turnEndCount: 0  // ターンエンド回数を追加
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

        // 最後に表示したダメージエフェクトのタイムスタンプを追跡
        this.lastShownDamageEffect = 0;
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
            console.log('ゲームド����ュメントの存在:', gameDocSnap.exists());

            //   ッチング中のオーバーレイを表示
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

                    console.log('ゲーム状態更新:', {
                        バトルフェーズ表示フラグ: gameData.battleState?.shouldShowBattlePhase,
                        ターンエンド回数: gameData.battleState?.turnEndCount
                    });

                    // バトルフェーズの表示チェック
                    if (gameData.battleState?.shouldShowBattlePhase) {
                        console.log('バトルフェーズの開始条件が満たされました');
                        
                        // バトルフェーズの表示
                        await this.showBattlePhaseStart();
                        
                        // shouldShowBattlePhase フラグをリセット
                        await window.updateDoc(gameRef, {
                            'battleState.shouldShowBattlePhase': false,
                            'battleState.turnEndCount': 0  // ターンエンド回数もリセット
                        });

                        // カードの比較処理を実行
                        await this.executeBattleComparison();
                    }

                    // 自分のターンが始まった時の処理
                    if (!previousTurn && this.gameState.isPlayerTurn) {
                        console.log('新しいターンの開始');
                        await this.drawCard();
                    }

                    this.updateUI();

                    // ダメージエフェクトの監視を追加
                    const damageEffect = gameData.battleState?.showDamageEffect;
                    if (damageEffect?.isActive) {
                        // 最後に表示したタイムスタンプと比較して、新しい効果なら表示
                        const lastShownTimestamp = this.lastShownDamageEffect || 0;
                        if (damageEffect.timestamp > lastShownTimestamp) {
                            this.lastShownDamageEffect = damageEffect.timestamp;
                            await this.showDamageToAllEffect(damageEffect.damage);
                            
                            // 自分が効果を発動したプレイヤーの場合、フラグをリセット
                            if (gameData.currentTurn === this.playerId) {
                                await window.updateDoc(gameRef, {
                                    'battleState.showDamageEffect': {
                                        isActive: false,
                                        damage: 0,
                                        timestamp: 0
                                    }
                                });
                            }
                        }
                    }
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

            console.log('レイヤー状態:', {
                playerId: this.playerId,
                playerDeck: playerState.deck?.length,
                opponentId,
                opponentDeck: opponentState?.deck?.length
            });

            // バトル状態の更新
            if (gameData.battleState) {
                this.battleState = {
                    ...gameData.battleState,
                    canPlayCard: gameData.battleState.canPlayCard ?? (gameData.currentTurn === this.playerId),
                    turnEndCount: gameData.battleState.turnEndCount || 0  // turnEndCount を同期
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

            console.log('更新後のゲーム態:', {
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

            // デッキ数の更         
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

            // バトルフェーズの状態表示を更新
            const battlePhaseIndicator = document.getElementById('battle-phase-indicator');
            if (battlePhaseIndicator) {
                // 自分がアタッカーかどうかを判定
                const isAttacker = this.battleState.isAttacker === (this.playerId === Object.keys(this.gameData.players)[0]);
                
                if (isAttacker) {
                    battlePhaseIndicator.textContent = 'アタックフェーズ';
                    battlePhaseIndicator.className = 'battle-phase-indicator attack';
                } else {
                    battlePhaseIndicator.textContent = 'ディフェンスフェーズ';
                    battlePhaseIndicator.className = 'battle-phase-indicator defense';
                }
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
        
        const handContainer = document.createElement('div');
        handContainer.className = 'hand-container';
        handContainer.style.position = 'relative';
        
        // 相手のプレイヤーIDを取得
        const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);
        const opponentHandCards = this.gameData.players[opponentId]?.hand || [];

        opponentHandCards.forEach((card, index) => {
            const cardElement = card.isRevealed ? 
                this.createCardElement(card) : 
                this.createCardBackElement();

            cardElement.style.position = 'absolute';
            cardElement.style.left = `${index * 120}px`;
            cardElement.style.zIndex = index;
            
            handContainer.appendChild(cardElement);
        });

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
                throw new Error('デッキのカードの形式正です');
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
            console.error('エーの詳細:', {
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
        try {
            if (gameData.status === 'waiting' && !gameData.players[this.playerId]) {
                const cards = await this.getCardEffect();
                
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
                    handCount: 5
                };

                // 更新するデータを準備
                const updateData = {
                    [`players.${this.playerId}`]: playerData,
                    status: 'playing',
                    battleState: {
                        battlePhase: 'waiting',
                        canPlayCard: true,
                        isAttacker: false,
                        attackerCard: null,
                        defenderCard: null,
                        isEffectCardUsed: false,
                        battleResult: null,
                        cardsPlayedThisTurn: 0
                    }
                };

                await window.updateDoc(gameDocRef, updateData);

                // マッチング中のオーバーレイを非表示
                const matchingOverlay = document.getElementById('matching-overlay');
                if (matchingOverlay) {
                    matchingOverlay.style.display = 'none';
                }

                // バトルスタート表示を追加
                this.showBattleStart();

                return gameData;
            } else if (Object.keys(gameData.players).length >= 2) {
                throw new Error('このテーブルは既に対戦が始まっています。');
            } else {
                throw new Error('ゲームに参加できません。');
            }
        } catch (error) {
            console.error('ゲームへの参加に失敗:', error);
            throw error;
        }
    }

    async endTurn() {
        try {
            if (!this.gameState.isPlayerTurn) return;

            // 相手のプレイヤーIDを取得
            const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);
            
            // ターンエンド回数をインクリメント
            const newTurnEndCount = (this.battleState.turnEndCount || 0) + 1;
            console.log('ターンエンド処理:', {
                現在のカウント: this.battleState.turnEndCount,
                新しいカウント: newTurnEndCount
            });

            // Firestoreの状態を更新
            const gameRef = window.doc(db, 'games', this.gameId);
            const updateData = {
                currentTurn: opponentId,
                'battleState.turnEndCount': newTurnEndCount,
                // 両方のプレイヤーがターンを終了した場合にバトルフェーズを開始
                'battleState.shouldShowBattlePhase': newTurnEndCount >= 2
            };

            console.log('ターンエンド更新データ:', updateData);
            await window.updateDoc(gameRef, updateData);

            // ローカルの状態を更新
            this.gameState.isPlayerTurn = false;
            this.battleState.turnEndCount = newTurnEndCount;

            console.log('ターン終了処理完了:', {
                nextPlayer: opponentId,
                turnEndCount: newTurnEndCount,
                shouldShowBattlePhase: newTurnEndCount >= 2
            });

            this.updateUI();

        } catch (error) {
            console.error('ターン終了処理でエラーが発生:', error);
        }
    }

    // ターンセット終了時の表示を行うメソッドを追加
    showTurnSetEnd() {
        // オーバーレイを作成
        const overlay = document.createElement('div');
        overlay.style.cssText = `
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

        // バッセージテキストを作成
        const messageText = document.createElement('div');
        messageText.textContent = 'YOUR CARD FACE UP';
        messageText.style.cssText = `
            color: #fff;
            font-size: 48px;
            font-weight: bold;
            text-shadow: 0 0 10px #ff0, 0 0 20px #ff0, 0 0 30px #ff0;
            animation: messageAnimation 1.5s ease-out forwards;
        `;

        // アニメーションスタイル���追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes messageAnimation {
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

        // オーバーレイにテッセージを追加
        overlay.appendChild(messageText);
        document.body.appendChild(overlay);

        // ���ニメーション終了後にオーバーレイを削除
        setTimeout(() => {
            overlay.remove();
        }, 1500);
    }

    // バトルフェーズの開始
    startBattlePhase() {
        console.log('バトルフェーズ開始:', {
            playerId: this.playerId,
            isPlayerTurn: this.gameState.isPlayerTurn,
            currentTurn: this.gameData.currentTurn
        });
        
        // 先攻プレイヤーかどうかを判断
        const isFirstPlayer = Object.keys(this.gameData.players)[0] === this.playerId;
        
        // 新しいバトル状��を作成
        const newBattleState = {
            battlePhase: 'attack',
            canPlayCard: true,
            isAttacker: isFirstPlayer, // 先攻プレイヤーが最初のアタッカー
            attackerCard: null,
            defenderCard: null,
            isEffectCardUsed: false,
            battleResult: null,
            cardsPlayedThisTurn: 0
        };

        console.log('作成するバトル状態:', newBattleState);

        // Firestoreの��態を更新
        const gameRef = window.doc(db, 'games', this.gameId);
        window.updateDoc(gameRef, {
            battleState: newBattleState
        })
        .then(() => {
            console.log('バトルフェーズの状態を更新しました:', this.battleState);
            this.updateUI();
        })
        .catch(error => {
            console.error('バトルフェーズの更新に失敗:', error);
        });
    }

    // カードプレイ処理の修正
    async playCard(cardId) {
        try {
            console.log('カードをプレイ開始:', {
                cardId,
                canPlayCard: this.battleState.canPlayCard,
                battlePhase: this.battleState.battlePhase,
                isPlayerTurn: this.gameState.isPlayerTurn,
                cardsPlayedThisTurn: this.battleState.cardsPlayedThisTurn || 0
            });
            
            // 自分のターンでない場合は処理を中断
            if (!this.gameState.isPlayerTurn) {
                console.log('現在のターンではカードを出せません');
                return;
            }

            // カードプレイ回数をチェック
            if ((this.battleState.cardsPlayedThisTurn || 0) >= 2) {
                console.log('このターンはこれ以��カードを出せません');
                return;
            }

            // プレイするカードを手札から探す
            let cardToPlay;
            if (typeof cardId === 'object' && cardId !== null) {
                cardToPlay = cardId;
            } else {
                cardToPlay = this.gameState.playerHand.find(card => card.id === cardId);
            }

            if (!cardToPlay) {
                console.error('プレイしようとしたカードが見つかりません:', cardId);
                return;
            }

            // 手札から特定のカードのみを除去
            const newHand = this.gameState.playerHand.filter(card => 
                card.id !== (typeof cardToPlay.id === 'string' ? cardToPlay.id : cardToPlay.name)
            );

            // カードプレイ回数を更新
            const newCardsPlayedThisTurn = (this.battleState.cardsPlayedThisTurn || 0) + 1;

            // Firestoreの状態を更新するデータを準備
            const gameRef = window.doc(db, 'games', this.gameId);
            const updateData = {
                [`players.${this.playerId}.hand`]: newHand,
                [`players.${this.playerId}.handCount`]: newHand.length,
                'battleState.cardsPlayedThisTurn': newCardsPlayedThisTurn,
                [`battleState.playedCards.${this.playerId}.${newCardsPlayedThisTurn}`]: cardToPlay
            };

            // 先攻プレイヤーを判定
            const firstPlayerId = Object.keys(this.gameData.players)[0];
            const isFirstPlayer = this.playerId === firstPlayerId;

            // アタッカーまたはディフェンダーとしてカードを設定
            if (isFirstPlayer === this.battleState.isAttacker) {
                updateData['battleState.attackerCard'] = cardToPlay;
                console.log('アタッカーとしてカードを設定:', cardToPlay);
            } else {
                updateData['battleState.defenderCard'] = cardToPlay;
                console.log('ディフェンダーとしてカードを設定:', cardToPlay);
            }

            console.log('Firestore更新データ:', {
                ...updateData,
                isFirstPlayer,
                isAttacker: this.battleState.isAttacker
            });

            // Firestoreの状態を更新
            await window.updateDoc(gameRef, updateData);

            // ローカルの状態を更新
            this.gameState.playerHand = newHand;
            this.battleState.cardsPlayedThisTurn = newCardsPlayedThisTurn;
            if (isFirstPlayer === this.battleState.isAttacker) {
                this.battleState.attackerCard = cardToPlay;
            } else {
                this.battleState.defenderCard = cardToPlay;
            }

            console.log('カードプレイ後の状態:', {
                手札枚数: newHand.length,
                プレイ回数: newCardsPlayedThisTurn,
                アタッカー: this.battleState.attackerCard,
                ディフェンダー: this.battleState.defenderCard,
                isFirstPlayer,
                isAttacker: this.battleState.isAttacker
            });

            // UIを更新
            this.updateUI();
            this.updateBattleZone();
            this.updateTurnEndButton();

        } catch (error) {
            console.error('カードプレイ中にエラーが発生:', error);
        }
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

        // カードの数値を取得（⚡ D 4 ⚡ などの形式から数値を抽出）
        const attackMatch = attackerCard.effect.match(/D\s*(\d+)/);
        const defendMatch = defenderCard.effect.match(/D\s*(\d+)/);
        
        const attackValue = attackMatch ? parseInt(attackMatch[1]) : 0;
        const defendValue = defendMatch ? parseInt(defendMatch[1]) : 0;

        console.log('バトル数値:', {
            attackValue,
            defendValue,
            attackEffect: attackerCard.effect,
            defendEffect: defenderCard.effect
        });

        let damage = 0;
        // 攻撃値が防御値を超えている場合、その差分をダメージとして計算
        if (attackValue > defendValue) {
            damage = attackValue - defendValue;
            console.log(`攻撃値が防御値を${damage}上回りました`);
        }

        console.log('計算されたダメージ:', damage);

        // ダメージの適用
        if (damage > 0) {
            // ダメージを受けるプレイヤーを特定（アタッカーの相手）
            const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);
            const targetPlayerId = this.battleState.isAttacker ? opponentId : this.playerId;
            
            await this.applyDamage(damage, targetPlayerId);
            
            console.log('ダメージを適用:', {
                targetPlayerId,
                damage,
                isAttacker: this.battleState.isAttacker
            });
        }

        // バトル結果の表示
        await this.showBattleResult(attackValue, defendValue, damage, this.battleState.isAttacker);
    }

    // ダメージの適用
    async applyDamage(damage, targetPlayerId) {
        try {
            console.log('ダメージ適用開始:', {
                damage,
                targetPlayerId,
                自分のID: this.playerId
            });

            const gameRef = window.doc(db, 'games', this.gameId);
            const gameDoc = await window.getDoc(gameRef);
            const gameData = gameDoc.data();

            // 現在のHPを取得
            const currentHp = gameData.players[targetPlayerId].hp;
            const newHp = Math.max(0, currentHp - damage);

            // Firestoreのプレイヤーのhpを更新
            await window.updateDoc(gameRef, {
                [`players.${targetPlayerId}.hp`]: newHp
            });

            // ローカルのHP状態を更新（ターゲットプレイヤーのHPのみ更新）
            if (targetPlayerId === this.playerId) {
                this.gameState.playerHp = newHp;
            } else {
                this.gameState.opponentHp = newHp;
            }

            // HPゲージを更新
            this.updateHpBar(targetPlayerId, newHp);

            console.log('ダメージ適用完了:', {
                targetPlayerId,
                damage,
                newHp,
                自分のHP: this.gameState.playerHp,
                相手のHP: this.gameState.opponentHp
            });

        } catch (error) {
            console.error('ダメージ適用中にエラーが発生:', error);
        }
    }

    // バトルフェーズの終了
    async endBattlePhase() {
        try {
            console.log('バトルフェーズ終了処理を開始');

            // 既に終了処理が実行済みの場合は終了
            if (this.battleState.battlePhase === 'waiting') {
                console.log('バトルフェーズは既に終了しています');
                return;
            }

            // 現在のゲーム状態を取得
            const currentGameData = (await window.getDoc(window.doc(db, 'games', this.gameId))).data();
            
            // 先攻プレイヤーを判定
            const firstPlayerId = Object.keys(currentGameData.players)[0];
            const isFirstPlayer = this.playerId === firstPlayerId;
            
            // 現在のアタッカー状態を取得し、反転させる
            const currentIsAttacker = currentGameData.battleState.isAttacker;
            const newIsAttacker = !currentIsAttacker;

            const gameRef = window.doc(db, 'games', this.gameId);
            await window.updateDoc(gameRef, {
                'battleState.battlePhase': 'waiting',
                'battleState.attackerCard': null,
                'battleState.defenderCard': null,
                'battleState.cardsPlayedThisTurn': 0,
                'battleState.turnEndCount': 0,
                'battleState.shouldShowBattlePhase': false,
                'battleState.playedCards': {},
                'battleState.battleResult': null,
                'battleState.isBattlePhaseInProgress': false,
                'battleState.isAttacker': newIsAttacker
            });

            // ローカルの状態も更新
            this.battleState = {
                ...this.battleState,
                battlePhase: 'waiting',
                attackerCard: null,
                defenderCard: null,
                cardsPlayedThisTurn: 0,
                turnEndCount: 0,
                shouldShowBattlePhase: false,
                playedCards: {},
                battleResult: null,
                isBattlePhaseInProgress: false,
                isAttacker: newIsAttacker
            };

            // バトルゾーンのUIをクリア
            const playerSlot = document.getElementById('player-battle-slot');
            const opponentSlot = document.getElementById('opponent-battle-slot');
            if (playerSlot) playerSlot.innerHTML = '';
            if (opponentSlot) opponentSlot.innerHTML = '';

            console.log('攻守を入れ替え:', { 
                前の状態: currentIsAttacker,
                新しい状態: newIsAttacker,
                isFirstPlayer
            });

            this.updateUI();
            console.log('バトルフェーズ終了処理完了');

        } catch (error) {
            console.error('バトルフェーズ終了処理でエラー:', error);
            this.battleState.isBattlePhaseInProgress = false;
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
        const playerSlot = document.getElementById('player-battle-slot');
        const opponentSlot = document.getElementById('opponent-battle-slot');
        if (!playerSlot || !opponentSlot) return;

        // 新しいターンセットが始まる時のみスロットをクリア
        if (this.battleState.isFirstPlayerTurn && this.battleState.cardsPlayedThisTurn === 0) {
            playerSlot.innerHTML = '';
            opponentSlot.innerHTML = '';
        }

        // プレイヤーのカードを表示（最新の1枚のみ）
        if (this.battleState.playedCards && this.battleState.playedCards[this.playerId]) {
            playerSlot.innerHTML = ''; // 既存のカードをクリア
            const cards = Object.values(this.battleState.playedCards[this.playerId]);
            const latestCard = cards[cards.length - 1]; // 最新のカードのみを取得
            if (latestCard) {
                const cardElement = this.createBattleCardElement(latestCard);
                cardElement.setAttribute('data-card-id', latestCard.id);
                cardElement.style.position = 'relative';
                cardElement.style.left = '0';
                playerSlot.appendChild(cardElement);
            }
        }

        // 相手のカードを表示（最新の1枚のみ）
        const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);
        if (this.battleState.playedCards && this.battleState.playedCards[opponentId]) {
            opponentSlot.innerHTML = ''; // 既存のカードをクリア
            const cards = Object.values(this.battleState.playedCards[opponentId]);
            const latestCard = cards[cards.length - 1]; // 最新のカードのみを取得
            if (latestCard) {
                const cardElement = this.createBattleCardElement(latestCard);
                cardElement.setAttribute('data-card-id', latestCard.id);
                cardElement.style.position = 'relative';
                cardElement.style.left = '0';
                opponentSlot.appendChild(cardElement);
            }
        }
    }

    // バトルスタート表示用新しいメソッドを追加
    showBattleStart() {
        // バルスタートのオーバーレイを作成
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

        // バトルスタートのテストを作成
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
        cardElement.style.cssText = `
            width: 100px;
            height: 140px;
            background-color: #fff;
            border: 1px solid #000;
            border-radius: 5px;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
        `;

        // 手札と同じ表示形式を使用
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

        // ホバー効果を追加
        cardElement.addEventListener('mouseover', () => {
            cardElement.style.transform = 'scale(1.05)';
        });

        cardElement.addEventListener('mouseout', () => {
            cardElement.style.transform = 'scale(1)';
        });

        // カドクリックイベントの追加（詳細表示用）
        cardElement.addEventListener('click', () => {
            this.showCardDetail(card);
        });

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

    // カードの効果をフォーマットすメソッド
    formatCardEffect(effect) {
        if (!effect) return '';
        
        // 攻撃カード（D）の場合
        if (effect.includes('D')) {
            return `${effect}`;
        }
        // 回カー（H）の場合
        else if (effect.includes('H')) {
            return `${effect}`;
        }
        // それ以外の効果カーの場合
        return effect;
    }

    // カード詳細を示する関数
    async showCardDetail(card) {
        try {
            // 既存のモーダルがあれば削除
            const existingModal = document.querySelector('.card-detail-modal');
            if (existingModal) {
                existingModal.remove();
            }

            // カード����説明を取得
            let explanation = '';
            const playerId = localStorage.getItem('playerId');
            
            // Deckコレクションから説明を取得
            const deckRef = window.collection(db, 'Deck');
            const snapshot = await window.getDocs(deckRef);
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.cards) {
                    const matchingCard = data.cards.find(c => c.name === card.name);
                    if (matchingCard && matchingCard.explanation) {
                        explanation = matchingCard.explanation;
                    }
                }
            });

            // 説明が見つからない場合はデフルトの説明を使用
            if (!explanation) {
                if (card.effect.includes('D')) {
                    const damageMatch = card.effect.match(/D(\d+)/);
                    explanation = damageMatch ? `相手に${damageMatch[1]}ダメージを与える` : card.effect;
                } else if (card.effect.includes('H')) {
                    const healMatch = card.effect.match(/H(\d+)/);
                    explanation = healMatch ? `HPを${healMatch[1]}回復する` : card.effect;
                } else {
                    explanation = card.effect;
                }
            }

            // カードの種類に基づいてボタンのテキストを設定
            const isBattleCard = card.effect && (card.effect.includes('D') || card.effect.includes('H'));
            const buttonText = isBattleCard ? '召喚' : '発動';

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

            // モーダルの内容を追加
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
                                <strong>効果:</strong> ${card.effect || '効果なし'}
                            </p>
                            <p style="margin: 5px 0; font-size: 14px; color: #000;">
                                <strong>説明:</strong> ${explanation}
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
                    this.playCard(card);
                } else {
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

            // モーダルと背景表示
            document.body.appendChild(overlay);
            document.body.appendChild(modal);

        } catch (error) {
            console.error('カード詳細の表示に失敗:', error);
        }
    }

    // 効果カードを発動する関数
    async activateEffectCard(card) {
        try {
            console.log('効果カードを��動:', card);

            // 効果の種類を判断
            if (card.effect.includes('ドロー')) {
                await this.drawCard();
            } else if (card.effect.includes('強制')) {
                // 強制ダメージ効果の処理
                const damageMatch = card.effect.match(/\d+/);
                const damage = damageMatch ? parseInt(damageMatch[0]) : 0;
                await this.applyDamage(damage);
            } else if (card.effect.includes('相手の手札を2枚見る')) {
                await this.revealOpponentCards();
            } else if (card.effect.includes('両方に2ダメージ')) {
                await this.applyDamageToAll(2);
            } else {
                // 攻撃カードの場合（例：⚡ D3 ⚡）
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

    // ターン表示の更新
    updateTurnIndicator() {
        const turnIndicator = document.getElementById('turn-indicator');
        if (turnIndicator) {
            const currentPhase = this.battleState.battlePhase;
            let turnText = '';
            let turnClass = '';

            if (currentPhase === 'attack') {
                turnText = 'アタックフェーズ';
                turnClass = 'attack-phase';
            } else if (currentPhase === 'defense') {
                turnText = 'ディフェンスフェーズ';
                turnClass = 'defense-phase';
            } else if (currentPhase === 'result') {
                turnText = 'バトル結果';
                turnClass = 'result-phase';
            }

            turnIndicator.textContent = turnText;
            turnIndicator.className = `turn-indicator ${turnClass}`;
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

    // カード数値を抽出す関数
    extractCardValue(effect) {
        if (!effect) return 0;
        const match = effect.match(/D(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    // バトルードを表にする
    async revealBattleCards() {
        // アニメーション付きでカードを表にする処理
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
    async showBattleResult(attackValue, defenseValue, damage, isPlayerAttacker) {
        const resultOverlay = document.createElement('div');
        resultOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const resultContent = document.createElement('div');
        resultContent.style.cssText = `
            background-color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            color: black;
            max-width: 80%;
            box-shadow: 0 0 20px rgba(255,255,255,0.2);
        `;

        // 攻撃と防御の比較表示
        const battleText = document.createElement('div');
        battleText.style.cssText = `
            font-size: 24px;
            margin-bottom: 20px;
        `;
        battleText.innerHTML = `
            <div style="margin-bottom: 10px;">
                <span style="color: #ff4444;">攻撃: ${attackValue}</span>
                <span style="margin: 0 10px;">VS</span>
                <span style="color: #4444ff;">防御: ${defenseValue}</span>
            </div>
        `;

        // 結果表示（プレイヤーの立場に応じてメッセージを変更）
        const resultText = document.createElement('div');
        resultText.style.cssText = `
            font-size: 32px;
            font-weight: bold;
            margin-top: 20px;
            animation: damageAnimation 0.5s ease-out;
        `;

        if (damage > 0) {
            if (isPlayerAttacker) {
                // プレイヤーが攻撃側の場合
                resultText.innerHTML = `
                    <div style="color: #ff4444;">
                        相手に${damage}ダメージを与えた！
                    </div>
                `;
            } else {
                // プレ   ヤーが防   側の場合
                resultText.innerHTML = `
                    <div style="color: #ff4444;">
                        ${damage}ダメージを受けた！
                    </div>
                `;
            }
        } else {
            if (isPlayerAttacker) {
                // プレイヤーが攻撃側の場合
                resultText.innerHTML = `
                    <div style="color: #4444ff;">
                        ダメージを防がれた！
                    </div>
                `;
            } else {
                // プレイヤーが防御側の場合
                resultText.innerHTML = `
                    <div style="color: #4444ff;">
                        ダメージを防いだ！
                    </div>
                `;
            }
        }

        resultContent.appendChild(battleText);
        resultContent.appendChild(resultText);
        resultOverlay.appendChild(resultContent);
        document.body.appendChild(resultOverlay);

        await new Promise(resolve => setTimeout(resolve, 3000));
        resultOverlay.remove();
    }

    // ーンの切り替え
    async switchTurns() {
        // バトルゾーンをクリア
        this.battleState.attackerCard = null;
        this.battleState.defenderCard = null;

        // 攻守を入れ替え
        this.battleState.isAttacker = !this.battleState.isAttacker;
        
        // 相手のプイヤーIDを取得
        const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);

        // Firestoreの状態を更新
        const gameRef = window.doc(db, 'games', this.gameId);
        await window.updateDoc(gameRef, {
            currentTurn: opponentId,
            turnTime: 60,
            'battleState.battlePhase': 'waiting',
            'battleState.attackerCard': null,
            'battleState.defenderCard': null,
            'battleState.isAttacker': !this.battleState.isAttacker
        });

        // UIを更新
        this.updateUI();
        this.updateTurnIndicator();
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

    // バトルゾーンのカード要素を作成する新しいメソッド
    createBattleCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = 'battle-card';
        cardElement.style.cssText = `
            width: 100px;
            height: 140px;
            border-radius: 8px;
            background-color: white;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
        `;

        cardElement.innerHTML = `
            <div style="height: 75%; overflow: hidden;">
                <img src="${card.image || `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${encodeURIComponent(card.name)}.jpg`}" 
                     alt="${card.name}" 
                     style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div style="padding: 5px; text-align: center; background-color: #1a237e; color: white; height: 25%;">
                ${card.name}
            </div>
        `;

        return cardElement;
    }

    // バトルカードの詳細表示用の新しいメソドを追加
    async showBattleCardDetail(card) {
        try {
            // 既存のモーダルあれば削除
            const existingModal = document.querySelector('.card-detail-modal');
            if (existingModal) {
                existingModal.remove();
            }

            // カード説明取得
            let explanation = '';
            const deckRef = window.collection(db, 'Deck');
            const snapshot = await window.getDocs(deckRef);
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.cards) {
                    const matchingCard = data.cards.find(c => c.name === card.name);
                    if (matchingCard && matchingCard.explanation) {
                        explanation = matchingCard.explanation;
                    }
                }
            });

            // デフォルトの説明を設定
            if (!explanation) {
                if (card.effect.includes('D')) {
                    const damageMatch = card.effect.match(/D(\d+)/);
                    explanation = damageMatch ? `相手に${damageMatch[1]}ダメージを与える` : card.effect;
                } else if (card.effect.includes('H')) {
                    const healMatch = card.effect.match(/H(\d+)/);
                    explanation = healMatch ? `HPを${healMatch[1]}回復する` : card.effect;
                } else {
                    explanation = card.effect;
                }
            }

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
                                <strong>効果:</strong> ${card.effect || '効果なし'}
                            </p>
                            <p style="margin: 5px 0; font-size: 14px; color: #000;">
                                <strong>説明:</strong> ${explanation}
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: center; gap: 10px;">
                        <button class="return-hand-button" style="
                            background-color: #4CAF50;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 16px;
                        ">手札に戻す</button>
                        <button class="close-button" style="
                            background-color: #666;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 16px;
                        ">キャンセル</button>
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

            // 手札に戻すボタンのイベントリスナー
            const returnButton = modal.querySelector('.return-hand-button');
            returnButton.addEventListener('click', () => {
                this.returnCardToHand(card);
                modal.remove();
                overlay.remove();
            });

            // キャンセルボタンのイベントリスナー
            const closeButton = modal.querySelector('.close-button');
            closeButton.addEventListener('click', () => {
                modal.remove();
                overlay.remove();
            });

            // モーダルと背景を表示
            document.body.appendChild(overlay);
            document.body.appendChild(modal);

        } catch (error) {
            console.error('カード詳細の表示に失敗:', error);
        }
    }

    // カードを手札に戻す処理を追加
    async returnCardToHand(card) {
        try {
            // 現在の手札に追加
            const newHand = [...this.gameState.playerHand, card];

            // Firestoreの状態を更新
            const gameRef = window.doc(db, 'games', this.gameId);
            const updateData = {
                [`players.${this.playerId}.hand`]: newHand,
                [`players.${this.playerId}.handCount`]: newHand.length,
                'battleState.attackerCard': null,
                'battleState.defenderCard': null,
                'battleState.battlePhase': 'waiting',
                'battleState.cardsPlayedThisTurn': 0  // カー��使用回数をリセット
            };

            await window.updateDoc(gameRef, updateData);

            // ローカルの状態を更新
            this.gameState.playerHand = newHand;
            this.battleState.attackerCard = null;
            this.battleState.defenderCard = null;
            this.battleState.battlePhase = 'waiting';
            this.battleState.cardsPlayedThisTurn = 0;  // カード使用回数をリセット

            // UIを更新
            this.updateUI();
        } catch (error) {
            console.error('カードを手札に戻す処理に失敗:', error);
        }
    }

    // updateTurnEndButton メソッドを追加
    updateTurnEndButton() {
        const turnEndContainer = document.getElementById('turn-end-container');
        if (!turnEndContainer) return;

        // 既存のボタンを削除
        turnEndContainer.innerHTML = '';

        // 自分のターンの場合のみボタンを表示
        if (this.gameState.isPlayerTurn && (this.battleState.cardsPlayedThisTurn || 0) > 0) {
            const endTurnButton = document.createElement('button');
            endTurnButton.className = 'end-turn-button';
            endTurnButton.textContent = 'ターンエンド';
            endTurnButton.onclick = () => this.endTurn();
            turnEndContainer.appendChild(endTurnButton);
        }
    }

    // バトルフェーズ開始表示メソッドを追加
    async showBattlePhaseStart() {
        try {
            console.log('バトルフェーズ開始処理を実行');

            // 既にバトルフェーズが実行中の場合は処理を中断
            if (this.battleState.isBattlePhaseInProgress) {
                console.log('バトルフェーズは既に実行中です');
                return;
            }

            // バトルフェーズ実行中フラグを立てる
            this.battleState.isBattlePhaseInProgress = true;

            // バトルフェーズの表示
            const overlay = document.createElement('div');
            overlay.style.cssText = `
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

            const messageText = document.createElement('div');
            messageText.textContent = 'バトルフェーズ';
            messageText.style.cssText = `
                color: #ff0;
                font-size: 64px;
                font-weight: bold;
                text-shadow: 0 0 10px #f00, 0 0 20px #f00, 0 0 30px #f00;
                animation: battlePhaseAnimation 1.5s ease-out forwards;
            `;

            overlay.appendChild(messageText);
            document.body.appendChild(overlay);

            // アニメーション終了を待つ
            await new Promise(resolve => setTimeout(resolve, 1500));
            overlay.remove();

            // バトル処理の実行
            await this.executeBattleComparison();

            // バトルフェーズ実行中フラグを解除
            this.battleState.isBattlePhaseInProgress = false;

        } catch (error) {
            console.error('バトルフェーズ開始処理でエラー:', error);
            // エラー時もフラグを解除
            this.battleState.isBattlePhaseInProgress = false;
        }
    }

    // バトル比較処理を新しく作成
    async executeBattleComparison() {
        try {
            console.log('バトル比較処理を開始');

            // 現在のゲーム状態を取得
            const currentGameData = (await window.getDoc(window.doc(db, 'games', this.gameId))).data();

            // 既に処理済みの場合は終了
            if (currentGameData.battleState?.battleResult?.isProcessed) {
                console.log('バトル比較は既に処理済みです');
                return;
            }

            const attackerCard = currentGameData.battleState.attackerCard;
            const defenderCard = currentGameData.battleState.defenderCard;

            if (!attackerCard || !defenderCard) {
                console.log('バトルに必要なカードが揃っていません');
                return;
            }

            const attackMatch = attackerCard.effect.match(/D\s*(\d+)/);
            const defendMatch = defenderCard.effect.match(/D\s*(\d+)/);
            
            const attackValue = attackMatch ? parseInt(attackMatch[1]) : 0;
            const defendValue = defendMatch ? parseInt(defendMatch[1]) : 0;

            const damage = attackValue > defendValue ? attackValue - defendValue : 0;

            // バトル結果を保存
            const gameRef = window.doc(db, 'games', this.gameId);
            await window.updateDoc(gameRef, {
                'battleState.battleResult': {
                    attackValue,
                    defendValue,
                    damage,
                    isProcessed: true  // 処理済みフラグを立てる
                }
            });

            // プレイヤーが攻撃側かどうかを判定
            const isPlayerAttacker = currentGameData.battleState.isAttacker === (this.playerId === Object.keys(this.gameData.players)[0]);

            // バトル結果の表示
            await this.showBattleResult(attackValue, defendValue, damage, isPlayerAttacker);

            // ダメージがある場合、防御側のHPのみを減少
            if (damage > 0) {
                const defenderPlayerId = currentGameData.battleState.isAttacker ? 
                    Object.keys(this.gameData.players)[1] :  // アタッカーが先攻の場合、後攻プレイヤーが防御側
                    Object.keys(this.gameData.players)[0];   // アタッカーが後攻の場合、先攻プレイヤーが防御側
                
                console.log('ダメージ適用:', {
                    damage,
                    isAttacker: currentGameData.battleState.isAttacker,
                    defenderPlayerId,
                    自分のID: this.playerId,
                    相手のID: Object.keys(this.gameData.players).find(id => id !== this.playerId)
                });

                // 防御側のプレイヤーにのみダメージを適用
                await this.applyDamage(damage, defenderPlayerId);
            }

            // バトルフェーズを終了する
            await this.endBattlePhase();

        } catch (error) {
            console.error('バトル比較処理でエラー:', error);
            // エラー時もバトルフェーズを終了する
            await this.endBattlePhase();
        }
    }

    // HPゲージ更新処理を追加
    updateHpBar(playerId, newHp) {
        const isPlayer = playerId === this.playerId;
        const hpBarId = isPlayer ? 'player-hp-bar' : 'opponent-hp-bar';
        const hpTextId = isPlayer ? 'player-hp' : 'opponent-hp';
        
        const hpBar = document.getElementById(hpBarId);
        const hpText = document.getElementById(hpTextId);
        
        if (hpBar && hpText) {
            const percentage = (newHp / 10) * 100;
            hpBar.style.width = `${percentage}%`;
            hpText.textContent = `${newHp}/10`;

            // HPが低くなったら色を変更
            if (percentage <= 30) {
                hpBar.style.backgroundColor = '#ff4444';
            } else if (percentage <= 50) {
                hpBar.style.backgroundColor = '#ffaa00';
            }
        }
    }

    // バトルゾーンのカードを確認して墓地に送る処理を追加
    async checkAndClearBattleZone() {
        try {
            // バトルゾーンのカードを確認
            const playerCard = this.battleState.playedCards?.[this.playerId]?.[1];
            
            if (playerCard) {
                console.log('バトルゾーンのカードを墓地に送りま:', playerCard);
                
                // カードを墓地に送る
                await this.sendToGraveyard([playerCard], this.playerId);
                
                // バトルゾーンをクリア
                const gameRef = window.doc(db, 'games', this.gameId);
                await window.updateDoc(gameRef, {
                    [`battleState.playedCards.${this.playerId}`]: {}
                });
                
                // ローカの状態も更新
                if (this.battleState.playedCards) {
                    this.battleState.playedCards[this.playerId] = {};
                }
                
                // UIを更新
                this.updateBattleZone();
            }
        } catch (error) {
            console.error('バトルゾーンのクリア処理でエラーが発生:', error);
        }
    }

    // updateHands メソッドを修正
    updateHands() {
        // プレイヤーの手札を更新
        const playerHand = document.getElementById('player-hand');
        if (playerHand) {
            playerHand.innerHTML = '';
            this.gameState.playerHand.forEach(card => {
                const cardElement = this.createCardElement(card);
                cardElement.setAttribute('data-card-id', card.id);
                
                // カードをクリックできるのは自分のターンの時のみ
                if (this.gameState.isPlayerTurn && this.battleState.canPlayCard) {
                    cardElement.style.cursor = 'pointer';
                    cardElement.addEventListener('click', () => this.showCardDetail(card));
                } else {
                    cardElement.style.opacity = '0.7';
                }
                
                playerHand.appendChild(cardElement);
            });
        }

        // 相手の手札を更新（裏向きのカード）
        const opponentHand = document.getElementById('opponent-hand');
        if (opponentHand) {
            opponentHand.innerHTML = '';
            const opponentHandCount = this.gameState.opponentHandCount || 0;
            
            for (let i = 0; i < opponentHandCount; i++) {
                const cardBack = document.createElement('div');
                cardBack.className = 'card';
                cardBack.style.cssText = `
                    width: 100px;
                    height: 140px;
                    background-image: url('../Card/deck/kizon/カードの裏面.png');
                    background-size: cover;
                    margin: 0 5px;
                `;
                opponentHand.appendChild(cardBack);
            }
        }
    }

    // sendToGraveyard メソッドを追加
    async sendToGraveyard(cards, playerId) {
        try {
            if (!Array.isArray(cards) || cards.length === 0) return;

            // Firestoreの状態を更新
            const gameRef = window.doc(db, 'games', this.gameId);
            const gameDoc = await window.getDoc(gameRef);
            const gameData = gameDoc.data();

            // プレイヤーの墓地配列を取得または作成
            const graveyard = gameData.players[playerId]?.graveyard || [];
            
            // カードを墓地に追加
            const updatedGraveyard = [...graveyard, ...cards];

            // Firestoreを更新
            await window.updateDoc(gameRef, {
                [`players.${playerId}.graveyard`]: updatedGraveyard
            });

            console.log('カードを墓地に送りました:', {
                playerId,
                cards,
                graveyardCount: updatedGraveyard.length
            });

        } catch (error) {
            console.error('墓地への送信に失敗:', error);
        }
    }

    // 相手のカードを表示する新しいメソッドを追加
    async revealOpponentCards() {
        try {
            // 相手のプレイヤーIDを取得
            const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);
            if (!opponentId) {
                console.error('相手プレイヤーが見つかりません');
                return;
            }

            // 相手の手札を取得
            const opponentHand = this.gameData.players[opponentId].hand;
            if (!opponentHand || opponentHand.length === 0) {
                console.log('相手の手札が空です');
                return;
            }

            // ランダムに2枚選択（手札が2枚未満の場合は全て）
            const numCardsToReveal = Math.min(2, opponentHand.length);
            const shuffledHand = [...opponentHand].sort(() => Math.random() - 0.5);
            const cardsToReveal = shuffledHand.slice(0, numCardsToReveal);

            // 選択されたカードにrevealedフラグを追加
            const revealedCards = cardsToReveal.map(card => ({
                ...card,
                isRevealed: true
            }));

            // 相手の手札を更新（選択されたカードを表向きにする）
            const updatedHand = opponentHand.map(card => 
                revealedCards.some(rc => rc.id === card.id) ? { ...card, isRevealed: true } : card
            );

            // Firestoreの状態を更新
            const gameRef = window.doc(db, 'games', this.gameId);
            await window.updateDoc(gameRef, {
                [`players.${opponentId}.hand`]: updatedHand
            });

            // 公開されたカードを表示
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;

            const title = document.createElement('div');
            title.textContent = '公開された相手の手札';
            title.style.cssText = `
                color: white;
                font-size: 24px;
                margin-bottom: 20px;
            `;
            overlay.appendChild(title);

            const cardContainer = document.createElement('div');
            cardContainer.style.cssText = `
                display: flex;
                gap: 20px;
                justify-content: center;
                align-items: center;
            `;

            revealedCards.forEach(card => {
                const cardElement = this.createCardElement(card);
                cardElement.style.transform = 'scale(1.2)';
                cardContainer.appendChild(cardElement);
            });

            overlay.appendChild(cardContainer);

            const message = document.createElement('div');
            message.textContent = 'これらのカードは表向きのまま相手の手札に残ります';
            message.style.cssText = `
                color: white;
                font-size: 16px;
                margin-top: 20px;
            `;
            overlay.appendChild(message);

            const closeButton = document.createElement('button');
            closeButton.textContent = '閉じる';
            closeButton.style.cssText = `
                margin-top: 20px;
                padding: 10px 20px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            `;
            closeButton.onclick = () => overlay.remove();
            overlay.appendChild(closeButton);

            document.body.appendChild(overlay);

            // 相手の手札表示を更新
            this.updateOpponentHandDisplay();

        } catch (error) {
            console.error('相手のカード表示に失敗:', error);
        }
    }

    // 裏向きカード要素を作成する補助メソッド
    createCardBackElement() {
        const cardBack = document.createElement('div');
        cardBack.className = 'card card-back';
        cardBack.style.cssText = `
            width: 100px;
            height: 140px;
            background-image: url('./カードの裏面.png');
            background-size: cover;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        return cardBack;
    }

    // 全プレイヤーにダメージを与える新しいメソッドを追加
    async applyDamageToAll(damage) {
        try {
            const gameRef = window.doc(db, 'games', this.gameId);
            const gameDoc = await window.getDoc(gameRef);
            const gameData = gameDoc.data();

            // 効果発動フラグを設定
            await window.updateDoc(gameRef, {
                'battleState.showDamageEffect': {
                    isActive: true,
                    damage: damage,
                    timestamp: Date.now()
                }
            });

            // 全プレイヤーのHPを更新
            const updates = {};
            Object.keys(gameData.players).forEach(playerId => {
                const currentHp = gameData.players[playerId].hp;
                const newHp = Math.max(0, currentHp - damage);
                updates[`players.${playerId}.hp`] = newHp;

                // ローカルの状態も更新
                if (playerId === this.playerId) {
                    this.gameState.playerHp = newHp;
                } else {
                    this.gameState.opponentHp = newHp;
                }
            });

            // Firestoreを一括更新
            await window.updateDoc(gameRef, updates);

            // HPゲージを更新
            this.updateUI();

        } catch (error) {
            console.error('全体ダメージの適用に失敗:', error);
        }
    }

    // 全体ダメージのエフェクトを表示する新しいメソッドを追加
    async showDamageToAllEffect(damage) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;

            // アニメーションスタイルを追加
            const style = document.createElement('style');
            style.textContent = `
                @keyframes damageFlash {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes damagePopup {
                    0% { transform: translateY(20px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                @keyframes hpDecrease {
                    from { width: var(--initial-width); }
                    to { width: var(--final-width); }
                }
                .damage-number {
                    position: absolute;
                    color: #ff4444;
                    font-weight: bold;
                    font-size: 24px;
                    animation: damagePopup 0.5s ease-out;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
                }
            `;
            document.head.appendChild(style);

            // メインメッセージ
            const messageElement = document.createElement('div');
            messageElement.textContent = '互いの心身に傷がついた！';
            messageElement.style.cssText = `
                color: #ff4444;
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 20px;
                text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
                animation: damageFlash 0.5s ease-in-out;
            `;

            // ダメージ表示
            const damageElement = document.createElement('div');
            damageElement.textContent = `${damage}ダメージ！`;
            damageElement.style.cssText = `
                color: white;
                font-size: 24px;
                animation: damagePopup 0.5s ease-out;
            `;

            overlay.appendChild(messageElement);
            overlay.appendChild(damageElement);
            document.body.appendChild(overlay);

            // プレイヤーとオポーネントのHPバーにダメージ表示を追加
            const playerHpBar = document.getElementById('player-hp-bar');
            const opponentHpBar = document.getElementById('opponent-hp-bar');
            const playerHpText = document.getElementById('player-hp');
            const opponentHpText = document.getElementById('opponent-hp');

            if (playerHpBar && opponentHpBar) {
                // 現在のHP値を取得
                const currentPlayerHp = parseInt(playerHpText.textContent);
                const currentOpponentHp = parseInt(opponentHpText.textContent);
                
                // プレイヤーのダメージ数字表示
                const playerDamageNumber = document.createElement('div');
                playerDamageNumber.className = 'damage-number';
                playerDamageNumber.textContent = `-${damage}`;
                playerDamageNumber.style.cssText = `
                    position: absolute;
                    left: ${playerHpBar.offsetLeft + playerHpBar.offsetWidth/2}px;
                    top: ${playerHpBar.offsetTop - 20}px;
                `;
                document.body.appendChild(playerDamageNumber);

                // オポーネントのダメージ数字表示
                const opponentDamageNumber = document.createElement('div');
                opponentDamageNumber.className = 'damage-number';
                opponentDamageNumber.textContent = `-${damage}`;
                opponentDamageNumber.style.cssText = `
                    position: absolute;
                    left: ${opponentHpBar.offsetLeft + opponentHpBar.offsetWidth/2}px;
                    top: ${opponentHpBar.offsetTop - 20}px;
                `;
                document.body.appendChild(opponentDamageNumber);

                // HPバーのアニメーション
                const playerInitialWidth = playerHpBar.offsetWidth;
                const opponentInitialWidth = opponentHpBar.offsetWidth;
                const playerFinalWidth = (playerInitialWidth * (currentPlayerHp - damage)) / 10;
                const opponentFinalWidth = (opponentInitialWidth * (currentOpponentHp - damage)) / 10;

                playerHpBar.style.setProperty('--initial-width', `${playerInitialWidth}px`);
                playerHpBar.style.setProperty('--final-width', `${playerFinalWidth}px`);
                opponentHpBar.style.setProperty('--initial-width', `${opponentInitialWidth}px`);
                opponentHpBar.style.setProperty('--final-width', `${opponentFinalWidth}px`);

                playerHpBar.style.animation = 'hpDecrease 1s ease-in-out forwards';
                opponentHpBar.style.animation = 'hpDecrease 1s ease-in-out forwards';

                // HPテキストの更新
                setTimeout(() => {
                    playerHpText.textContent = `${currentPlayerHp - damage}/10`;
                    opponentHpText.textContent = `${currentOpponentHp - damage}/10`;
                }, 1000);

                // ダメージ数字の削除
                setTimeout(() => {
                    playerDamageNumber.remove();
                    opponentDamageNumber.remove();
                }, 1500);
            }

            // 2秒後にオーバーレイを削除して処理を完了
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 2000);
        });
    }
}

// ゲームの初期化です
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