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

document.addEventListener('DOMContentLoaded', function() {
    // プレイヤーのテーブル位置を追跡
    const tablePositions = {};

    // URLパラメータから情報を取得
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    const maxPlayers = urlParams.get('maxPlayers');

    // ルームIDを表示
    if (roomId) {
        document.querySelector('.room-id').textContent = `ルームID: ${roomId}`;
    }

    // プレイヤー数の更新と表示制御
    if (maxPlayers) {
        document.getElementById('playerCapacity').textContent = maxPlayers;
        
        const matchTables = document.querySelectorAll('.match-table');
        matchTables.forEach((table, index) => {
            if (index < Math.floor(maxPlayers / 2)) {
                table.style.display = 'block';
            } else {
                table.style.display = 'none';
            }
        });
    }

    // Firestoreのルーム監視設定
    if (roomId) {
        db.collection('rooms').doc(roomId).onSnapshot((doc) => {
            if (doc.exists) {
                const roomData = doc.data();
                updateRoomState(roomData);
            }
        });
    }

    // ルーム状態の更新処理
    function updateRoomState(roomData) {
        // プレイヤーの位置情報を更新
        Object.entries(roomData.players || {}).forEach(([playerId, data]) => {
            const table = document.querySelector(`[data-table="${data.tableNumber}"]`);
            if (table) {
                const entryBox = table.querySelector(`[data-position="${data.position}"]`);
                if (entryBox) {
                    updateEntryBoxDisplay(entryBox, data.playerName);
                }
            }
        });

        // プレイヤー数の更新
        const currentPlayers = Object.keys(roomData.players || {}).length;
        document.getElementById('currentPlayers').textContent = currentPlayers;

        // 開始ボタンの状態を更新
        updateStartButtons();
    }

    // エントリーボックスの表示更新
    function updateEntryBoxDisplay(entryBox, playerName) {
        const entryText = entryBox.querySelector('.entry-text');
        const playerNameDisplay = entryBox.querySelector('.player-name-display');

        if (playerName) {
            if (entryText) entryText.classList.add('hidden');
            if (playerNameDisplay) {
                playerNameDisplay.textContent = playerName;
                playerNameDisplay.classList.add('visible');
            }
        } else {
            if (entryText) entryText.classList.remove('hidden');
            if (playerNameDisplay) {
                playerNameDisplay.textContent = '';
                playerNameDisplay.classList.remove('visible');
            }
        }
    }

    // マッチングテーブルのクリックイベント設定
    const matchTables = document.querySelectorAll('.match-table');
    matchTables.forEach(table => {
        const entryBoxes = table.querySelectorAll('.entry-box');
        entryBoxes.forEach(entryBox => {
            entryBox.addEventListener('click', async function() {
                await handleEntryBoxClick(table, entryBox);
            });
        });
    });

    // エントリーボックスクリック処理
    async function handleEntryBoxClick(table, entryBox) {
        const tableNumber = table.dataset.table;
        const position = entryBox.dataset.position;
        const playerId = localStorage.getItem('playerId');
        const playerName = localStorage.getItem('playerName');
        
        if (!playerId || !playerName) {
            alert('ログインしてください');
            return;
        }

        try {
            await updatePlayerPosition(tableNumber, position, playerId, playerName);
        } catch (error) {
            console.error('エントリーエラー:', error);
            alert(error.message);
        }
    }

    // プレイヤー位置の更新処理
    async function updatePlayerPosition(tableNumber, position, playerId, playerName) {
        const roomRef = db.collection('rooms').doc(roomId);
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (!roomDoc.exists) {
                throw new Error('ルームが存在しません');
            }

            const roomData = roomDoc.data();
            const players = roomData.players || {};
            const positionKey = `${tableNumber}-${position}`;

            // 位置チェックと更新
            if (players[positionKey] && players[positionKey].playerId !== playerId) {
                throw new Error('この位置は既に選択されています');
            }

            // 既存の位置をクリア
            Object.keys(players).forEach(key => {
                if (players[key].playerId === playerId) {
                    delete players[key];
                }
            });

            // 新しい位置を設定
            players[positionKey] = {
                playerId,
                playerName,
                tableNumber,
                position
            };

            transaction.update(roomRef, { players });
        });
    }
    // 開始ボタンの状態更新
    function updateStartButtons() {
        const matchTables = document.querySelectorAll('.match-table');
        matchTables.forEach(table => {
            const playerNameDisplays = table.querySelectorAll('.player-name-display');
            const startButton = table.querySelector('.start-button');
            
            const isTableFull = Array.from(playerNameDisplays).every(display => 
                display.textContent && display.classList.contains('visible')
            );
            
            if (startButton) {
                startButton.disabled = !isTableFull;
            }
        });
    }

    // 退室ボタンの処理
    document.querySelector('.exit-button').addEventListener('click', async function() {
        if (confirm('本当に退室しますか？')) {
            const playerId = localStorage.getItem('playerId');
            
            if (roomId && playerId) {
                try {
                    await handlePlayerExit(playerId);
                    window.location.href = '../Room/room.html';
                } catch (error) {
                    console.error('退室エラー:', error);
                    alert('退室処理に失敗しました');
                }
            }
        }
    });

    // プレイヤー退室処理
    async function handlePlayerExit(playerId) {
        const roomRef = db.collection('rooms').doc(roomId);
        await db.runTransaction(async (transaction) => {
            const roomDoc = await transaction.get(roomRef);
            if (roomDoc.exists) {
                const roomData = roomDoc.data();
                const players = roomData.players || {};
                
                // プレイヤーの位置情報を削除
                Object.keys(players).forEach(key => {
                    if (players[key].playerId === playerId) {
                        delete players[key];
                    }
                });

                transaction.update(roomRef, { players });
            }
        });
    }

    // 対戦開始ボタンの設定
    const startButtons = document.querySelectorAll('.start-button');
    startButtons.forEach((button, index) => {
        button.addEventListener('click', async function() {
            if (!button.disabled) {
                await handleGameStart(button, index);
            }
        });
    });

    // ゲーム開始処理
    async function handleGameStart(button, tableIndex) {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) {
            alert('プレイヤー情報が見つかりません');
            return;
        }

        try {
            const table = button.closest('.match-table');
            const tableNumber = table.dataset.table;

            // ゲーム情報の作成
            const gameId = `${roomId}-table${tableNumber}-${Date.now()}`;
            await createGameDocument(gameId, tableNumber);

            // 対戦画面への遷移
            const taisenUrl = new URL('../taisen.html', window.location.href);
            taisenUrl.searchParams.set('gameId', gameId);
            taisenUrl.searchParams.set('playerId', playerId);
            taisenUrl.searchParams.set('tableNumber', tableNumber);
            window.location.href = taisenUrl.toString();

        } catch (error) {
            console.error('対戦開始エラー:', error);
            alert('対戦開始に失敗しました');
        }
    }

    // ゲームドキュメントの作成
    async function createGameDocument(gameId, tableNumber) {
        const roomRef = db.collection('rooms').doc(roomId);
        const roomDoc = await roomRef.get();
        const roomData = roomDoc.data();

        // テーブルのプレイヤー情報を取得
        const tablePlayers = Object.entries(roomData.players || {})
            .filter(([key]) => key.startsWith(tableNumber))
            .reduce((acc, [key, value]) => {
                const position = key.split('-')[1];
                acc[position] = value;
                return acc;
            }, {});

        // 初期ゲーム状態の作成
        const gameState = {
            status: 'playing',
            players: {
                [tablePlayers['先攻'].playerId]: {
                    name: tablePlayers['先攻'].playerName,
                    hp: 10,
                    deck: [],
                    hand: [],
                    field: null,
                    godHandRemaining: 2
                },
                [tablePlayers['後攻'].playerId]: {
                    name: tablePlayers['後攻'].playerName,
                    hp: 10,
                    deck: [],
                    hand: [],
                    field: null,
                    godHandRemaining: 2
                }
            },
            currentTurn: tablePlayers['先攻'].playerId,
            turnTime: 60,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // ゲームドキュメントを作成
        await db.collection('games').doc(gameId).set(gameState);
    }

    // メニューバーのリンク設定
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const text = item.textContent.trim();
            handleMenuNavigation(text);
        });
    });

    // メニューナビゲーション処理
    function handleMenuNavigation(menuText) {
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

    // エラーハンドリング
    window.addEventListener('error', function(event) {
        console.error('エラーが発生しました:', event.error);
    });
});