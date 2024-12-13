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

// ガチャアイテムのデータ
const GACHA_ITEMS = [
    {
        name: '徳田家ののりちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/N-%E5%BE%B3%E7%94%B0%E5%AE%B6%E3%81%AE%E3%81%AE%E3%82%8A%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+1',
        count: 20,
        rarity: 'N',
        explanation: '',
        weight: 35
    },
    {
        name: '学祭のピザ',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E5%AD%A6%E7%A5%AD%E3%81%AE%E3%83%94%E3%82%B6.png',
        effect: '回復+1',
        count: 10,
        rarity: 'R',
        explanation: '',
        weight: 30
    },
    {
        name: '二郎系',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E4%BA%8C%E9%83%8E%E7%B3%BB.png',
        effect: '攻撃力+1',
        count: 10,
        rarity: 'R',
        explanation: '',
        weight: 30
    },
    {
        name: '河合家のりょうちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E6%B2%B3%E5%90%88%E5%AE%B6%E3%81%AE%E3%82%8A%E3%82%87%E3%81%86%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',
        count: 5,
        rarity: 'SR',
        explanation: '',
        weight: 15
    },
    {
        name: '喜友名家のともちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E5%96%9C%E5%8F%8B%E5%90%8D%E5%AE%B6%E3%81%AE%E3%81%A8%E3%82%82%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',
        count: 5,
        rarity: 'SR',
        explanation: '',
        weight: 15
    },
    {
        name: '金田家のしょうちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E9%87%91%E7%94%B0%E5%AE%B6%E3%81%AE%E3%81%97%E3%82%87%E3%81%86%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',
        count: 5,
        rarity: 'SR',
        explanation: '',
        weight: 15
    },
    {
        name: '佐藤家のやまちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E4%BD%90%E8%97%A4%E5%AE%B6%E3%81%AE%E3%82%84%E3%81%BE%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',
        count: 5,
        rarity: 'SR',
        explanation: '',
        weight: 15
    },
    {
        name: '中野家のてんちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E4%B8%AD%E9%87%8E%E5%AE%B6%E3%81%AE%E3%81%A6%E3%82%93%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',
        count: 5,
        rarity: 'SR',
        explanation: '',
        weight: 15
    },
    {
        name: '先生集合',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E5%85%88%E7%94%9F%E9%9B%86%E5%90%88.png',
        effect: '攻撃力+3',
        count: 2,
        rarity: 'SSR',
        explanation: '',
        weight: 5
    },
    {
        name: 'マーモット系男子',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SSR-%E3%83%9E%E3%83%BC%E3%83%A2%E3%83%83%E3%83%88%E7%B3%BB%E7%94%B7%E5%AD%90.png',
        effect: '攻撃力+3',
        count: 2,
        rarity: 'SSR',
        explanation: '',
        weight: 5
    },
    {
        name: '佐藤家のてんちゃん',
        image: 'https://github.com/togeharuki/Deck-Dreamers/blob/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SSR-%E4%BD%90%E8%97%A4%E5%AE%B6%E3%81%AE%E3%81%A6%E3%82%93%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '回復力+3',
        count: 2,
        rarity: 'SSR',
        explanation: '',
        weight: 5
    },
];

// ガチャアイテムの状態（残り個数など）
let items = [...GACHA_ITEMS];
let playerId = null;  // プレイヤーのID

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

// ガチャアイテムをSoukoに追加する関数
async function addCardToSouko(card) {
    try {
        const soukoRef = db.collection('Souko').doc(playerId);

        // Firestoreにカードを追加
        await soukoRef.update({
            gachaItems: firebase.firestore.FieldValue.arrayUnion({
                name: card.name,
                image: card.image,
                effect: card.effect,
                rarity: card.rarity,
                explanation: card.explanation || '説明がありません',  // デフォルト値を設定
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }),
            savedCount: firebase.firestore.FieldValue.increment(1)  // 保存数をインクリメント
        });
    } catch (error) {
        console.error('カード追加エラー:', error);
        alert(`カードを追加できませんでした: ${error.message}`);
        throw error;
    }
}

// ガチャ結果を処理する関数
async function handleGachaResult() {
    const selectedItem = weightedRandomSelect();
    if (!selectedItem) {
        alert('在庫がありません。');
        return;
    }

    const itemIndex = items.findIndex(item => item.name === selectedItem.name);
    if (itemIndex !== -1) {
        items[itemIndex].count--;
    }

    try {
        await addCardToSouko(selectedItem);
        displayGachaResult(selectedItem); // 結果表示を別関数に切り出す
        updateButtonState();
    } catch (error) {
        console.error('結果処理エラー:', error);
        alert(`処理に失敗しました: ${error.message}`);
    }
}

// ガチャ結果を表示する関数
function displayGachaResult(selectedItem) {
    setTimeout(() => {
        gachaResult.value = `★${selectedItem.rarity}★\n${selectedItem.name}\n効果: ${selectedItem.effect}`;
        gachaCapsuleImage.src = selectedItem.image;
        displayItemsRemaining();
    }, 2000);
}

// 残りのアイテム数をコンソールに表示
function displayItemsRemaining() {
    console.clear();
    items.forEach(item => {
        console.log(`${item.rarity} ${item.name}: 残り ${item.count} 個`);
    });
}

// ボタンの状態を更新
function updateButtonState() {
    const hasAvailableItems = items.some(item => item.count > 0);
    gachaButton.disabled = !hasAvailableItems;
}

// ガチャボタンがクリックされた時の処理
gachaButton.addEventListener('click', async () => {
    try {
        gachaButton.disabled = true;
        await handleGachaResult();
    } catch (error) {
        console.error('ガチャ実行エラー:', error);
        alert('ガチャの実行に失敗しました');
        gachaButton.disabled = false;
    }
});

// リセットボタンがクリックされた時の処理
resetButton.addEventListener('click', resetGacha);

// ガチャをリセットする関数
function resetGacha() {
    resetButton.style.display = 'none';
    gachaButton.disabled = false;
    gachaButton.style.display = 'inline-block';
    gachaResult.value = '';
    gachaCapsuleImage.src = '写真/カードの裏面.png';
    gachaCapsule.style.animation = 'none';

    // 特定の画面に移行する
    window.location.href = '../../main/Menu/Menu.html';  // ここに遷移先のURLを指定
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
            await soukoRef.set({
                gachaItems: GACHA_ITEMS,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        items = soukoDoc.data().gachaItems || [];
        displayItemsRemaining();
        updateButtonState();
    } catch (error) {
        console.error('初期化エラー:', error);
        alert(`データの読み込みに失敗しました: ${error.message}`);
    }
}

// DOMが読み込まれた後に初期化を実行
document.addEventListener('DOMContentLoaded', initializeGacha);
