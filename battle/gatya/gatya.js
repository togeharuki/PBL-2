const firebaseConfig = {
    projectId: "deck-dreamers",
    organizationId: "oic-ok.ac.jp",
    projectNumber: "165933225805"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const gachaButton = document.getElementById('gachaButton');
const resetButton = document.getElementById('resetButton');
const gachaResult = document.getElementById('gachaResult');
const gachaCapsule = document.getElementById('gachaCapsule');
const gachaCapsuleImage = document.getElementById('gachaCapsuleImage');
const endMessage = document.getElementById('endMessage');

const GACHA_ITEMS = [
    {
        name: '河合家のりょうちゃん',
        image: '写真/河合家のりょうちゃん.png',
        effect: '攻撃力+5',
        count: 2,
        rarity: 'SSR',
        weight: 5
    },
    {
        name: '金田家のしょうちゃん',
        image: '写真/金田家のしょうちゃん.png',
        effect: '攻撃力+3',
        count: 5,
        rarity: 'SR',
        weight: 10
    },
    {
        name: '佐藤家のてんちゃん',
        image: '写真/佐藤家のてんちゃん.png',
        effect: '攻撃力+1',
        count: 7,
        rarity: 'R',
        weight: 15
    },
    {
        name: '喜友名家のともちゃん',
        image: '写真/喜友名家のともちゃん.png',
        effect: '攻撃力+2',
        count: 7,
        rarity: 'R',
        weight: 15
    }
];

let items = [];
let playerId = null;

// カード抽選関数を追加
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

async function addCardToSouko(card) {
    try {
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
    } catch (error) {
        console.error('カード追加エラー:', error);
        throw error;
    }
}

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

window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
    showSuccessNotification('エラーが発生しました');
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('未処理のPromiseエラー:', event.reason);
    showSuccessNotification('エラーが発生しました');
});