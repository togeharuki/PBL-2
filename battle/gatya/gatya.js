// Firebaseの設定と初期化
const firebaseConfig = {
    projectId: "deck-dreamers",
    organizationId: "oic-ok.ac.jp",
    projectNumber: "165933225805"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM要素の取得
const gachaButton = document.getElementById('gachaButton');
const resetButton = document.getElementById('resetButton');
const gachaResult = document.getElementById('gachaResult');
const gachaCapsule = document.getElementById('gachaCapsule');
const gachaCapsuleImage = document.getElementById('gachaCapsuleImage');
const endMessage = document.getElementById('endMessage');

// ガチャアイテムの定義
const GACHA_ITEMS = [
    {
        name: 'SSRカード',
        image: '写真/カード1.png',
        effect: '攻撃力+5',
        count: 3,
        rarity: 'SSR',
        weight: 5
    },
    {
        name: 'SRカード',
        image: '写真/カード2.png',
        effect: '攻撃力+3',
        count: 7,
        rarity: 'SR',
        weight: 15
    },
    {
        name: 'Rカード',
        image: '写真/カード3.png',
        effect: '攻撃力+1',
        count: 10,
        rarity: 'R',
        weight: 30
    }
];

let items = [];
let playerId = null;

// 初期化処理
async function initializeGacha() {
    playerId = localStorage.getItem('playerId');
    if (!playerId) {
        alert('ログインが必要です');
        window.location.href = '../login.html';
        return;
    }

    try {
        const soukoRef = db.collection('Souko').doc(playerId);
        const soukoDoc = await soukoRef.get();

        if (!soukoDoc.exists) {
            // 初期データの設定
            const initialGachaData = {
                gachaItems: GACHA_ITEMS,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };
            await soukoRef.set(initialGachaData);
            items = [...GACHA_ITEMS];
        } else {
            // 既存のガチャデータを取得
            items = soukoDoc.data().gachaItems || [...GACHA_ITEMS];
        }

        displayItemsRemaining();
        updateButtonState();
    } catch (error) {
        console.error('初期化エラー:', error);
        alert('データの読み込みに失敗しました');
    }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', initializeGacha);

// カードを倉庫に追加する関数
async function addCardToSouko(card) {
    try {
        const soukoRef = db.collection('Souko').doc(playerId);

        // 既存のカードリストを取得
        const soukoDoc = await soukoRef.get();
        let existingCards = soukoDoc.data().cards || {};

        // カードIDを生成
        const cardId = `gacha_card_${Date.now()}`;

        // カードを既存のリストに追加
        existingCards[cardId] = {
            name: card.name,
            image: card.image,
            effect: card.effect,
            rarity: card.rarity,
            type: 'gacha',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // 倉庫のデータを更新
        await soukoRef.set({
            cards: existingCards,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('カード追加エラー:', error);
        throw error;
    }
}

// ガチャ結果の処理
async function handleGachaResult() {
    const selectedItem = weightedRandomSelect();
    if (!selectedItem) {
        showEndMessage();
        return;
    }

    // 在庫を減らす
    const itemIndex = items.findIndex(item => item.name === selectedItem.name);
    if (itemIndex !== -1) {
        items[itemIndex].count--;
    }

    try {
        // 倉庫にカードを追加
        await addCardToSouko(selectedItem);
        
        // ガチャデータを更新
        await updateGachaData();

        // 結果表示
        setTimeout(() => {
            gachaResult.value = `★${selectedItem.rarity}★\n${selectedItem.name}\n効果: ${selectedItem.effect}`;
            gachaCapsuleImage.src = selectedItem.image;
            displayItemsRemaining();
            updateButtonState();
        }, 2000);

    } catch (error) {
        console.error('結果処理エラー:', error);
        alert('処理に失敗しました');
    }
}

// 重み付き抽選
function weightedRandomSelect() {
    const availableItems = items.filter(item => item.count > 0);
    if (availableItems.length === 0) return null;

    const totalWeight = availableItems.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of availableItems) {
        random -= item.weight;
        if (random <= 0) {
            return item;
        }
    }
    return availableItems[0];
}

// ガチャデータの更新
async function updateGachaData() {
    if (!playerId) return;

    try {
        const soukoRef = db.collection('Souko').doc(playerId);
        await soukoRef.update({
            gachaItems: items,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('データ更新エラー:', error);
        throw error;
    }
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

function displayItemsRemaining() {
    console.clear();
    items.forEach(item => {
        console.log(`${item.rarity} ${item.name}: 残り ${item.count} 個`);
    });
}

function updateButtonState() {
    const hasAvailableItems = items.some(item => item.count > 0);
    gachaButton.disabled = !hasAvailableItems;
    
    if (!hasAvailableItems) {
        showEndMessage();
    }
}

function showEndMessage() {
    endMessage.style.display = 'block';
    gachaButton.style.display = 'none';
    gachaResult.style.display = 'none';
}

// イベントリスナー
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
