// Firebaseの設定
const firebaseConfig = {
    projectId: "deck-dreamers",
    organizationId: "oic-ok.ac.jp",
    projectNumber: "165933225805"
};

// Firebaseを初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM要素の取得をDOMContentLoaded内で行う
document.addEventListener('DOMContentLoaded', () => {
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
    {
        name: '徳田家ののりちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/N-%E5%BE%B3%E7%94%B0%E5%AE%B6%E3%81%AE%E3%81%AE%E3%82%8A%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+1',  // アイテムの効果
        count: 20,  // 残り個数
        rarity: 'N',  // レアリティ
        weight: 35  // 抽選時の重み（確率）
    },
    {
        name: '学祭のピザ',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E5%AD%A6%E7%A5%AD%E3%81%AE%E3%83%94%E3%82%B6.png',
        effect: '回復+1',  // アイテムの効果
        count: 10,  // 残り個数
        rarity: 'R',  // レアリティ
        weight: 30  // 抽選時の重み（確率）
    },
    {
        name: '二郎系',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E4%BA%8C%E9%83%8E%E7%B3%BB.png',
        effect: '攻撃力+1',  // アイテムの効果
        count: 10,  // 残り個数
        rarity: 'R',  // レアリティ
        weight: 30  // 抽選時の重み（確率）
    },
    {
        name: '河合家のりょうちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E6%B2%B3%E5%90%88%E5%AE%B6%E3%81%AE%E3%82%8A%E3%82%87%E3%81%86%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '喜友名家のともちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E5%96%9C%E5%8F%8B%E5%90%8D%E5%AE%B6%E3%81%AE%E3%81%A8%E3%82%82%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '金田家のしょうちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E9%87%91%E7%94%B0%E5%AE%B6%E3%81%AE%E3%81%97%E3%82%87%E3%81%86%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '佐藤家のやまちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E4%BD%90%E8%97%A4%E5%AE%B6%E3%81%AE%E3%82%84%E3%81%BE%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '中野家のてんちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E4%B8%AD%E9%87%8E%E5%AE%B6%E3%81%AE%E3%81%A6%E3%82%93%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '先生集合',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E5%85%88%E7%94%9F%E9%9B%86%E5%90%88.png',
        effect: '攻撃力+3',  // アイテムの効果
        count: 2,  // 残り個数
        rarity: 'SSR',  // レアリティ
        weight: 5  // 抽選時の重み（確率）
    },
    {
        name: 'マーモット系男子',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SSR-%E3%83%9E%E3%83%BC%E3%83%A2%E3%83%83%E3%83%88%E7%B3%BB%E7%94%B7%E5%AD%90.png',
        effect: '攻撃力+3',  // アイテムの効果
        count: 2,  // 残り個数
        rarity: 'SSR',  // レアリティ
        weight: 5  // 抽選時の重み（確率）
    },
    {
        name: '佐藤家のてんちゃん',
        image: 'https://github.com/togeharuki/Deck-Dreamers/blob/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SSR-%E4%BD%90%E8%97%A4%E5%AE%B6%E3%81%AE%E3%81%A6%E3%82%93%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '回復力+3',  // アイテムの効果
        count: 2,  // 残り個数
        rarity: 'SSR',  // レアリティ
        weight: 5  // 抽選時の重み（確率）
    },
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
    initializeGacha();
});

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
