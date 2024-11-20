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

    // マッチングテーブルのクリックイベント
    const matchTables = document.querySelectorAll('.match-table');
    matchTables.forEach(table => {
        table.addEventListener('click', async function() {
            const tableNumber = this.dataset.table;
            const playerId = localStorage.getItem('playerId');
            
            if (!playerId) {
                alert('ログインしてください');
                return;
            }

            try {
                // プレイヤー情報を取得
                const playerDoc = await db.collection('users').doc(playerId).get();
                if (!playerDoc.exists) {
                    alert('プレイヤー情報が見つかりません');
                    return;
                }

                const playerData = playerDoc.data();
                const playerName = playerData.name;

                // 既に別のテーブルにいる場合は、その位置から削除
                if (tablePositions[playerId]) {
                    const oldTable = document.querySelector(`[data-table="${tablePositions[playerId]}"]`);
                    if (oldTable) {
                        oldTable.querySelector('.player-name').textContent = '';
                    }
                }

                // 新しいテーブルに名前を表示
                this.querySelector('.player-name').textContent = playerName;
                tablePositions[playerId] = tableNumber;

                // 対戦開始ボタンの有効化を更新
                updateStartButtons();

                console.log(`プレイヤー ${playerName} がテーブル ${tableNumber} に配置されました`);
            } catch (error) {
                console.error('エラー:', error);
                alert('エラーが発生しました');
            }
        });
    });
    // 退室ボタンのイベントリスナー
    document.querySelector('.exit-button').addEventListener('click', function() {
        if (confirm('本当に退室しますか？')) {
            const playerId = localStorage.getItem('playerId');
            if (playerId && tablePositions[playerId]) {
                const myTable = document.querySelector(`[data-table="${tablePositions[playerId]}"]`);
                if (myTable) {
                    myTable.querySelector('.player-name').textContent = '';
                }
            }
            window.location.href = '../Room/room.html';
        }
    });

    // 対戦開始ボタンのイベント
    const startButtons = document.querySelectorAll('.start-button');
    startButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            if (!button.disabled) {
                const taisenUrl = new URL('../fight/taisen.html', window.location.href);
                taisenUrl.searchParams.set('roomId', roomId);
                taisenUrl.searchParams.set('maxPlayers', maxPlayers);
                taisenUrl.searchParams.set('tableNumber', index + 1);
                window.location.href = taisenUrl.toString();
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
            const playerName = table.querySelector('.player-name').textContent;
            const startButton = table.querySelector('.start-button');
            startButton.disabled = !playerName;
        });
    }

    // 定期的な更新を設定
    setInterval(updateStartButtons, 1000);

    // ページ読み込み時に一度実行
    updateStartButtons();
});

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
});