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
const GACHA_ITEMS = [
    {
        name: '先生集合',
        image: '写真/R-先生集合.png',
        effect: '攻撃力+1',  // アイテムの効果
        count: 10,  // 残り個数
        rarity: 'R',  // レアリティ
        weight: 20  // 抽選時の重み（確率）
    },
    {
        name: '河合家のりょうちゃん',
        image: '写真/SR-河合家のりょうちゃん.png',
        effect: '攻撃力+5',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 10  // 抽選時の重み（確率）
    },
    {
        name: '金田家のしょうちゃん',
        image: '写真/SR-金田家のしょうちゃん.png',
        effect: '攻撃力+3',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 10  // 抽選時の重み（確率）
    },
    {
        name: '喜友名家のともちゃん',
        image: '写真/SR-喜友名家のともちゃん.png',
        effect: '攻撃力+2',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        weight: 10  // 抽選時の重み（確率）
    },
    {
        name: '佐藤家のてんちゃん',
        image: '写真/SSR-佐藤家のてんちゃん.png',
        effect: '回復+10',  // アイテムの効果
        count: 2,  // 残り個数
        rarity: 'SSR',  // レアリティ
        weight: 2  // 抽選時の重み（確率）
    },
];

let items = [];  // ガチャアイテムの状態（残り個数など）
let playerId = null;  // プレイヤーのID

// アイテムを重み付けでランダムに選ぶ関数
function weightedRandomSelect() {
    // 残っているアイテムをフィルター
    const availableItems = items.filter(item => item.count > 0);
    if (availableItems.length === 0) return null;  // すべてなくなった場合はnullを返す

    // アイテムの重みの合計を計算
    const totalWeight = availableItems.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;  // ランダムな数を生成

    // 重み付けに従ってアイテムを選択
    for (const item of availableItems) {
        random -= item.weight;
        if (random <= 0) {
            return item;  // 選ばれたアイテムを返す
        }
    }
    return availableItems[0];  // 何らかの理由で選ばれなかった場合（通常あり得ない）
}

// ガチャの初期化
async function initializeGacha() {
    playerId = localStorage.getItem('playerId');  // ローカルストレージからプレイヤーIDを取得
    if (!playerId) {
        alert('ログインが必要です');
        window.location.href = '../login.html';  // ログインページにリダイレクト
        return;
    }

    try {
        // Firestoreからプレイヤーのデータを取得
        const soukoRef = db.collection('Souko').doc(playerId);
        const soukoDoc = await soukoRef.get();

        // プレイヤーがガチャアイテムを持っていない場合、初期データを設定
        if (!soukoDoc.exists || !soukoDoc.data().gachaItems) {
            const initialGachaData = {
                gachaItems: GACHA_ITEMS,  // 初期アイテムを設定
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()  // 最終更新日時を記録
            };
            await soukoRef.set(initialGachaData, { merge: true });
            items = [...GACHA_ITEMS];  // アイテムの状態を初期化
        } else {
            items = soukoDoc.data().gachaItems;  // Firestoreからアイテムの状態を取得
        }

        displayItemsRemaining();  // 残りのアイテム数を表示
        updateButtonState();  // ボタンの状態を更新
    } catch (error) {
        console.error('初期化エラー:', error);
        alert('データの読み込みに失敗しました');
    }
}
document.addEventListener('DOMContentLoaded', initializeGacha);  // ページ読み込み時に初期化

// ガチャアイテムをSoukoに追加する関数
async function addCardToSouko(card) {
    try {
        const soukoRef = db.collection('Souko').doc(playerId);
        const cardId = `gacha_card_${Date.now()}`;  // ユニークなカードIDを生成
        await soukoRef.set({
            [`cards.${cardId}`]: {
                name: card.name,
                image: card.image,
                effect: card.effect,
                rarity: card.rarity,
                type: 'gacha',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()  // タイムスタンプを追加
            }
        }, { merge: true });
    } catch (error) {
        console.error('カード追加エラー:', error);
        throw error;
    }
}

