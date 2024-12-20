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

    // Firestoreのルーム情報をリアルタイムで監視
    if (roomId) {
        db.collection('rooms').doc(roomId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const roomData = doc.data();
                    // プレイヤーの位置情報を更新
                    Object.entries(roomData.players || {}).forEach(([playerId, data]) => {
                        const table = document.querySelector(`[data-table="${data.tableNumber}"]`);
                        if (table) {
                            const entryBox = table.querySelector(`[data-position="${data.position}"]`);
                            if (entryBox) {
                                // エントリーテキストを非表示
                                const entryText = entryBox.querySelector('.entry-text');
                                if (entryText) entryText.classList.add('hidden');

                                // プレイヤー名を表示
                                const playerNameDisplay = entryBox.querySelector('.player-name-display');
                                if (playerNameDisplay) {
                                    playerNameDisplay.textContent = data.playerName;
                                    playerNameDisplay.classList.add('visible');
                                }
                            }
                        }
                    });

                    // プレイヤー数の更新
                    const currentPlayers = Object.keys(roomData.players || {}).length;
                    document.getElementById('currentPlayers').textContent = currentPlayers;

                    updateStartButtons();
                }
            });
    }
    // マッチングテーブルのクリックイベント
    const matchTables = document.querySelectorAll('.match-table');
    matchTables.forEach(table => {
        const entryBoxes = table.querySelectorAll('.entry-box');
        entryBoxes.forEach(entryBox => {
            entryBox.addEventListener('click', async function() {
                const tableNumber = table.dataset.table;
                const position = this.dataset.position;
                const playerId = localStorage.getItem('playerId');
                const playerName = localStorage.getItem('playerName');
                
                if (!playerId || !playerName) {
                    alert('ログインしてください');
                    return;
                }

                // 効果音を再生
                const sound = document.getElementById('buttonSound');
                if (sound) {
                    sound.currentTime = 0;
                    sound.play().catch(error => {
                        console.error('効果音の再生に失敗:', error);
                    });
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
                        const positionKey = `${tableNumber}-${position}`;
                        if (players[positionKey] && players[positionKey].playerId !== playerId) {
                            throw new Error('この位置は既に選択されています');
                        }

                        // 自分が他の位置にいる場合は削除
                        Object.keys(players).forEach(key => {
                            if (players[key].playerId === playerId) {
                                delete players[key];
                                // 古い位置のUIを元に戻す
                                const [oldTable, oldPosition] = key.split('-');
                                const oldEntryBox = document.querySelector(
                                    `[data-table="${oldTable}"] [data-position="${oldPosition}"]`
                                );
                                if (oldEntryBox) {
                                    const oldEntryText = oldEntryBox.querySelector('.entry-text');
                                    const oldNameDisplay = oldEntryBox.querySelector('.player-name-display');
                                    if (oldEntryText) oldEntryText.classList.remove('hidden');
                                    if (oldNameDisplay) {
                                        oldNameDisplay.textContent = '';
                                        oldNameDisplay.classList.remove('visible');
                                    }
                                }
                            }
                        });

                        // 新しい位置に追加
                        players[positionKey] = {
                            playerId,
                            playerName,
                            tableNumber,
                            position
                        };

                        transaction.update(roomRef, { players });
                    });

                    console.log(`プレイヤー ${playerName} がテーブル ${tableNumber} の ${position} に配置されました`);
                } catch (error) {
                    console.error('エラー:', error);
                    alert(error.message);
                }
            });
        });
    });

    // 退室ボタンのイベントリスナー
    document.querySelector('.exit-button').addEventListener('click', async function() {
        if (confirm('本当に退室しますか？')) {
            // キャンセル音を再生
            const sound = document.getElementById('cancelSound');
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(error => {
                    console.error('効果音の再生に失敗:', error);
                });
            }

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

                            // プレイヤーが0人になったら、ルームを削除
                            if (Object.keys(players).length === 0) {
                                transaction.delete(roomRef);
                                console.log(`ルーム ${roomId} のプレイヤーが0人になったため、ルームを削除しました`);
                            } else {
                                transaction.update(roomRef, { players });
                            }
                        }
                    });

                    // フェードアウトと遷移
                    document.body.style.transition = 'opacity 0.5s';
                    document.body.style.opacity = '0';

                    setTimeout(() => {
                        window.location.href = '../Room/room.html';
                    }, 200);

                } catch (error) {
                    console.error('退室エラー:', error);
                    window.location.href = '../Room/room.html';
                }
            } else {
                window.location.href = '../Room/room.html';
            }
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

                    // 効果音を再生
                    const sound = document.getElementById('buttonSound');
                    if (sound) {
                        sound.currentTime = 0;
                        sound.play().catch(error => {
                            console.error('効果音の再生に失敗:', error);
                        });
                    }

                    const tableNumber = index + 1;
                    const roomRef = db.collection('rooms').doc(roomId);
                    const roomDoc = await roomRef.get();
                    
                    if (!roomDoc.exists) {
                        alert('ルーム情報が見つかりません');
                        return;
                    }

                    const roomData = roomDoc.data();
                    const players = roomData.players || {};
                    const tablePlayers = Object.values(players).filter(p => 
                        p.tableNumber === tableNumber.toString()
                    );

                    if (tablePlayers.length !== 2) {
                        alert('対戦相手が見つかりません');
                        return;
                    }

                    // 対戦画面へ遷移
                    const taisenUrl = new URL('../fight/taisen.html', window.location.href);
                    taisenUrl.searchParams.set('roomId', roomId);
                    taisenUrl.searchParams.set('tableNumber', tableNumber);
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

            const params = new URLSearchParams(window.location.search);
            const paramString = params.toString();
            const queryString = paramString ? `?${paramString}` : '';

            // メニューへの遷移はキャンセル音、それ以外は決定音
            const isReturn = text === 'メニュー';
            const sound = document.getElementById(isReturn ? 'cancelSound' : 'buttonSound');
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(error => {
                    console.error('効果音の再生に失敗:', error);
                });
            }

            // フェードアウトと遷移
            document.body.style.transition = 'opacity 0.5s';
            document.body.style.opacity = '0';

            setTimeout(() => {
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
            }, 200);
        });
    });

    // 対戦開始ボタンの状態更新関数
    function updateStartButtons() {
        const matchTables = document.querySelectorAll('.match-table');
        matchTables.forEach(table => {
            const playerNameDisplays = table.querySelectorAll('.player-name-display');
            const startButton = table.querySelector('.start-button');
            // テーブル内の全ての位置にプレイヤーがいるかチェック
            const isTableFull = Array.from(playerNameDisplays).every(display => 
                display.textContent && display.classList.contains('visible')
            );
            startButton.disabled = !isTableFull;
        });
    }
});

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
});