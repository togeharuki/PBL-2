// DOMの準備完了を待つ
document.addEventListener('DOMContentLoaded', function() {
    // グローバル変数
    let items = [];
    let playerId = null;

    // DOM要素の取得を関数化
    function initializeDOMElements() {
        return {
            gachaButton: document.getElementById('gachaButton'),
            resetButton: document.getElementById('resetButton'),
            gachaResult: document.getElementById('gachaResult'),
            gachaCapsule: document.getElementById('gachaCapsule'),
            gachaCapsuleImage: document.getElementById('gachaCapsuleImage'),
            endMessage: document.getElementById('endMessage')
        };
    }

    // DOM要素を取得
    const elements = initializeDOMElements();

    // Firebaseが利用可能か確認
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error('Firebase が初期化されていません');
        showSuccessNotification('システムエラーが発生しました');
        return;
    }

    // 以降の既存コードは elements.gachaButton のように参照する
    // ここに既存のコードを配置...
});