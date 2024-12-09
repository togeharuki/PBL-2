// Firebaseの設定
const firebaseConfig = {
    projectId: "deck-dreamers",  // FirebaseプロジェクトID
    organizationId: "oic-ok.ac.jp",  // 組織ID
    projectNumber: "165933225805"  // プロジェクト番号
};

// Firebaseを初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();  // Firestoreデータベースへの参照を取得

// DOM要素の取得
const gachaButton = document.getElementById('gachaButton');  // ガチャボタン
const resetButton = document.getElementById('resetButton');  // 戻るボタン
const gachaResult = document.getElementById('gachaResult');  // ガチャ結果表示用テキストエリア
const gachaCapsule = document.getElementById('gachaCapsule');  // ガチャカプセルの要素
const gachaCapsuleImage = document.getElementById('gachaCapsuleImage');  // ガチャカプセルの画像
const endMessage = document.getElementById('endMessage');  // ガチャ終了メッセージ

// ガチャアイテムのデータ
// ガチャアイテムのデータ
const GACHA_ITEMS = [
    {
        name: '徳田家ののりちゃん',
        image: '写真/N-徳田家ののりちゃん.png',
        effect: '攻撃力+1',  // アイテムの効果
        count: 20,  // 残り個数
        rarity: 'N',  // レアリティ
        weight: 35  // 抽選時の重み（確率）
    },
    {
        name: '学祭のピザ',
        image: '写真/R-学祭のピザ.png',
        effect: '回復+1',  // アイテムの効果
        count: 10,  // 残り個数
        rarity: 'R',  // レアリティ
        weight: 30  // 抽選時の重み（確率）
    },
    {
        name: '先生集合',
        image: '写真/R-先生集合.png',
        effect: '攻撃力+1',  // アイテムの効果
        count: 10,  // 残り個数
        rarity: 'R',  // レアリティ
        weight: 30  // 抽選時の重み（確率）
    },
    {
        name: '二郎系',
        image: '写真/R-二郎系.png',
        effect: '攻撃力+1',  // アイテムの効果
        count: 10,  // 残り個数
        rarity: 'R',  // レアリティ
        weight: 30  // 抽選時の重み（確率）
    },
    {
        name: '河合家のりょうちゃん',
        image: '写真/SR-河合家のりょうちゃん.png',
        effect: '攻撃力+3',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '喜友名家のともちゃん',
        image: '写真/SR-喜友名家のともちゃん.png',
        effect: '攻撃力+3',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '金田家のしょうちゃん',
        image: '写真/SR-金田家のしょうちゃん.png',
        effect: '攻撃力+3',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '佐藤家のやまちゃん',
        image: '写真/SR-佐藤家のやまちゃん.png',
        effect: '攻撃力+3',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '中野家のてんちゃん',
        image: '写真/SR-中野家のてんちゃん.png',
        effect: '攻撃力+3',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: 'マーモット系男子',
        image: '写真/SSR-マーモット系男子.png',
        effect: '攻撃力+10',  // アイテムの効果
        count: 2,  // 残り個数
        rarity: 'SSR',  // レアリティ
        weight: 5  // 抽選時の重み（確率）
    },
    {
        name: '佐藤家のてんちゃん',
        image: '写真/SSR-佐藤家のてんちゃん.png',
        effect: '回復力+10',  // アイテムの効果
        count: 2,  // 残り個数
        rarity: 'SSR',  // レアリティ
        weight: 5  // 抽選時の重み（確率）
    },
];

let items = [];  // ガチャアイテムの状態（残り個数など）
let playerId = null;  // プレイヤーのID
let cardCounter = 1;  // カードIDのインクリメンタルカウンタ

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
        const cardId = `default_card_${cardCounter}`;  // インクリメンタルなカードIDを生成
        cardCounter++;  // カウンタをインクリメント
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
        alert('カードを追加できませんでした');
        throw error;
    }
}

// ガチャ結果を処理する関数
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
    resetButton.style.display = 'none';
    gachaButton.disabled = false;
    gachaButton.style.display = 'inline-block';
    gachaResult.value = '';
    gachaCapsuleImage.src = '写真/カードの裏面.png';
    gachaCapsule.style.animation = 'none';
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
    if (!hasAvailableItems) showEndMessage();
}

function showEndMessage() {
    endMessage.style.display = 'block';
    gachaButton.style.display = 'none';
    gachaResult.style.display = 'none';
}

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

// ガチャボタンがクリックされた時の処理
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

// リセットボタンがクリックされた時の処理
resetButton.addEventListener('click', resetGacha);

// エラーハンドリング（グローバルエラーハンドラー）
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
    showSuccessNotification('エラーが発生しました');
});

// 未処理のPromiseエラーをキャッチするハンドラー
window.addEventListener('unhandledrejection', function(event) {
    console.error('未処理のPromiseエラー:', event.reason);
    showSuccessNotification('エラーが発生しました');
});

