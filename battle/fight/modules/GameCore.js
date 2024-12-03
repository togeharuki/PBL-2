export class GameCore {
    constructor(db, roomId, tableNumber, playerId) {
        this.db = db;
        this.roomId = roomId;
        this.tableNumber = tableNumber;
        this.playerId = playerId;
        this.gameId = `${roomId}_table${tableNumber}`;
        this.gameState = null;
        this.opponentId = null;
        this.isPlayerTurn = false;
        this.unsubscribe = null;
    }

    async initializeGame() {
        try {
            console.log('ゲーム初期化開始:', this.gameId);
            const gameRef = this.db.collection('games').doc(this.gameId);
            const gameDoc = await gameRef.get();

            if (!gameDoc.exists) {
                console.log('新規ゲーム作成');
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

            await this.setupPlayers();
            this.setupRealtimeListeners();
        } catch (error) {
            console.error('ゲーム初期化エラー:', error);
            throw error;
        }
    }

    async setupPlayers() {
        const playerIds = Object.keys(this.gameState.players || {});
        if (!playerIds.includes(this.playerId)) {
            await this.addPlayer(this.playerId);
        }
        await this.waitForOpponent(playerIds);
    }

    async addPlayer(playerId) {
        const gameRef = this.db.collection('games').doc(this.gameId);
        await gameRef.update({
            [`players.${playerId}`]: {
                hp: 10,
                deck: [],
                hand: [],
                godHandRemaining: 2
            }
        });
        const updatedDoc = await gameRef.get();
        this.gameState = updatedDoc.data();
    }

    async waitForOpponent(playerIds) {
        if (playerIds.length < 2) {
            await new Promise((resolve, reject) => {
                const waitOpponent = this.db.collection('games').doc(this.gameId).onSnapshot((doc) => {
                    const currentState = doc.data();
                    const currentPlayers = Object.keys(currentState.players || {});
                    if (currentPlayers.length === 2) {
                        waitOpponent();
                        this.gameState = currentState;
                        this.opponentId = currentPlayers.find(id => id !== this.playerId);
                        resolve();
                    }
                });

                setTimeout(() => {
                    waitOpponent();
                    reject(new Error('対戦相手の待機がタイムアウトしました'));
                }, 60000);
            });
        } else {
            this.opponentId = playerIds.find(id => id !== this.playerId);
        }
    }

    setupRealtimeListeners() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const gameRef = this.db.collection('games').doc(this.gameId);
        this.unsubscribe = gameRef.onSnapshot((doc) => {
            if (doc.exists) {
                const newState = doc.data();
                this.handleGameStateUpdate(newState);
            }
        }, (error) => {
            console.error('リアルタイム更新エラー:', error);
            setTimeout(() => this.setupRealtimeListeners(), 5000);
        });
    }

    handleGameStateUpdate(newState) {
        if (!newState || !newState.players) return;
        this.gameState = newState;
        this.isPlayerTurn = newState.currentTurn === this.playerId;
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
} 