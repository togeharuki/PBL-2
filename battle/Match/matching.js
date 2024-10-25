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