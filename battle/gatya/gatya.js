// Firebaseの設定
const firebaseConfig = {
    projectId: "deck-dreamers",
    organizationId: "oic-ok.ac.jp",
    projectNumber: "165933225805"
};

// Firebaseを初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM要素の取得
const gachaButton = document.getElementById('gachaButton');
const resetButton = document.getElementById('resetButton');
const gachaResult = document.getElementById('gachaResult');
const gachaCapsule = document.getElementById('gachaCapsule');
const gachaCapsuleImage = document.getElementById('gachaCapsuleImage');
const endMessage = document.getElementById('endMessage');

let items = [];  // ガチャアイテムの状態（残り個数など）
let playerId = null;  // プレイヤーのID
let cardCounter = 1;  // カードIDのインクリメンタルカウンタ

// ガチャアイテムのデータ
const GACHA_ITEMS = [
    // (ここにアイテムデータが続きます)
];

// アイテムを重み付けでランダムに選ぶ関数
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

// ガチャの初期化
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
        alert('データの読み込みに失敗しました');
    }
}
document.addEventListener('DOMContentLoaded', initializeGacha);

// ガチャアイテムをSoukoに追加する関数
async function addCardToSouko(card) {
    try {
        const soukoRef = db.collection('Souko').doc(playerId);
        cardCounter++;
        const cardId = `default_card_0${cardCounter}_gacha`;

        await soukoRef.set({
            [`${cardId}`]: {
                name: card.name,
                image: card.image,
                effect: card.effect,
                rarity: card.rarity,
                type: 'gacha',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            },
            savedCount: firebase.firestore.FieldValue.increment(100)
        }, { merge: true });
    } catch (error) {
        console.error('カード追加エラー:', error);
        alert('カードを追加できませんでした');
        throw error;
    }
}

// ガチャ結果を処理する関数
async function handleGachaResult() {
    const selectedItem = weightedRandomSelect();
    if (!selectedItem) {
        // 在庫がない場合の処理は削除しました
        return;
    }

    const itemIndex = items.findIndex(item => item.name === selectedItem.name);
    if (itemIndex !== -1) {
        items[itemIndex].count--;
        if (items[itemIndex].count < 0) {
            items[itemIndex].count = 0; // カウントが負にならないようにする
        }
    }

    try {
        await addCardToSouko(selectedItem);
        await updateGachaData();

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

// Firestoreのガチャデータを更新する関数
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
        alert('データを更新できませんでした');
        throw error;
    }
}

// ガチャのアニメーションを開始する関数
function triggerGachaAnimation() {
    gachaButton.style.display = 'none';
    resetButton.style.display = 'inline-block';
    gachaCapsule.style.animation = 'rotateCapsule 2s ease forwards';
}

// ガチャをリセットする関数
function resetGacha() {
    window.location.href = '../../main/Menu/Menu.html'; // ホームページにリダイレクト
}

// 残りのアイテム数をコンソールに表示
function displayItemsRemaining() {
    console.clear();
    items.forEach(item => {
        console.log(`${item.rarity} ${item.name}: 残り ${item.count} 個`);
    });
}

function updateButtonState() {
    const hasAvailableItems = items.some(item => item.count > 0);
    gachaButton.disabled = !hasAvailableItems;
    endMessage.style.display = 'none'; // 在庫がある場合はメッセージを非表示
}

function showEndMessage() {
    endMessage.style.display = 'block';
    gachaButton.style.display = 'none';
    gachaResult.style.display = 'none';
}

// ガチャボタンがクリックされた時の処理
gachaButton.addEventListener('click', async () => {
    try {
        gachaButton.disabled = true;
        triggerGachaAnimation();
        await handleGachaResult();
    } catch (error) {
        console.error('ガチャ実行エラー:', error);
        gachaButton.disabled = false;
    }
});

// リセットボタンがクリックされた時の処理
resetButton.addEventListener('click', resetGacha);

// エラーハンドリング（グローバルエラーハンドラー）
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
});

// 未処理のPromiseエラーをキャッチするハンドラー
window.addEventListener('unhandledrejection', function(event) {
    console.error('未処理のPromiseエラー:', event.reason);
});
