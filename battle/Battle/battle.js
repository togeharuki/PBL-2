// サウンド再生関数
function playButtonSound() {
    const sound = document.getElementById('buttonSound');
    sound.currentTime = 0;
    sound.play();
}

function playCancelSound() {
    const sound = document.getElementById('cancelSound');
    sound.currentTime = 0;
    sound.play();
}

function navigateTo(url, isReturn = false) {
    // 効果音を再生
    if (isReturn) {
        playCancelSound();
    } else {
        playButtonSound();
    }
    
    // フェードアウト効果
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';
    
    // 効果音を再生してから遷移
    setTimeout(function() {
        window.location.href = url;
    }, 200);
}

// 各ボタンのイベントリスナー
document.getElementById('createCardButton').addEventListener('click', function() {
    navigateTo('../Card/card.html');
});

document.getElementById('backToMenuButton').addEventListener('click', function() {
    navigateTo('../Room/room.html');
});

document.getElementById('editDeckButton').addEventListener('click', function() {
    navigateTo('../Card/deck/deck.html');
});

// 戻るボタンのイベントリスナー
document.getElementById('returnButton').addEventListener('click', function() {
    const menuUrl = 'https://togeharuki.github.io/Deck-Dreamers/main/Menu/Menu.html';
    
    if (window.location.href.includes('battle/Battle/battle.html')) {
        navigateTo('../../main/Menu/Menu.html', true);  // キャンセル音を使用
    } else {
        navigateTo(menuUrl, true);  // キャンセル音を使用
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