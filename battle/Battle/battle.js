function navigateTo(url) {
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';
    
    setTimeout(function() {
        window.location.href = url;
    }, 500);
}

// 既存のボタンイベントリスナー
document.getElementById('createCardButton').addEventListener('click', function() {
    navigateTo('../Card/card.html');
});

document.getElementById('backToMenuButton').addEventListener('click', function() {
    navigateTo('../Room/room.html');
});

document.getElementById('editDeckButton').addEventListener('click', function() {
    navigateTo('../Card/deck/deck.html');
});

// 追加した戻るボタンのイベントリスナー
document.getElementById('returnButton').addEventListener('click', function() {
    const menuUrl = 'https://togeharuki.github.io/Deck-Dreamers/main/Menu/Menu.html';
    
    // 現在のURLをチェックして相対パスを調整
    if (window.location.href.includes('battle/Battle/battle.html')) {
        navigateTo('../../main/Menu/Menu.html');
    } else {
        navigateTo(menuUrl);
    }
});

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('ナビゲーションエラー:', event.error);
});

// ページ読み込み完了時の処理
document.addEventListener('DOMContentLoaded', function() {
    // ボタンの存在確認
    const buttons = ['createCardButton', 'backToMenuButton', 'editDeckButton', 'returnButton'];
    buttons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (!button) {
            console.warn(`ボタンが見つかりません: ${buttonId}`);
        }
    });
});