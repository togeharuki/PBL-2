// Firebase設定
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

// DOM要素の取得
const receiveButton = document.getElementById('receive-button');
const successMessage = document.getElementById('success-message');
const cardImage = document.getElementById('card-image');
const cardName = document.getElementById('card-name');
const cardEffect = document.getElementById('card-effect');

// 隠しカードのデータ
const hiddenCard = {
    name: "伝説のカード",
    image: "https://togeharuki.github.io/Deck-Dreamers/kakusi/kami.jpg", 
    effect: "⚡ D:15 ⚡"
};

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', function() {
    // プレイヤーIDの取得
    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
        console.error('プレイヤー情報が見つかりません');
        alert('ログインしてください');
        window.location.href = '../../login.html';
        return;
    }

    // カードの表示を更新
    updateCardDisplay();

    // 受け取るボタンのイベントリスナー
    receiveButton.addEventListener('click', async () => {
        try {
            const isDuplicate = await checkDuplicateCard(playerId, hiddenCard.name);
            if (isDuplicate) {
                alert('このカードは既に所持しています');
                receiveButton.disabled = true;
                return;
            }

            await saveDefaultCard(playerId, hiddenCard);
            showSuccessMessage();
            receiveButton.disabled = true;
            setTimeout(() => {
                window.location.href = '../main/Menu/Menu.html'; 
            }, 2000);
        } catch (error) {
            console.error('カードの保存に失敗しました:', error);
            alert('カードの保存に失敗しました: ' + error.message);
        }
    });
});

// カードの表示を更新する関数
function updateCardDisplay() {
    cardImage.src = hiddenCard.image;
    cardName.textContent = hiddenCard.name;
    cardEffect.textContent = hiddenCard.effect;
}

// 重複カードをチェックする関数
async function checkDuplicateCard(playerId, cardName) {
    try {
        const soukoRef = db.collection('Souko').doc(playerId.toString());
        const doc = await soukoRef.get();

        if (!doc.exists) {
            return false;
        }

        const cardData = doc.data();
        return Object.values(cardData).some(card => card.name === cardName);
    } catch (error) {
        console.error('重複チェックに失敗しました:', error);
        throw error;
    }
}

// カードをデフォルトカードとしてSoukoに保存する関数
async function saveDefaultCard(playerId, card) {
    const cardId = `default_card_${Date.now()}`;
    const cardData = {
        name: card.name,
        image: card.image,
        effect: card.effect,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Soukoコレクションに保存
    const playerSoukoRef = db.collection('Souko').doc(playerId.toString());
    
    try {
        await playerSoukoRef.set({
            [cardId]: cardData
        }, { merge: true });
        console.log('デフォルトカードとして保存されました');
    } catch (error) {
        console.error('カードの保存中にエラーが発生しました:', error);
        throw error;
    }
}

// 成功メッセージを表示する関数
function showSuccessMessage() {
    successMessage.style.display = 'block';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
});