// ガチャ結果を処理する関数
async function handleGachaResult() {
    const selectedItem = weightedRandomSelect();  // アイテムをランダムに選ぶ
    if (!selectedItem) {
        showEndMessage();  // アイテムがない場合、終了メッセージを表示
        return;
    }

    // 選ばれたアイテムの数を減らす
    const itemIndex = items.findIndex(item => item.name === selectedItem.name);
    if (itemIndex !== -1) {
        items[itemIndex].count--;
    }

    try {
        await addCardToSouko(selectedItem);  // Firestoreにカードを追加
        await updateGachaData();  // ガチャデータを更新

        // 結果を表示
        setTimeout(() => {
            gachaResult.value = `★${selectedItem.rarity}★\n${selectedItem.name}\n効果: ${selectedItem.effect}`;
            gachaCapsuleImage.src = selectedItem.image;  // 画像を更新
            displayItemsRemaining();  // 残りのアイテム数を表示
            updateButtonState();  // ボタンの状態を更新
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
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()  // 更新日時を設定
        });
    } catch (error) {
        console.error('データ更新エラー:', error);
        throw error;
    }
}

// ガチャのアニメーションを開始する関数
function triggerGachaAnimation() {
    gachaButton.style.display = 'none';  // ガチャボタンを隠す
    resetButton.style.display = 'inline-block';  // 戻るボタンを表示
    gachaCapsule.style.animation = 'rotateCapsule 2s ease forwards';  // カプセルを回転させるアニメーション
}

// ガチャをリセットする関数
function resetGacha() {
    resetButton.style.display = 'none';  // 戻るボタンを隠す
    gachaButton.disabled = false;  // ガチャボタンを有効化
    gachaButton.style.display = 'inline-block';  // ガチャボタンを表示
    gachaResult.value = '';  // 結果をクリア
    gachaCapsuleImage.src = '写真/カードの裏面.png';  // 画像を元に戻す
    gachaCapsule.style.animation = 'none';  // アニメーションをリセット
}

// 残りのアイテム数をコンソールに表示
function displayItemsRemaining() {
    console.clear();  // コンソールをクリア
    items.forEach(item => {
        console.log(`${item.rarity} ${item.name}: 残り ${item.count} 個`);  // 各アイテムの残り数を表示
    });
}

// ボタンの状態を更新する関数（アイテムが無くなった場合、ガチャボタンを無効化）
function updateButtonState() {
    const hasAvailableItems = items.some(item => item.count > 0);  // 残りアイテムがあるかチェック
    gachaButton.disabled = !hasAvailableItems;  // アイテムが残っていない場合、ボタンを無効化
    if (!hasAvailableItems) showEndMessage();  // アイテムが無ければ終了メッセージを表示
}

// ガチャ終了メッセージを表示
function showEndMessage() {
    endMessage.style.display = 'block';  // 終了メッセージを表示
    gachaButton.style.display = 'none';  // ガチャボタンを非表示
    gachaResult.style.display = 'none';  // 結果表示を非表示
}

// 成功通知を表示する関数
function showSuccessNotification(message) {
    const notification = document.createElement('div');  // 通知用の要素を作成
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
    document.body.appendChild(notification);  // 通知を表示
    setTimeout(() => {
        notification.style.opacity = '0';  // 通知をフェードアウト
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => notification.remove(), 500);  // フェードアウト後に削除
    }, 2000);
}

// ガチャボタンがクリックされた時の処理
gachaButton.addEventListener('click', async () => {
    try {
        gachaButton.disabled = true;  // ガチャボタンを無効化
        triggerGachaAnimation();  // アニメーションを開始
        await handleGachaResult();  // ガチャ結果を処理
    } catch (error) {
        console.error('ガチャ実行エラー:', error);
        showSuccessNotification('ガチャの実行に失敗しました');
        gachaButton.disabled = false;  // ボタンを再度有効化
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