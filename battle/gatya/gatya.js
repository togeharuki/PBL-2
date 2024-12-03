// Firebase設定
const firebaseConfig = {
    projectId: "deck-dreamers",
    organizationId: "oic-ok.ac.jp",
    projectNumber: "165933225805"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM要素
const gachaButton = document.getElementById('gachaButton');
const resetButton = document.getElementById('resetButton');
const gachaResult = document.getElementById('gachaResult');
const gachaCapsule = document.getElementById('gachaCapsule');
const gachaCapsuleImage = document.getElementById('gachaCapsuleImage');
const endMessage = document.getElementById('endMessage');

// ガチャアイテム定義
const GACHA_ITEMS = [
    {
        name: '河合家のりょうちゃん',
        image: '写真/河合家のりょうちゃん.png',
        effect: '攻撃力+5',
        count: 3,
        rarity: 'SSR',
        weight: 5
    },
    {
        name: '金田家のしょうちゃん',
        image: '写真/金田家のしょうちゃん.png',
        effect: '攻撃力+3',
        count: 7,
        rarity: 'SR',
        weight: 15
    },
    {
        name: '佐藤家のてんちゃん',
        image: '写真/佐藤家のてんちゃん.png',
        effect: '攻撃力+1',
        count: 10,
        rarity: 'R',
        weight: 30
    }
];

let items = [];
let playerId = null;

// カードの重複チェック
async function isCardDuplicate(card) {
    const soukoRef = db.collection('Souko').doc(playerId);
    const doc = await soukoRef.get();
    if (!doc.exists) return false;

    const existingCards = doc.data().cards || {};
    return Object.values(existingCards).some(existingCard => 
        existingCard.name === card.name && 
        existingCard.type === 'gacha'
    );
}

// カードを倉庫に追加
async function addCardToSouko(card) {
    try {
        if (await isCardDuplicate(card)) {
            console.log('このカードは既に所持しています');
            return false;
        }

        const soukoRef = db.collection('Souko').doc(playerId);
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

        return true;
    } catch (error) {
        console.error('カード追加エラー:', error);
        throw error;
    }
}
// ガチャ結果処理
async function handleGachaResult() {
    const selectedItem = weightedRandomSelect();
    if (!selectedItem) {
        showEndMessage();
        return;
    }

    const itemIndex = items.findIndex(item => item.name === selectedItem.name);
    if (itemIndex !== -1) {
        items[itemIndex].count--;
    }

    try {
        const cardAdded = await addCardToSouko(selectedItem);
        if (cardAdded) {
            await updateGachaData();
            setTimeout(() => {
                gachaResult.value = `★${selectedItem.rarity}★\n${selectedItem.name}\n効果: ${selectedItem.effect}`;
                gachaCapsuleImage.src = selectedItem.image;
                displayItemsRemaining();
                updateButtonState();
            }, 2000);
        } else {
            showDuplicateMessage();
            items[itemIndex].count++; // カウントを戻す
            resetGacha();
        }
    } catch (error) {
        console.error('結果処理エラー:', error);
        alert('処理に失敗しました');
    }
}

// 重複メッセージ表示
function showDuplicateMessage() {
    const message = document.createElement('div');
    message.className = 'duplicate-message';
    message.textContent = 'このカードは既に所持しています';
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff6b6b;
        padding: 20px;
        border-radius: 10px;
        color: white;
        z-index: 1000;
    `;
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 2000);
}

// UI関連の関数
function triggerGachaAnimation() {
    gachaButton.style.display = 'none';
    resetButton.style.display = 'inline-block';
    gachaCapsule.style.animation = 'rotateCapsule 2s ease forwards';
}

function resetGacha() {
    resetButton.style.display = 'none';
    gachaButton.disabled = false;
    gachaButton.style.display = 'inline-block';
    gachaResult.value = '';
    gachaCapsuleImage.src = '写真/カードの裏面.png';
    gachaCapsule.style.animation = 'none';
}

// その他のイベントリスナーとエラーハンドリング
gachaButton.addEventListener('click', async () => {
    try {
        gachaButton.disabled = true;
        triggerGachaAnimation();
        await handleGachaResult();
    } catch (error) {
        console.error('ガチャ実行エラー:', error);
        alert('ガチャの実行に失敗しました');
        gachaButton.disabled = false;
    }
});

resetButton.addEventListener('click', resetGacha);

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
});