// Firebaseの設定とSDKのインポート
const firebaseConfig = {
    apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
    authDomain: "deck-dreamers.firebaseapp.com",
    projectId: "deck-dreamers",
    storageBucket: "deck-dreamers.appspot.com",
    messagingSenderId: "165933225805",
    appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
};

// Firebase初期化
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

class MatchingSystem {
    constructor() {
        // URLパラメータから情報を取得
        const urlParams = new URLSearchParams(window.location.search);
        this.roomId = urlParams.get('roomId');
        this.maxPlayers = parseInt(urlParams.get('maxPlayers') || '2');
        
        // プレイヤー情報
        this.playerId = localStorage.getItem('playerId');
        this.playerName = localStorage.getItem('playerName');
        
        // 状態管理
        this.selectedPosition = null;
        this.unsubscribe = null;

        // イベントリスナーの初期化
        this.initializeEventListeners();
        this.setupRoomListener();
        this.updateRoomInfo();
    }

    initializeEventListeners() {
        // エントリーボックスのクリックイベント
        document.querySelectorAll('.entry-box').forEach(box => {
            box.addEventListener('click', async (e) => {
                if (!this.playerId || !this.playerName) {
                    alert('ログインが必要です');
                    return;
                }

                const tableNumber = box.closest('.match-table').dataset.table;
                const position = box.dataset.position;
                await this.handlePositionSelect(tableNumber, position);
            });
        });

        // 退室ボタン
        const exitButton = document.querySelector('.exit-button');
        if (exitButton) {
            exitButton.addEventListener('click', () => this.handleExit());
        }

        // 対戦開始ボタン
        document.querySelectorAll('.start-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const tableNumber = e.target.closest('.match-table').dataset.table;
                await this.handleGameStart(tableNumber);
            });
        });

        // メニューアイテム
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const text = e.target.textContent.trim();
                this.handleMenuClick(text);
            });
        });
    }

    async handlePositionSelect(tableNumber, position) {
        try {
            const roomRef = db.collection('rooms').doc(this.roomId);
            await db.runTransaction(async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists) {
                    throw new Error('ルームが存在しません');
                }

                const roomData = roomDoc.data();
                const players = roomData.players || {};
                const positionKey = `${tableNumber}-${position}`;

                // 既に他のプレイヤーがいる場合はチェック
                if (players[positionKey] && players[positionKey].playerId !== this.playerId) {
                    throw new Error('この位置は既に選択されています');
                }

                // 自分が他の位置にいる場合は削除
                Object.keys(players).forEach(key => {
                    if (players[key].playerId === this.playerId) {
                        delete players[key];
                        // UIを更新
                        this.updatePositionUI(key.split('-')[0], key.split('-')[1], null);
                    }
                });

                // 新しい位置に追加
                players[positionKey] = {
                    playerId: this.playerId,
                    playerName: this.playerName,
                    tableNumber,
                    position
                };

                transaction.update(roomRef, { players });
            });

            // UIを更新
            this.updatePositionUI(tableNumber, position, this.playerName);
            this.updateStartButtons();
        } catch (error) {
            console.error('位置選択エラー:', error);
            alert(error.message);
        }
    }

    updatePositionUI(tableNumber, position, playerName) {
        const table = document.querySelector(`[data-table="${tableNumber}"]`);
        if (!table) return;

        const entryBox = table.querySelector(`[data-position="${position}"]`);
        if (!entryBox) return;

        const entryText = entryBox.querySelector('.entry-text');
        const nameDisplay = entryBox.querySelector('.player-name-display');

        if (playerName) {
            if (entryText) entryText.classList.add('hidden');
            if (nameDisplay) {
                nameDisplay.textContent = playerName;
                nameDisplay.classList.add('visible');
            }
        } else {
            if (entryText) entryText.classList.remove('hidden');
            if (nameDisplay) {
                nameDisplay.textContent = '';
                nameDisplay.classList.remove('visible');
            }
        }
    }
    async setupRoomListener() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const roomRef = db.collection('rooms').doc(this.roomId);
        this.unsubscribe = roomRef.onSnapshot((doc) => {
            if (doc.exists) {
                const roomData = doc.data();
                this.updateRoomState(roomData);
            }
        });
    }

    updateRoomState(roomData) {
        // プレイヤー数の更新
        const currentPlayers = Object.keys(roomData.players || {}).length;
        document.getElementById('currentPlayers').textContent = currentPlayers;
        document.getElementById('playerCapacity').textContent = this.maxPlayers;

        // 各ポジションの状態を更新
        Object.entries(roomData.players || {}).forEach(([positionKey, playerData]) => {
            const [tableNumber, position] = positionKey.split('-');
            this.updatePositionUI(tableNumber, position, playerData.playerName);
        });

        // 対戦開始ボタンの状態を更新
        this.updateStartButtons();
    }

    updateStartButtons() {
        document.querySelectorAll('.match-table').forEach(table => {
            const tableNumber = table.dataset.table;
            const startButton = table.querySelector('.start-button');
            const positions = table.querySelectorAll('.player-name-display');
            
            // テーブルの両方の位置にプレイヤーがいるかチェック
            const isTableFull = Array.from(positions).every(display => 
                display.textContent && display.classList.contains('visible')
            );

            if (startButton) {
                startButton.disabled = !isTableFull;
            }
        });
    }

    async handleGameStart(tableNumber) {
        try {
            const roomRef = db.collection('rooms').doc(this.roomId);
            const roomDoc = await roomRef.get();
            const roomData = roomDoc.data();
            
            // プレイヤー情報の取得
            const tablePlayers = Object.entries(roomData.players)
                .filter(([key]) => key.startsWith(tableNumber))
                .reduce((acc, [key, value]) => {
                    acc[key.split('-')[1]] = value;
                    return acc;
                }, {});

            if (!tablePlayers['先攻'] || !tablePlayers['後攻']) {
                throw new Error('プレイヤーが揃っていません');
            }

            // ゲームドキュメントの作成
            const gameId = this.generateGameId();
            await this.createGameDocument(gameId, tablePlayers);

            // 対戦画面への遷移
            this.redirectToGame(gameId);

        } catch (error) {
            console.error('ゲーム開始エラー:', error);
            alert('対戦開始に失敗しました');
        }
    }

    generateGameId() {
        return `${this.roomId}-${Date.now()}`;
    }

    async createGameDocument(gameId, tablePlayers) {
        const gameRef = db.collection('games').doc(gameId);
        
        const initialGameState = {
            status: 'playing',
            players: {
                [tablePlayers['先攻'].playerId]: {
                    name: tablePlayers['先攻'].playerName,
                    hp: 10,
                    deck: [],
                    hand: [],
                    field: null,
                    godHandRemaining: 2,
                    position: '先攻'
                },
                [tablePlayers['後攻'].playerId]: {
                    name: tablePlayers['後攻'].playerName,
                    hp: 10,
                    deck: [],
                    hand: [],
                    field: null,
                    godHandRemaining: 2,
                    position: '後攻'
                }
            },
            currentTurn: tablePlayers['先攻'].playerId,
            turnTime: 60,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await gameRef.set(initialGameState);
    }

    redirectToGame(gameId) {
        const gameUrl = new URL('../taisen.html', window.location.href);
        gameUrl.searchParams.set('gameId', gameId);
        gameUrl.searchParams.set('playerId', this.playerId);
        window.location.href = gameUrl.toString();
    }

    async handleExit() {
        if (confirm('本当に退室しますか？')) {
            try {
                const roomRef = db.collection('rooms').doc(this.roomId);
                await db.runTransaction(async (transaction) => {
                    const roomDoc = await transaction.get(roomRef);
                    if (roomDoc.exists) {
                        const roomData = roomDoc.data();
                        const players = roomData.players || {};
                        
                        // プレイヤーの位置情報を削除
                        Object.keys(players).forEach(key => {
                            if (players[key].playerId === this.playerId) {
                                delete players[key];
                            }
                        });

                        transaction.update(roomRef, { players });
                    }
                });

                window.location.href = '../Room/room.html';
            } catch (error) {
                console.error('退室エラー:', error);
                alert('退室に失敗しました');
            }
        }
    }

    handleMenuClick(menuText) {
        const params = new URLSearchParams(window.location.search);
        const queryString = params.toString() ? `?${params.toString()}` : '';

        switch(menuText) {
            case '設定':
                window.location.href = `../../Music/Music.html${queryString}`;
                break;
            case 'ルール説明':
                window.location.href = `../../main/Rule/Rule.html${queryString}`;
                break;
            case 'メニュー':
                window.location.href = `../../main/Menu/Menu.html${queryString}`;
                break;
        }
    }

    updateRoomInfo() {
        const roomIdDisplay = document.querySelector('.room-id');
        if (roomIdDisplay) {
            roomIdDisplay.textContent = `ルームID: ${this.roomId}`;
        }
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// マッチングシステムの初期化
document.addEventListener('DOMContentLoaded', () => {
    const matchingSystem = new MatchingSystem();

    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', () => {
        matchingSystem.cleanup();
    });
});