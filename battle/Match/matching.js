// Firebaseの設定
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

document.addEventListener('DOMContentLoaded', function() {
    // プレイヤーのテーブル位置を追跡するオブジェクト
    const tablePositions = {};

    // 既存のコード
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    const maxPlayers = urlParams.get('maxPlayers');

    // ルームIDを表示
    if (roomId) {
        document.querySelector('.room-id').textContent = `ルームID: ${roomId}`;
    }

    // プレイヤー数を更新
    if (maxPlayers) {
        document.getElementById('playerCapacity').textContent = maxPlayers;

        // メンバー数に応じてテーブルの表示を制御
        const matchTables = document.querySelectorAll('.match-table');
        matchTables.forEach((table, index) => {
            if (index < Math.floor(maxPlayers / 2)) {
                table.style.display = 'block';
            } else {
                table.style.display = 'none';
            }
        });
    }

    // Firestoreのルーム情報を監視
    if (roomId) {
        db.collection('rooms').doc(roomId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const roomData = doc.data();
                    // プレイヤーの位置情報を更新
                    Object.entries(roomData.players || {}).forEach(([playerId, data]) => {
                        const table = document.querySelector(`[data-table="${data.tableNumber}"]`);
                        if (table) {
                            const entryBox = table.querySelector('.entry-box');
                            const playerNameDisplay = entryBox.querySelector('.player-name-display') || 
                                                    document.createElement('div');
                            playerNameDisplay.className = 'player-name-display';
                            playerNameDisplay.textContent = data.playerName;
                            if (!entryBox.contains(playerNameDisplay)) {
                                entryBox.appendChild(playerNameDisplay);
                            }
                        }
                    });
                    updateStartButtons();
                }
            });
    }

    // マッチングテーブルのクリックイベント
    const matchTables = document.querySelectorAll('.match-table');
    matchTables.forEach(table => {
        const entryBox = table.querySelector('.entry-box');
        entryBox.addEventListener('click', async function() {
            const tableNumber = table.dataset.table;
            const playerId = localStorage.getItem('playerId');
            const playerName = localStorage.getItem('playerName');
            
            if (!playerId || !playerName) {
                alert('ログインしてください');
                return;
            }

            try {
                // Firestoreでルーム情報を更新
                const roomRef = db.collection('rooms').doc(roomId);
                await db.runTransaction(async (transaction) => {
                    const roomDoc = await transaction.get(roomRef);
                    if (!roomDoc.exists) {
                        throw new Error('ルームが存在しません');
                    }

                    const roomData = roomDoc.data();
                    const players = roomData.players || {};
                    
                    // 既に他のプレイヤーがいる場合はチェック
                    if (players[tableNumber] && players[tableNumber].playerId !== playerId) {
                        throw new Error('この位置は既に occupied です');
                    }

                    // 自分が他の位置にいる場合は削除
                    Object.keys(players).forEach(key => {
                        if (players[key].playerId === playerId) {
                            delete players[key];
                        }
                    });

                    // 新しい位置に追加
                    players[tableNumber] = {
                        playerId,
                        playerName,
                        tableNumber
                    };

                    transaction.update(roomRef, { players });
                });

                console.log(`プレイヤー ${playerName} がテーブル ${tableNumber} に配置されました`);
            } catch (error) {
                console.error('エラー:', error);
                alert(error.message);
            }
        });
    });
    // 退室ボタンのイベントリスナー
    document.querySelector('.exit-button').addEventListener('click', async function() {
        if (confirm('本当に退室しますか？')) {
            const playerId = localStorage.getItem('playerId');
            if (roomId && playerId) {
                try {
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
                } catch (error) {
                    console.error('退室エラー:', error);
                }
            }
            window.location.href = '../Room/room.html';
        }
    });

    // 対戦開始ボタンのイベント
    const startButtons = document.querySelectorAll('.start-button');
    startButtons.forEach((button, index) => {
        button.addEventListener('click', async function() {
            if (!button.disabled) {
                try {
                    const playerId = localStorage.getItem('playerId');
                    if (!playerId) {
                        alert('プレイヤー情報が見つかりません');
                        return;
                    }

                    const taisenUrl = new URL('../fight/taisen.html', window.location.href);
                    taisenUrl.searchParams.set('roomId', roomId);
                    taisenUrl.searchParams.set('maxPlayers', maxPlayers);
                    taisenUrl.searchParams.set('tableNumber', index + 1);
                    window.location.href = taisenUrl.toString();
                } catch (error) {
                    console.error('対戦開始エラー:', error);
                    alert('対戦開始に失敗しました');
                }
            }
        });
    });

    // メニューバーのリンクにイベントリスナーを追加
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const text = item.textContent.trim();

            // 現在のURLパラメータを維持するための処理
            const params = new URLSearchParams(window.location.search);
            const paramString = params.toString();
            const queryString = paramString ? `?${paramString}` : '';

            // テキストに応じて適切なページに遷移
            switch(text) {
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
        });
    });

    // 対戦開始ボタンの状態更新関数
    function updateStartButtons() {
        const matchTables = document.querySelectorAll('.match-table');
        matchTables.forEach(table => {
            const entryBox = table.querySelector('.entry-box');
            const playerNameDisplay = entryBox.querySelector('.player-name-display');
            const startButton = table.querySelector('.start-button');
            startButton.disabled = !playerNameDisplay || !playerNameDisplay.textContent;
        });
    }

    // ページ読み込み時に一度実行
    updateStartButtons();
});

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
});