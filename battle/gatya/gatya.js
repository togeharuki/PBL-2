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
        explanation: "",
        weight: 35,
    },
    // 他のアイテムに対しても説明を追加
];

// 省略...

// ガチャアイテムをSoukoに追加する関数
async function addCardToSouko(card) {
    try {
        const soukoRef = db.collection('Souko').doc(playerId);
        cardCounter++;  // カウンタをインクリメント
        const cardId = `default_card_${cardCounter}`;  // インクリメンタルなカードIDを生成

        // Firestoreにカードを追加し、保存数をインクリメント
        await soukoRef.set({
            [`${cardId}`]: {
                name: card.name,
                image: card.image,
                effect: card.effect,
                rarity: card.rarity,
                explanation: card.explanation || '説明がありません',  // デフォルト値を設定
                type: 'gacha',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            },
            savedCount: firebase.firestore.FieldValue.increment(100)  // 保存数をインクリメント
        }, { merge: true });
    } catch (error) {
        console.error('カード追加エラー:', error);
        alert(`カードを追加できませんでした: ${error.message}`);
        throw error;
    }
}

// 省略...


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
        await updateGachaData();

        setTimeout(() => {
            gachaResult.value = `★${selectedItem.rarity}★\n${selectedItem.name}\n効果: ${selectedItem.effect}`;
            gachaCapsuleImage.src = selectedItem.image;
            displayItemsRemaining();
            updateButtonState();
        }, 2000);
    } catch (error) {
        console.error('結果処理エラー:', error);
        alert(`処理に失敗しました: ${error.message}`);
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
        alert(`データを更新できませんでした: ${error.message}`);
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

// ボタンの状態を更新
function updateButtonState() {
    const hasAvailableItems = items.some(item => item.count > 0);
    gachaButton.disabled = !hasAvailableItems;
}

// ガチャボタンがクリックされた時の処理
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

// リセットボタンがクリックされた時の処理
resetButton.addEventListener('click', resetGacha);

// エラーハンドリング（グローバルエラーハンドラー）
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
    alert('エラーが発生しました');
});

// 未処理のPromiseエラーをキャッチするハンドラー
window.addEventListener('unhandledrejection', function(event) {
    console.error('未処理のPromiseエラー:', event.reason);
    alert('未処理のエラーが発生しました');
});
