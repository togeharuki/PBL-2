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
const resultArea = document.getElementById('resultArea');
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
        window.location.href = '../../login.html';
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
                    image: '写真/Deck.png',
                    effect: '攻撃力+3',
                    count: 5,
                    rarity: 'rare',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                },
                {
                    name: 'ノーマルカード1',
                    image: '写真/Deck.png',
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
        // Firebaseのデータを更新
        await updateGachaData();

        // カードコレクションに追加
        await addToCardCollection(randomItem);

        setTimeout(() => {
            resultArea.value = `アイテム名: ${randomItem.name}\n効果: ${randomItem.effect}`;
            gachaCapsuleImage.src = randomItem.image;

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
                elements.gachaResult.value = `★${selectedItem.rarity}★\n${selectedItem.name}\n効果: ${selectedItem.effect}`;
                elements.gachaCapsuleImage.src = selectedItem.image;
                displayItemsRemaining();
                updateButtonState();
            }, 2000);
        } catch (error) {
            console.error('結果処理エラー:', error);
            showSuccessNotification('処理に失敗しました');
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

    // UI操作関連の関数
    function triggerGachaAnimation() {
        elements.gachaButton.style.display = 'none';
        elements.resetButton.style.display = 'inline-block';
        elements.gachaCapsule.style.animation = 'rotateCapsule 2s ease forwards';
    }

function resetGacha() {
    resetButton.style.display = 'none';
    gachaButton.style.display = 'inline-block';
    resultArea.value = '';
    resultArea.style.display = 'block';
    gachaCapsuleImage.src = '写真/カードの裏面.png';
    endMessage.style.display = 'none';
    gachaCapsule.style.transform = 'rotateY(0deg)';
}

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
        const itemRef = db.collection('Gacha').doc(playerId).collection('items').doc(item.name);
        await itemRef.set({
            count: item.count,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('アイテム数の更新に失敗:', error);
    }
}

function checkAllItemsOutOfStock() {
    const allOutOfStock = items.every(item => item.count === 0);
    if (allOutOfStock) {
        endMessage.style.display = 'block';
        gachaButton.style.display = 'none';
        resultArea.style.display = 'none';
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
                image: '写真/Deck.png',
                effect: '攻撃力+3',
                count: 5,
                rarity: 'rare',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                name: 'ノーマルカード1',
                image: '写真/Deck.png',
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

