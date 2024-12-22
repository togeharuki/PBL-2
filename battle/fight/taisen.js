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
            turnEndCount: 0
        };

        this.gameState = {
            playerHp: 15,
            opponentHp: 15,
            playerDeck: [],
            playerHand: [],
            isPlayerTurn: false,
            turnTime: 60
        };

        // 結果表示用モーダルの作成
        const resultModal = document.createElement('div');
        resultModal.id = 'result-modal';
        resultModal.className = 'result-modal';
        resultModal.innerHTML = `
            <div class="result-content">
                <h2 id="result-title"></h2>
                <p id="result-message"></p>
                <button class="return-button">OK</button>
            </div>
        `;
        document.body.appendChild(resultModal);

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

        // アニメーションのスタイルを追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes healEffect {
                0% { opacity: 0; transform: scale(0.5); }
                50% { opacity: 1; transform: scale(1.2); }
                100% { opacity: 0; transform: scale(1); }
            }

            @keyframes marmotEffect {
                0% { opacity: 0; transform: scale(0.5) rotate(-10deg); }
                50% { opacity: 1; transform: scale(1.2) rotate(10deg); }
                100% { opacity: 0; transform: scale(1) rotate(0deg); }
            }

            @keyframes randomEffect {
                0% { opacity: 0; transform: translateY(-50px); }
                50% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(50px); }
            }

            @keyframes berserkEffect {
                0% { opacity: 0; transform: scale(0.5); }
                25% { opacity: 1; transform: scale(1.2); }
                50% { opacity: 1; transform: scale(0.8); }
                75% { opacity: 1; transform: scale(1.1); }
                100% { opacity: 0; transform: scale(1); }
            }

            @keyframes battlePhaseAnimation {
                0% { opacity: 0; transform: scale(0.5); }
                50% { opacity: 1; transform: scale(1.2); }
                100% { opacity: 0; transform: scale(1); }
            }

            .result-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }

            .result-content {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                max-width: 80%;
            }

            .result-content h2 {
                color: #2196F3;
                margin-bottom: 20px;
                font-size: 24px;
            }

            .result-content p {
                margin-bottom: 20px;
                color: #333;
                font-size: 18px;
            }

            .return-button {
                background-color: #4CAF50;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                transition: background-color 0.3s;
            }

            .return-button:hover {
                background-color: #45a049;
            }
        `;
        document.head.appendChild(style);
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
            console.log('ゲームド    ュメントの存在:', gameDocSnap.exists());

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
                }
            }
        });
    }

    async updateGameState(gameData) {
        try {
            console.log('updateGameState開始:', gameData);
            
            if (!gameData || !gameData.players) {
                console.error('ゲームデータが不正です:', gameData);
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

            // バトル状態の更新
            if (gameData.battleState) {
                this.battleState = {
                    ...gameData.battleState,
                    canPlayCard: gameData.battleState.canPlayCard ?? (gameData.currentTurn === this.playerId),
                    turnEndCount: gameData.battleState.turnEndCount || 0
                };
            }

            // ゲーム状態の更新（HPは条件付きで更新）
            const newGameState = {
                playerDeck: Array.isArray(playerState.deck) ? playerState.deck : [],
                playerHand: Array.isArray(playerState.hand) ? playerState.hand : [],
                opponentHandCount: opponentState?.handCount || 0,
                opponentDeckCount: opponentState?.deck?.length || 0,
                isPlayerTurn: gameData.currentTurn === this.playerId,
                turnTime: gameData.turnTime || 60
            };

            // HPの更新（ゲームが終了していない場合のみ）
            if (gameData.status === 'finished') {
                // ゲーム終了時は、HPが0のプレイヤーのHPを0に固定
                if (gameData.winner) {
                    const loserPlayerId = gameData.winner === this.playerId ? opponentId : this.playerId;
                    if (this.playerId === loserPlayerId) {
                        newGameState.playerHp = 0;
                        newGameState.opponentHp = gameData.players[opponentId].hp;
                    } else {
                        newGameState.playerHp = gameData.players[this.playerId].hp;
                        newGameState.opponentHp = 0;
                    }
                }
            } else {
                // 通常時はHPを更新
                newGameState.playerHp = playerState.hp;
                newGameState.opponentHp = opponentState?.hp || 15;
            }

            // 状態を更新
            this.gameState = {
                ...this.gameState,
                ...newGameState
            };

            // HPバーの更新
            this.updateHpBar(this.playerId, this.gameState.playerHp);
            if (opponentId) {
                this.updateHpBar(opponentId, this.gameState.opponentHp);
            }

            console.log('更新後のゲーム状態:', {
                isPlayerTurn: this.gameState.isPlayerTurn,
                playerDeckCount: this.gameState.playerDeck.length,
                opponentDeckCount: this.gameState.opponentDeckCount,
                handLength: this.gameState.playerHand.length,
                battlePhase: this.battleState.battlePhase,
                playerHp: this.gameState.playerHp,
                opponentHp: this.gameState.opponentHp,
                gameStatus: gameData.status
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
            document.getElementById('player-hp').textContent = `${this.gameState.playerHp}/15`;
            document.getElementById('opponent-hp').textContent = `${this.gameState.opponentHp}/15`;

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
        
        // 相手の手札枚数分だけ裏向きのカードを表示
        const opponentHandCount = this.gameState.opponentHandCount || 5;
        for (let i = 0; i < opponentHandCount; i++) {
            const cardBack = document.createElement('div');
            cardBack.className = 'card card-back';
            cardBack.style.position = 'absolute';
            cardBack.style.left = `${i * 120}px`;
            cardBack.style.zIndex = i;
            
            // 裏面画像を設定
            const cardImage = document.createElement('img');
            cardImage.src = './カードの裏面.png';
            cardImage.alt = 'カードの裏面';
            cardImage.style.width = '100%';
            cardImage.style.height = '100%';
            cardImage.style.objectFit = 'cover';
            
            cardBack.appendChild(cardImage);
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
                    hp: 15,
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

                // カードをシ��ッフル
                const shuffledDeck = this.shuffleArray([...cards]);
                const initialHand = shuffledDeck.slice(0, 5);
                const remainingDeck = shuffledDeck.slice(5);

                const playerData = {
                    hp: 15,
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
                // 両方の��レイヤーがターンを終了した場合にバトルフェーズを開始
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

        // アニメーションスタイル   追加
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

        //    ニメーション終了後にオーバーレイを削除
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
        
        // 新しいバトル状  を作成
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

        // Firestoreの  態を更新
        const gameRef = window.doc(db, 'games', this.gameId);
        window.updateDoc(gameRef, {
            battleState: newBattleState
        })
        .then(() => {
            console.log('バトルフェ���ズの状態を更新しました:', this.battleState);
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
                console.log('このターン   これ以  カードを出せせん');
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

            // アタッカーまたはディフェ���ダーとしてカードを設定
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

    // ダメージを適用する関数
    async applyDamage(damage, targetPlayerId = null) {
        try {
            console.log('ダメージ適用開始:', { damage, targetPlayerId, '自分のID': this.playerId });
            
            // 最新のゲームデータを取得
            const gameRef = window.doc(db, 'games', this.gameId);
            const gameDoc = await window.getDoc(gameRef);
            const gameData = gameDoc.data();

            if (!gameData || !gameData.players) {
                console.error('ゲームデータが不正です:', gameData);
                return false;
            }

            // 対戦相手のIDを取得
            const opponentId = Object.keys(gameData.players).find(id => id !== this.playerId);
            
            // ダメージを受けるプレイヤーのIDを決定
            const damageTargetId = targetPlayerId || (this.battleState.isAttacker ? this.playerId : opponentId);

            if (!gameData.players[damageTargetId]) {
                console.error('対象プレイヤーが見つかりません:', { damageTargetId, players: gameData.players });
                return false;
            }
            
            // 現在のHPを取得
            const currentHp = gameData.players[damageTargetId].hp;
            
            // 新しいHPを計算（0未満にはならない）
            const newHp = Math.max(0, currentHp - damage);

            // HPが0になる場合、ゲーム終了処理を実行
            if (newHp <= 0) {
                const updateData = {
                    [`players.${damageTargetId}.hp`]: 0,
                    status: 'finished',
                    winner: damageTargetId === this.playerId ? opponentId : this.playerId,
                    isGameOver: true
                };

                await window.updateDoc(gameRef, updateData);

                // HPバーの更新
                this.updateHpBar(damageTargetId, 0);

                console.log('ダメージ適用完了（ゲーム終了）:', {
                    targetPlayerId: damageTargetId,
                    damage,
                    newHp: 0
                });

                // ゲーム終了処理を実行
                await this.handleGameOver(damageTargetId);
                return true;
            }

            // 通常のダメージ処理
            await window.updateDoc(gameRef, {
                [`players.${damageTargetId}.hp`]: newHp
            });

            // HPバーの更新
            this.updateHpBar(damageTargetId, newHp);

            // ローカルのゲーム状態を更新
            if (damageTargetId === this.playerId) {
                this.gameState.playerHp = newHp;
            } else {
                this.gameState.opponentHp = newHp;
            }

            console.log('ダメージ適用完了:', {
                targetPlayerId: damageTargetId,
                damage,
                newHp
            });

            return false;

        } catch (error) {
            console.error('ダメージの適用に失敗:', error);
            return false;
        }
    }

    // ゲーム終了時の処理
    async handleGameOver(loserPlayerId) {
        try {
            console.log('ゲーム終了処理開始:', { loserPlayerId });

            // 最新のゲームデータを取得
            const gameRef = window.doc(db, 'games', this.gameId);
            const gameDoc = await window.getDoc(gameRef);
            const gameData = gameDoc.data();

            if (!gameData || !gameData.players) {
                console.error('ゲーム終了処理でゲームデータの取得に失敗');
                return;
            }

            // 対戦相手のIDを取得
            const opponentId = Object.keys(gameData.players).find(id => id !== this.playerId);

            // ゲームの状態を更新
            await window.updateDoc(gameRef, {
                status: 'finished',
                winner: loserPlayerId === this.playerId ? opponentId : this.playerId,
                isGameOver: true,
                // HPが0のプレイヤーのHPを0に固定
                [`players.${loserPlayerId}.hp`]: 0
            });

            // 既存のモーダルがあれば削除
            const existingModal = document.getElementById('result-modal');
            if (existingModal) {
                existingModal.remove();
            }

            // 新しいモーダルを作成
            const modal = document.createElement('div');
            modal.id = 'result-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;

            const content = document.createElement('div');
            content.style.cssText = `
                background-color: white;
                padding: 30px;
                border-radius: 15px;
                text-align: center;
                max-width: 80%;
                animation: fadeIn 0.5s ease-out;
            `;

            const title = document.createElement('h2');
            title.style.cssText = `
                font-size: 32px;
                color: ${loserPlayerId === this.playerId ? '#ff4444' : '#4CAF50'};
                margin-bottom: 20px;
            `;
            title.textContent = loserPlayerId === this.playerId ? 'You Lose!' : 'You Win!';

            const message = document.createElement('p');
            message.style.cssText = `
                font-size: 18px;
                color: #333;
                margin-bottom: 30px;
            `;
            message.textContent = loserPlayerId === this.playerId ? 
                '残念！次は勝利を目指そう！' : 
                'おめでとう！勝利を収めました！';

            const button = document.createElement('button');
            button.style.cssText = `
                background-color: #4CAF50;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 5px;
                font-size: 18px;
                cursor: pointer;
                transition: background-color 0.3s;
            `;
            button.textContent = 'OK';
            button.onclick = () => {
                window.location.href = '../Room/room.html';
            };

            // ホバーエフェクトを追加
            button.onmouseover = () => {
                button.style.backgroundColor = '#45a049';
            };
            button.onmouseout = () => {
                button.style.backgroundColor = '#4CAF50';
            };

            // モーダルを組み立てて表示
            content.appendChild(title);
            content.appendChild(message);
            content.appendChild(button);
            modal.appendChild(content);
            document.body.appendChild(modal);

            // アニメーションのスタイルを追加
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);

            console.log('ゲーム終了処理完了');

        } catch (error) {
            console.error('ゲーム終了処理に失敗:', error);
        }
    }

    // HPバーの更新処理
    updateHpBar(playerId, newHp) {
        const isPlayer = playerId === this.playerId;
        const maxHp = 15; // 最大HP値
        
        // HP表示要素の取得
        const hpElement = document.getElementById(isPlayer ? 'player-hp' : 'opponent-hp');
        const hpBar = document.getElementById(isPlayer ? 'player-hp-bar' : 'opponent-hp-bar');
        
        if (hpElement && hpBar) {
            // HPテキストの更新
            hpElement.textContent = `${newHp}/${maxHp}`;
            
            // HPバーの幅を更新
            const hpPercentage = (newHp / maxHp) * 100;
            hpBar.style.width = `${hpPercentage}%`;
            
            // HPの残量に応じて色を変更
            if (hpPercentage <= 20) {
                hpBar.style.backgroundColor = '#ff4444';
            } else if (hpPercentage <= 50) {
                hpBar.style.backgroundColor = '#ffaa00';
            }
        }
    }

    // バトルフェーズの終了
    async endBattlePhase() {
        try {
            console.log('バトルフェーズ終了処理を開始');

            // バトルゾーンのUIをクリア
            const playerSlot = document.getElementById('player-battle-slot');
            const opponentSlot = document.getElementById('opponent-battle-slot');
            if (playerSlot) playerSlot.innerHTML = '';
            if (opponentSlot) opponentSlot.innerHTML = '';

            // 現在のゲーム状態を取得
            const gameRef = window.doc(db, 'games', this.gameId);
            const gameDoc = await window.getDoc(gameRef);
            const currentGameData = gameDoc.data();

            // プレイヤーIDを取得
            const firstPlayerId = Object.keys(currentGameData.players)[0];
            const secondPlayerId = Object.keys(currentGameData.players)[1];

            // 現在のアタッカー状態を反転
            const newIsAttacker = !currentGameData.battleState.isAttacker;

            // 次のターンのプレイヤーを決定
            const nextPlayerId = currentGameData.currentTurn === firstPlayerId ? secondPlayerId : firstPlayerId;

            // バトルフェーズの状態を完全にリセット
            const resetBattleState = {
                battlePhase: 'waiting',
                attackerCard: null,
                defenderCard: null,
                cardsPlayedThisTurn: 0,
                turnEndCount: 0,
                shouldShowBattlePhase: false,
                playedCards: {},
                battleResult: null,
                isBattlePhaseInProgress: false,
                isAttacker: newIsAttacker,
                canPlayCard: true
            };

            // プレイヤーごとのplayedCardsをリセット
            resetBattleState.playedCards[firstPlayerId] = {};
            resetBattleState.playedCards[secondPlayerId] = {};

            // Firestoreの状態を更新
            await window.updateDoc(gameRef, {
                battleState: resetBattleState,
                currentTurn: nextPlayerId,
                [`players.${firstPlayerId}.playedCards`]: {},
                [`players.${secondPlayerId}.playedCards`]: {}
            });

            // ローカルの状態を更新
            this.battleState = resetBattleState;
            this.gameState.isPlayerTurn = this.playerId === nextPlayerId;

            // バトルフェーズ表示をリセット
            const battlePhaseIndicator = document.getElementById('battle-phase-indicator');
            if (battlePhaseIndicator) {
                battlePhaseIndicator.textContent = '';
                battlePhaseIndicator.className = 'battle-phase-indicator';
            }

            console.log('攻守を入れ替え:', {
                前の状態: currentGameData.battleState.isAttacker,
                新しい状態: newIsAttacker,
                次のプレイヤー: nextPlayerId
            });

            this.updateUI();
            console.log('バトルフェーズ終了処理完了');

        } catch (error) {
            console.error('バトルフェーズ終了処理でエラー:', error);
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

        // カードクリックイベントの追加（詳細表示用）
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

            // カードの説明を取得
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

            // ードの種類に基づいてボタンのテキストを設定
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
            console.log('効果カードを発動:', card);

            // 効果の種類を判断
            if (card.effect.includes('山札から１ドロー')) {
                // 「逆転の1手」「手札足りない」の効果
                await this.drawCard();
            } else if (card.effect.includes('相手の手札を2枚見る')) {
                // 「のぞき見」「パパラッチ」の効果
                await this.revealOpponentCards();
            } else if (card.effect.includes('数値＋２')) {
                // 「レゴブロック」「ルブタンの財布」の効果
                await this.increaseCardValue();
            } else if (card.effect.includes('強制1ダメージ')) {
                // 「ちくちく」「とげとげ」の効果
                const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);
                await this.applyDamage(1, opponentId);
            } else if (card.effect.includes('両方に2ダメージ')) {
                // 「リストキャット」「共倒れの1手」の効果
                await this.applyDamageToAll(2);
            } else if (card.effect.includes('自分に１ダメージ')) {
                // マーモットカードの効果
                await this.applyDamage(1, this.playerId);
                // 墓地のマーモット数をチェック
                await this.checkMarmotEffect();
            } else if (card.effect.includes('HP1回復')) {
                // 「学祭のピザ」の効果
                await this.healPlayer(1);
            } else if (card.effect.includes('HP2回復')) {
                // 「二郎系」の効果
                await this.healPlayer(2);
            } else if (card.effect.includes('徳田家ののりちゃんを山札からドロー')) {
                // 「はま寿司」の効果
                await this.drawSpecificCard('徳田家ののりちゃん');
            } else if (card.effect.includes('河合家のりょうちゃんを山札からドロー')) {
                // 「毒キノコ」の効果
                await this.drawSpecificCard('河合家のりょうちゃん');
            } else if (card.effect.includes('佐藤家のやまちゃんを山札から引く')) {
                // 「佐藤家のてんちゃん」の効果
                await this.drawSpecificCard('佐藤家のやまちゃん');
            } else if (card.effect.includes('攻撃力+1')) {
                // 「金田家のしょうちゃん」の効果
                await this.increaseAttackPower(1);
            } else if (card.effect.includes('攻撃力+2')) {
                // 「喜友名家のともちゃん」「先生集合」の効果
                await this.increaseAttackPower(2);
            } else if (card.effect.includes('3分の1の確率で3ダメージ')) {
                // 「中野家のてんちゃん」の効果
                await this.randomDamageEffect();
            } else if (card.effect.includes('発狂をしたら相手に２ダメージ')) {
                // 「マーモット系男子」の効果
                await this.checkBerserkEffect();
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

            // 効果カードを墓地に送る
            await this.sendToGraveyard([card], this.playerId);

            // 家族カードの効果をチェック
            await this.checkFamilyCompletion();

        } catch (error) {
            console.error('効果カードの発動に失敗:', error);
        }
    }

    // 相手の手札を見る効果の実装
    async revealOpponentCards() {
        try {
            const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);
            const opponentHand = this.gameData.players[opponentId].hand;

            if (!opponentHand || opponentHand.length === 0) {
                console.log('相手の手札が空です');
                return;
            }

            // ランダムに2枚選択（または手札が2枚未満の場合は全て）
            const cardsToReveal = opponentHand.length <= 2 ? 
                opponentHand : 
                this.shuffleArray([...opponentHand]).slice(0, 2);

            // カードを表示するモーダルを作成
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 1000;
                text-align: center;
            `;

            modal.innerHTML = `
                <h3 style="margin-bottom: 20px; color: #333;">相手の手札</h3>
                <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 20px;">
                    ${cardsToReveal.map(card => `
                        <div style="width: 120px;">
                            <img src="${card.image}" alt="${card.name}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px;">
                            <div style="margin-top: 10px; font-size: 14px; color: #333;">${card.name}</div>
                            <div style="font-size: 12px; color: #666;">${card.effect}</div>
                        </div>
                    `).join('')}
                </div>
                <button style="
                    padding: 10px 20px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">閉じる</button>
            `;

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 999;
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(modal);

            // 閉じるボタンのイベントリスナー
            const closeButton = modal.querySelector('button');
            closeButton.onclick = () => {
                modal.remove();
                overlay.remove();
            };

        } catch (error) {
            console.error('相手の手札を見る効果の実行に失敗:', error);
        }
    }

    // カードの数値を増加させる効果の実装
    async increaseCardValue() {
        try {
            // プレイヤーの手札から対象となるカードを選択するモーダルを表示
            const targetCards = this.gameState.playerHand.filter(card => 
                card.effect.includes('D') || card.effect.includes('H')
            );

            if (targetCards.length === 0) {
                alert('対象となるカドがりません');
                return;
            }

            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 1000;
                text-align: center;
                max-width: 80%;
                max-height: 80vh;
                overflow-y: auto;
            `;

            modal.innerHTML = `
                <h3 style="margin-bottom: 20px; color: #333;">数値を増加させるカードを選択</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 20px; margin-bottom: 20px;">
                    ${targetCards.map(card => `
                        <div class="target-card" data-card-id="${card.id}" style="
                            cursor: pointer;
                            padding: 10px;
                            border: 2px solid #ddd;
                            border-radius: 8px;
                            transition: all 0.3s ease;
                        ">
                            <img src="${card.image}" alt="${card.name}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px;">
                            <div style="margin-top: 10px; font-size: 14px; color: #333;">${card.name}</div>
                            <div style="font-size: 12px; color: #666;">${card.effect}</div>
                        </div>
                    `).join('')}
                </div>
            `;

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 999;
            `;

            document.body.appendChild(overlay);
            document.body.appendChild(modal);

            // カード選択のイベントリスナー
            const cardElements = modal.querySelectorAll('.target-card');
            cardElements.forEach(element => {
                element.addEventListener('click', async () => {
                    const cardId = element.dataset.cardId;
                    const selectedCard = targetCards.find(card => card.id === cardId);
                    
                    if (selectedCard) {
                        try {
                            // 数値を増加させる
                            const newEffect = selectedCard.effect.replace(/[DH]\s*(\d+)/, (match, num) => {
                                const newNum = parseInt(num) + 2;
                                return match.charAt(0) + ' ' + newNum;
                            });

                            console.log('効果の更新処理:', {
                                元の効果: selectedCard.effect,
                                マッチ結果: selectedCard.effect.match(/[DH]\s*(\d+)/),
                                新しい効果: newEffect
                            });

                            // 更新されたカードを作成
                            const updatedCard = {
                                ...selectedCard,
                                effect: newEffect
                            };

                            // 手札の更新
                            const newHand = this.gameState.playerHand.map(card => 
                                card.id === cardId ? updatedCard : card
                            );

                            // Firestoreの状態を更新
                            const gameRef = window.doc(db, 'games', this.gameId);
                            await window.updateDoc(gameRef, {
                                [`players.${this.playerId}.hand`]: newHand,
                                [`players.${this.playerId}.handCount`]: newHand.length
                            });

                            // ローカルの状態を更新
                            this.gameState.playerHand = newHand;

                            // 効果の適用を表示
                            const effectOverlay = document.createElement('div');
                            effectOverlay.style.cssText = `
                                position: fixed;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                background: rgba(0, 255, 0, 0.2);
                                z-index: 1000;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                animation: effectFlash 0.5s ease-out;
                            `;

                            const style = document.createElement('style');
                            style.textContent = `
                                @keyframes effectFlash {
                                    0% { opacity: 0; }
                                    50% { opacity: 1; }
                                    100% { opacity: 0; }
                                }
                            `;
                            document.head.appendChild(style);
                            document.body.appendChild(effectOverlay);

                            // アニメーション終了後に要素を削除
                            setTimeout(() => {
                                effectOverlay.remove();
                                style.remove();
                            }, 500);

                            // UIを更新
                            this.updateUI();

                            // モーダルを閉じる
                            modal.remove();
                            overlay.remove();

                            console.log('カードの効果を更新:', {
                                元の効果: selectedCard.effect,
                                新しい効果: newEffect,
                                更新後の手札: newHand
                            });

                        } catch (error) {
                            console.error('カードの効果更新に失敗:', error);
                            alert('カードの効果を更新できませんでした');
                        }
                    }
                });

                // ホバー効果
                element.addEventListener('mouseover', () => {
                    element.style.borderColor = '#4CAF50';
                    element.style.transform = 'scale(1.05)';
                });

                element.addEventListener('mouseout', () => {
                    element.style.borderColor = '#ddd';
                    element.style.transform = 'scale(1)';
                });
            });

        } catch (error) {
            console.error('カードの数値増加効果の実行に失敗:', error);
            alert('効果の実行に失敗しました');
        }
    }

    // 全プレイヤーにダメージを与える効果の実装
    async applyDamageToAll(damage) {
        try {
            const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);
            
            // 両プレイヤーにダメージを適用
            await this.applyDamage(damage, this.playerId);
            await this.applyDamage(damage, opponentId);

            // ダメージ効果のアニメーション表示
            const damageOverlay = document.createElement('div');
            damageOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 0, 0, 0.3);
                z-index: 1000;
                display: flex;
                justify-content: center;
                align-items: center;
                animation: damageFlash 0.5s ease-out;
            `;

            const style = document.createElement('style');
            style.textContent = `
                @keyframes damageFlash {
                    0% { opacity: 0; }
                    50% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(damageOverlay);

            // アニメーション終了後に要素を削除
            setTimeout(() => {
                damageOverlay.remove();
                style.remove();
            }, 500);

        } catch (error) {
            console.error('全体ダメージの適用に失敗:', error);
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

    // バトルードを表��する
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
                        ">手に戻す</button>
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
                'battleState.cardsPlayedThisTurn': 0  // カー  使用回数をリセット
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
            const percentage = (newHp / 15) * 100;
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

    // updateHands メソ��ドを修正
    updateHands() {
        // プレ   ヤーの手札を更新
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

            // 墓地カウントを更新
            this.updateGraveyardCount(playerId, updatedGraveyard.length);

            console.log('カードを墓地に送りました:', {
                playerId,
                cards,
                graveyardCount: updatedGraveyard.length
            });

        } catch (error) {
            console.error('墓地への送信に失敗:', error);
        }
    }

    // 墓地の内容を表示
    async showGraveyardContent(playerId) {
        try {
            const gameRef = window.doc(db, 'games', this.gameId);
            const gameDoc = await window.getDoc(gameRef);
            const gameData = gameDoc.data();
            const graveyard = gameData.players[playerId]?.graveyard || [];

            const modal = document.createElement('div');
            modal.className = 'graveyard-modal';
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
                width: 80%;
                max-width: 800px;
                max-height: 80vh;
                overflow-y: auto;
            `;

            const title = document.createElement('div');
            title.textContent = playerId === this.playerId ? '自分の墓地' : '相手の墓地';
            title.style.cssText = `
                font-size: 24px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 20px;
                color: #1a237e;
            `;
            modal.appendChild(title);

            const content = document.createElement('div');
            content.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 10px;
                padding: 10px;
            `;

            graveyard.forEach(card => {
                const cardElement = this.createCardElement(card);
                cardElement.style.transform = 'scale(0.9)';
                content.appendChild(cardElement);
            });

            modal.appendChild(content);

            const closeButton = document.createElement('button');
            closeButton.textContent = '閉じる';
            closeButton.style.cssText = `
                margin: 20px auto 0;
                display: block;
                padding: 10px 20px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            `;
            closeButton.onclick = () => {
                modal.remove();
                overlay.remove();
            };
            modal.appendChild(closeButton);

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
            `;
            overlay.onclick = () => {
                modal.remove();
                overlay.remove();
            };

            document.body.appendChild(overlay);
            document.body.appendChild(modal);

        } catch (error) {
            console.error('墓地の表示に失敗:', error);
        }
    }

    // 墓地のカウントを更新
    updateGraveyardCount(playerId, count) {
        const graveyardCount = document.getElementById(
            playerId === this.playerId ? 'player-graveyard-count' : 'opponent-graveyard-count'
        );
        if (graveyardCount) {
            graveyardCount.textContent = count.toString();
        }
    }

    // 墓地関連の処理を初期化
    initializeGraveyard() {
        const playerGraveyard = document.getElementById('player-graveyard');
        const opponentGraveyard = document.getElementById('opponent-graveyard');

        if (playerGraveyard) {
            playerGraveyard.addEventListener('click', () => this.showGraveyardContent(this.playerId));
        }
        if (opponentGraveyard) {
            opponentGraveyard.addEventListener('click', () => this.showGraveyardContent(Object.keys(this.gameData.players).find(id => id !== this.playerId)));
        }
    }

    // HPを回復する関数
    async healPlayer(amount) {
        try {
            const currentHp = this.gameState.playerHp;
            const maxHp = 15;
            const newHp = Math.min(currentHp + amount, maxHp);

            // Firestoreの状態を更新
            const gameRef = window.doc(db, 'games', this.gameId);
            await window.updateDoc(gameRef, {
                [`players.${this.playerId}.hp`]: newHp
            });

            // ローカルの状態を更新
            this.gameState.playerHp = newHp;
            this.updateHpBar(this.playerId, newHp);

            // 回復エフェクトを表示
            this.showHealEffect(amount);
        } catch (error) {
            console.error('回復処理に失敗:', error);
        }
    }

    // 特定のカードを山札から引く関数
    async drawSpecificCard(cardName) {
        try {
            const deck = this.gameState.playerDeck;
            const cardIndex = deck.findIndex(card => card.name === cardName);

            if (cardIndex === -1) {
                console.log(`${cardName}は山札にありません`);
                return;
            }

            // カードを山札から取り除き、手札に加える
            const drawnCard = deck[cardIndex];
            const newDeck = [...deck.slice(0, cardIndex), ...deck.slice(cardIndex + 1)];
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
            this.updateUI();
        } catch (error) {
            console.error('特定のカードを引く処理に失敗:', error);
        }
    }

    // マーモット効果をチェックする関数
    async checkMarmotEffect() {
        try {
            const gameRef = window.doc(db, 'games', this.gameId);
            const gameDoc = await window.getDoc(gameRef);
            const graveyard = gameDoc.data().players[this.playerId]?.graveyard || [];

            // 墓地のマーモットカードをカウント
            const marmotCount = graveyard.filter(card => 
                card.name.includes('マーモット')
            ).length;

            // 3体以上のマーモットがいる場合、相手に6ダメージ
            if (marmotCount >= 3) {
                const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);
                await this.applyDamage(6, opponentId);
                this.showMarmotEffect();
            }
        } catch (error) {
            console.error('マーモット効果のチェックに失敗:', error);
        }
    }

    // 家族カードの効果をチェックする関数
    async checkFamilyCompletion() {
        try {
            const gameRef = window.doc(db, 'games', this.gameId);
            const gameDoc = await window.getDoc(gameRef);
            const graveyard = gameDoc.data().players[this.playerId]?.graveyard || [];

            // 必要な家族カードの名前
            const requiredFamilies = [
                '徳田家ののりちゃん',
                '河合家のりょうちゃん',
                '喜友名家のともちゃん',
                '佐藤家のやまちゃん'
            ];

            // 全ての必要なカードが墓地にあるかチェック
            const hasAllFamilies = requiredFamilies.every(familyName =>
                graveyard.some(card => card.name === familyName)
            );

            if (hasAllFamilies) {
                // ゲーム勝利処理
                await this.handleGameWin();
            }
        } catch (error) {
            console.error('家族カードの効果チェックに失敗:', error);
        }
    }

    // ランダムダメージ効果の関数
    async randomDamageEffect() {
        try {
            // 3分の1の確率でダメージを与える
            if (Math.random() < 1/3) {
                const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);
                await this.applyDamage(3, opponentId);
                this.showRandomDamageEffect(true);
            } else {
                this.showRandomDamageEffect(false);
            }
        } catch (error) {
            console.error('ランダムダメージ効果の実行に失敗:', error);
        }
    }

    // 発狂効果をチェックする関数
    async checkBerserkEffect() {
        try {
            const gameRef = window.doc(db, 'games', this.gameId);
            const gameDoc = await window.getDoc(gameRef);
            const playerState = gameDoc.data().players[this.playerId];

            // HPが5以下の場合を「発狂状態」とする
            if (playerState.hp <= 5) {
                const opponentId = Object.keys(this.gameData.players).find(id => id !== this.playerId);
                await this.applyDamage(2, opponentId);
                this.showBerserkEffect();
            }
        } catch (error) {
            console.error('発狂効果のチェックに失敗:', error);
        }
    }

    // 攻撃力を増加させる関数
    async increaseAttackPower(amount) {
        try {
            // プレイヤーの手札から攻撃カードを探す
            const attackCards = this.gameState.playerHand.filter(card => 
                card.effect.includes('D')
            );

            if (attackCards.length === 0) {
                console.log('攻撃力を増加させる対象のカードがありません');
                return;
            }

            // カード選択用のモーダルを表示
            await this.showCardSelectionModal(attackCards, amount);
        } catch (error) {
            console.error('攻撃力増加処理に失敗:', error);
        }
    }

    // 回復エフェクトを表示する関数
    showHealEffect(amount) {
        const effectOverlay = document.createElement('div');
        effectOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 255, 0, 0.2);
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: healEffect 1s ease-out;
        `;

        const healText = document.createElement('div');
        healText.textContent = `+${amount} HP`;
        healText.style.cssText = `
            color: #4CAF50;
            font-size: 48px;
            font-weight: bold;
            text-shadow: 0 0 10px #fff;
        `;

        effectOverlay.appendChild(healText);
        document.body.appendChild(effectOverlay);

        setTimeout(() => effectOverlay.remove(), 1000);
    }

    // マーモット効果の表示
    showMarmotEffect() {
        const effectOverlay = document.createElement('div');
        effectOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 0, 0, 0.2);
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: marmotEffect 1s ease-out;
        `;

        const effectText = document.createElement('div');
        effectText.textContent = 'マーモット大集合！6ダメージ！';
        effectText.style.cssText = `
            color: #ff4444;
            font-size: 48px;
            font-weight: bold;
            text-shadow: 0 0 10px #fff;
        `;

        effectOverlay.appendChild(effectText);
        document.body.appendChild(effectOverlay);

        setTimeout(() => effectOverlay.remove(), 1000);
    }

    // ゲーム勝利処理
    async handleGameWin() {
        const gameRef = window.doc(db, 'games', this.gameId);
        await window.updateDoc(gameRef, {
            status: 'finished',
            winner: this.playerId,
            isGameOver: true
        });

        // 勝利画面の表示
        const victoryOverlay = document.createElement('div');
        victoryOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        const victoryContent = document.createElement('div');
        victoryContent.innerHTML = `
            <div style="text-align: center; color: #fff;">
                <h1 style="font-size: 48px; margin-bottom: 20px;">家族カード集合！勝利！</h1>
                <button onclick="window.location.href='../Room/room.html'" 
                        style="padding: 10px 20px; font-size: 24px; 
                               background: #4CAF50; color: white; 
                               border: none; border-radius: 5px; 
                               cursor: pointer;">
                    ルームに戻る
                </button>
            </div>
        `;

        victoryOverlay.appendChild(victoryContent);
        document.body.appendChild(victoryOverlay);
    }

    // ランダムダメージ効果の表示
    showRandomDamageEffect(success) {
        const effectOverlay = document.createElement('div');
        effectOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${success ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: randomEffect 1s ease-out;
        `;

        const effectText = document.createElement('div');
        effectText.textContent = success ? '3ダメージ成功！' : 'ダメージ失敗...';
        effectText.style.cssText = `
            color: ${success ? '#ff4444' : '#666'};
            font-size: 48px;
            font-weight: bold;
            text-shadow: 0 0 10px #fff;
        `;

        effectOverlay.appendChild(effectText);
        document.body.appendChild(effectOverlay);

        setTimeout(() => effectOverlay.remove(), 1000);
    }

    // 発狂効果の表示
    showBerserkEffect() {
        const effectOverlay = document.createElement('div');
        effectOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 0, 0, 0.3);
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: berserkEffect 1s ease-out;
        `;

        const effectText = document.createElement('div');
        effectText.textContent = '発狂！2ダメージ！';
        effectText.style.cssText = `
            color: #ff4444;
            font-size: 48px;
            font-weight: bold;
            text-shadow: 0 0 10px #fff;
        `;

        effectOverlay.appendChild(effectText);
        document.body.appendChild(effectOverlay);

        setTimeout(() => effectOverlay.remove(), 1000);
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