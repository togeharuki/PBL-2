document.addEventListener('DOMContentLoaded', function() {
    // URLからパラメータを取得
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

    // 退室ボタンのイベントリスナー
    document.querySelector('.exit-button').addEventListener('click', function() {
        if (confirm('本当に退室しますか？')) {
            window.location.href = '../Room/room.html';
        }
    });

    // エントリーボックスのクリックイベント
    const entryBoxes = document.querySelectorAll('.entry-box');
    entryBoxes.forEach(box => {
        box.addEventListener('click', function() {
            // ここにエントリー処理を追加
            console.log('Entry box clicked');
        });
    });

    // 対戦開始ボタンのイベント
    const startButtons = document.querySelectorAll('.start-button');
    startButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            if (!button.disabled) {
                // パラメータを維持したまま対戦ページに遷移
                const taisenUrl = new URL('../fight/taisen.html', window.location.href);
                taisenUrl.searchParams.set('roomId', roomId);
                taisenUrl.searchParams.set('maxPlayers', maxPlayers);
                taisenUrl.searchParams.set('tableNumber', index + 1); // テーブル番号を追加
                window.location.href = taisenUrl.toString();
            }
        });
    });
});