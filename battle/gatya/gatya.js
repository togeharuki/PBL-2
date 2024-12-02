// Firebaseの設定
const firebaseConfig = {
    projectId: "deck-dreamers",
    organizationId: "oic-ok.ac.jp",
    projectNumber: "165933225805"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM要素の取得
const gachaButton = document.getElementById('gachaButton');
const resetButton = document.getElementById('resetButton');
const gachaResult = document.getElementById('gachaResult');
const gachaCapsule = document.getElementById('gachaCapsule');
const gachaCapsuleImage = document.getElementById('gachaCapsuleImage');
const endMessage = document.getElementById('endMessage');

// グローバル変数
let items = [];
let playerId = null;

// 初期化処理
async function initializeGacha() {
    playerId = localStorage.getItem('playerId');
    if (!playerId) {
        alert('ログインしてください');
        window.location.href = '../login.html';
        return;
    }

    try {
        const gachaRef = db.collection('Gacha').doc(playerId);
        const gachaDoc = await gachaRef.get();

        if (!gachaDoc.exists) {
            // 初期ガチャデータの設定
            const initialItems = [
                {
                    name: 'レアカード1',
                    image: '写真/カード1.png',
                    effect: '攻撃力+3',
                    count: 5,
                    rarity: 'rare',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                },
                {
                    name: 'ノーマルカード1',
                    image: '写真/カード2.png',
                    effect: '攻撃力+1',
                    count: 10,
                    rarity: 'normal',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }
            ];

            await gachaRef.set({
                items: initialItems,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            items = initialItems;
        } else {
            items = gachaDoc.data().items;
        }

        displayItemsRemaining();
    } catch (error) {
        console.error('初期化エラー:', error);
        alert('データの読み込みに失敗しました');
    }
}

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', initializeGacha);

// Firebaseのガチャデータを更新
async function updateGachaData() {
    if (!playerId) return;

    try {
        await db.collection('Gacha').doc(playerId).update({
            items: items,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('ガチャデータの更新に失敗:', error);
        throw error;
    }
}
// ガチャボタンのクリックイベント
gachaButton.addEventListener('click', async () => {
    try {
        triggerGachaAnimation();
        await handleGachaResult();
    } catch (error) {
        console.error('ガチャ実行エラー:', error);
        alert('ガチャの実行に失敗しました');
    }
});

// 戻るボタンのクリックイベント
resetButton.addEventListener('click', resetGacha);

// ガチャアニメーション処理
function triggerGachaAnimation() {
    gachaButton.classList.add('clicked');
    gachaButton.style.display = 'none';
    resetButton.style.display = 'inline-block';

    gachaCapsule.style.animation = 'none';
    void gachaCapsule.offsetWidth;
    gachaCapsule.style.animation = 'rotateCapsule 2s ease forwards';
}

// ガチャ結果処理
async function handleGachaResult() {
    let randomItem;
    do {
        randomItem = getRandomItem();
    } while (randomItem.count === 0);

    randomItem.count--;

    try {
        await updateGachaData();
        await addToCardCollection(randomItem);

        setTimeout(() => {
            gachaResult.value = `アイテム名: ${randomItem.name}\n効果: ${randomItem.effect}`;
            gachaCapsuleImage.src = randomItem.image;
            displayItemsRemaining();
            checkAllItemsOutOfStock();
        }, 2000);
    } catch (error) {
        console.error('結果処理エラー:', error);
        throw error;
    }
}

// カードコレクションに追加
async function addToCardCollection(item) {
    try {
        const cardRef = db.collection('Card').doc(playerId);
        const cardId = `card_${Date.now()}`;
        
        await cardRef.set({
            [cardId]: {
                name: item.name,
                image: item.image,
                effect: item.effect,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        }, { merge: true });
    } catch (error) {
        console.error('カード追加エラー:', error);
        throw error;
    }
}

// ランダムアイテム取得
function getRandomItem() {
    return items[Math.floor(Math.random() * items.length)];
}

// ガチャリセット
function resetGacha() {
    resetButton.style.display = 'none';
    gachaButton.style.display = 'inline-block';
    gachaResult.value = '';
    gachaResult.style.display = 'block';
    gachaCapsuleImage.src = '写真/カードの裏面.png';
    endMessage.style.display = 'none';
    gachaCapsule.style.transform = 'rotateY(0deg)';
}

// 残りアイテム表示
function displayItemsRemaining() {
    console.clear();
    items.forEach(item => {
        console.log(`${item.name}: 残り ${item.count} 個`);
        updateFirestoreItemCount(item);
    });
}

// Firestoreのアイテム数を更新
async function updateFirestoreItemCount(item) {
    try {
        const itemRef = db.collection('Gacha').doc(playerId);
        await itemRef.set({
            items: items,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('アイテム数の更新に失敗:', error);
    }
}

// 在庫切れチェック
async function checkAllItemsOutOfStock() {
    const allOutOfStock = items.every(item => item.count === 0);
    if (allOutOfStock) {
        endMessage.style.display = 'block';
        gachaButton.style.display = 'none';
        gachaResult.style.display = 'none';
        resetButton.style.display = 'inline-block';
        
        try {
            await resetGachaData();
        } catch (error) {
            console.error('ガチャリセットエラー:', error);
        }
    }
}

// ガチャデータのリセット
async function resetGachaData() {
    if (!playerId) return;

    try {
        const initialItems = [
            {
                name: 'レアカード1',
                image: '写真/カード1.png',
                effect: '攻撃力+3',
                count: 5,
                rarity: 'rare',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                name: 'ノーマルカード1',
                image: '写真/カード2.png',
                effect: '攻撃力+1',
                count: 10,
                rarity: 'normal',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        ];

        await db.collection('Gacha').doc(playerId).set({
            items: initialItems,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        items = initialItems;
    } catch (error) {
        console.error('ガチャリセットエラー:', error);
        throw error;
    }
}

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('グローバルエラー:', event.error);
});