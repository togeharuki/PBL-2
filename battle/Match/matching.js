// ルームIDをURLから取得
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
if (roomId) {
    document.querySelector('.room-id').textContent = `ルームID: ${roomId}`;
}

// 退室ボタンの処理
document.querySelector('.exit-button').addEventListener('click', () => {
    window.location.href = '../Room/room.html';
});

// エントリーボックスのクリックイベント
document.querySelectorAll('.entry-box').forEach(box => {
    box.addEventListener('click', () => {
        box.style.background = '#555';
    });
});

// 対戦開始ボタンのクリックイベント
document.querySelector('.start-button').addEventListener('click', () => {
    window.location.href = '../fight/taisen.html';
});

// メニューバーの各項目のクリックイベント
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault(); // デフォルトのリンク動作を防止
        
        // メニュー項目のテキストを取得して、対応するページに遷移
        const menuText = item.textContent.trim();
        switch (menuText) {
            case '設定':
                window.location.href = '../../Music/Music.html';
                break;
            case 'ルール説明':
                window.location.href = '../../main/Rule/Rule.html';
                break;
            case 'メニュー':
                window.location.href = '../../main/Menu/Menu.html';
                break;
        }
    });
});
