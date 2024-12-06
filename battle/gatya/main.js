// グローバル変数
let items = [];
let playerId = null;

// DOM要素の取得
const gachaButton = document.getElementById('gachaButton');
const resetButton = document.getElementById('resetButton');
const gachaResult = document.getElementById('gachaResult');
const gachaCapsule = document.getElementById('gachaCapsule');
const gachaCapsuleImage = document.getElementById('gachaCapsuleImage');
const endMessage = document.getElementById('endMessage');

// ガチャの初期化
async function initializeGacha() {
    playerId = localStorage.getItem('playerId');
    if (!playerId) {
        showSuccessNotification('ログインが必要です');
        window.location.href = '../login.html';
        return;
    }

    try {
        const soukoRef = db.collection('Souko').doc(playerId.toString());
        const soukoDoc = await soukoRef.get();

        if (!soukoDoc.exists || !soukoDoc.data().gachaItems) {
            const initialGachaData = {
                gachaItems: GACHA_ITEMS,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };
            await soukoRef.set(initialGachaData, { merge: true });
            items = [...GACHA_ITEMS];
        } else {
            items = soukoDoc.data().gachaItems;
        }

        displayItemsRemaining();
        updateButtonState();
    } catch (error) {
        console.error('初期化エラー:', error);
        showSuccessNotification('データの読み込みに失敗しました');
    }
}

// Soukoにカードを追加
async function addCardToSouko(card) {
    try {
        const soukoRef = db.collection('Souko').doc(playerId.toString());
        const cardId = `gacha_card_${Date.now()}`;
        await soukoRef.set({
            [`cards.${cardId}`]: {
                name: card.name,
                image: card.image,
                effect: card.effect,
                rarity: card.rarity,
                type: 'gacha',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        }, { merge: true });
    } catch (error) {
        console.error('カード追加エラー:', error);
        throw error;
    }
}

// Firestoreのデータ更新
async function updateGachaData() {
    if (!playerId) return;
    try {
        const soukoRef = db.collection('Souko').doc(playerId.toString());
        await soukoRef.update({
            gachaItems: items,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('データ更新成功:', playerId);
    } catch (error) {
        console.error('データ更新エラー:', error);
        console.error('エラーの詳細:', error.message);
        throw error;
    }
}

// 成功通知を表示する関数
function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgb(78, 205, 196);
        padding: 20px 40px;
        border-radius: 10px;
        color: white;
        text-align: center;
        z-index: 1000;
        font-size: 1.2em;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 2000);
}

// その他の関数は変更なし
// weightedRandomSelect, handleGachaResult, triggerGachaAnimation, resetGacha,
// displayItemsRemaining, updateButtonState, showEndMessage は既存のまま

// イベントリスナー
document.addEventListener('DOMContentLoaded', initializeGacha);

gachaButton.addEventListener('click', async () => {
    try {
        gachaButton.disabled = true;
        triggerGachaAnimation();
        await handleGachaResult();
    } catch (error) {
        console.error('ガチャ実行エラー:', error);
        showSuccessNotification('ガチャの実行に失敗しました');
        gachaButton.disabled = false;
    }
});

resetButton.addEventListener('click', resetGacha);

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
    showSuccessNotification('エラーが発生しました');
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('未処理のPromiseエラー:', event.reason);
    showSuccessNotification('エラーが発生しました');
});