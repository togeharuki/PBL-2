// Firebaseの設定
const firebaseConfig = {
    projectId: "deck-dreamers",  // FirebaseプロジェクトID
    organizationId: "oic-ok.ac.jp",  // 組織ID
    projectNumber: "165933225805"  // プロジェクト番号
};

// ガチャアイテムのデータ
const GACHA_ITEMS = [
    { name: '徳田家ののりちゃん', image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/N-%E5%BE%B3%E7%94%B0%E5%AE%B6%E3%81%AE%E3%81%AE%E3%82%8A%E3%81%A1%E3%82%83%E3%82%93.png', effect: '攻撃力+1', count: 20, rarity: 'N', weight: 35 },
    { name: '学祭のピザ', image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E5%AD%A6%E7%A5%AD%E3%81%AE%E3%83%94%E3%82%B6.png', effect: '回復+1', count: 10, rarity: 'R', weight: 30 },
    { name: '二郎系', image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E4%BA%8C%E9%83%8E%E7%B3%BB.png', effect: '攻撃力+1', count: 10, rarity: 'R', weight: 30 },
    { name: '河合家のりょうちゃん', image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E6%B2%B3%E5%90%88%E5%AE%B6%E3%81%AE%E3%82%8A%E3%82%87%E3%81%86%E3%81%A1%E3%82%83%E3%82%93.png', effect: '攻撃力+2', count: 5, rarity: 'SR', weight: 15 },
    { name: '喜友名家のともちゃん', image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E5%96%9C%E5%8F%8B%E5%90%8D%E5%AE%B6%E3%81%AE%E3%81%A8%E3%82%82%E3%81%A1%E3%82%83%E3%82%93.png', effect: '攻撃力+2', count: 5, rarity: 'SR', weight: 15 },
    { name: '金田家のしょうちゃん', image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E9%87%91%E7%94%B0%E5%AE%B6%E3%81%AE%E3%81%97%E3%82%87%E3%81%86%E3%81%A1%E3%82%83%E3%82%93.png', effect: '攻撃力+2', count: 5, rarity: 'SR', weight: 15 },
    { name: '佐藤家のやまちゃん', image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E4%BD%90%E8%97%A4%E5%AE%B6%E3%81%AE%E3%82%84%E3%81%BE%E3%81%A1%E3%82%83%E3%82%93.png', effect: '攻撃力+2', count: 5, rarity: 'SR', weight: 15 },
    { name: '中野家のてんちゃん', image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E4%B8%AD%E9%87%8E%E5%AE%B6%E3%81%AE%E3%81%A6%E3%82%93%E3%81%A1%E3%82%83%E3%82%93.png', effect: '攻撃力+2', count: 5, rarity: 'SR', weight: 15 },
    { name: '先生集合', image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E5%85%88%E7%94%9F%E9%9B%86%E5%90%88.png', effect: '攻撃力+3', count: 2, rarity: 'SSR', weight: 5 },
    { name: 'マーモット系男子', image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SSR-%E3%83%9E%E3%83%BC%E3%83%A2%E3%83%83%E3%83%88%E7%B3%BB%E7%94%B7%E5%AD%90.png', effect: '攻撃力+3', count: 2, rarity: 'SSR', weight: 5 },
    { name: '佐藤家のてんちゃん', image: 'https://github.com/togeharuki/Deck-Dreamers/blob/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SSR-%E4%BD%90%E8%97%A4%E5%AE%B6%E3%81%AE%E3%81%A6%E3%82%93%E3%81%A1%E3%82%83%E3%82%93.png', effect: '回復力+3', count: 2, rarity: 'SSR', weight: 5 },
];

let items = [];  // ガチャアイテムの状態（残り個数など）
let playerId = null;  // プレイヤーのID
let cardCounter = 1;  // カードIDのインクリメンタルカウンタ

document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const mainSystem = document.getElementById('mainSystem'); // メインシステムコンテナ
    const mainButton = document.getElementById('mainButton'); // スタートボタン
    const cardSelect = document.getElementById('cardSelect'); // カード選択画面
    const cardSelectContainer = document.getElementById('cardSelectContainer'); // カード表示用コンテナ
    const result = document.getElementById('result'); // 結果表示画面
    const resultCard = document.getElementById('resultCard'); // 結果カード表示領域
    const tryAgainButton = document.getElementById('tryagainButton'); // 再挑戦ボタン

    // Firebaseを初期化する関数
    function initializeFirebase() {
        try {
            firebase.initializeApp(firebaseConfig);
            return firebase.firestore();  // Firestoreデータベースへの参照を取得
        } catch (error) {
            console.error("Firebaseの初期化に失敗しました:", error);
            alert('Firebaseの初期化に失敗しました。設定を確認してください。');
            return null;
        }
    }

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

        const db = initializeFirebase();
        if (!db) return;  // Firebaseが初期化できなかった場合は終了

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

    // ガチャアイテムをSoukoに追加する関数
    async function addCardToSouko(card) {
        const db = initializeFirebase();
        if (!db) return;  // Firebaseが初期化できなかった場合は終了

        try {
            const soukoRef = db.collection('Souko').doc(playerId);
            cardCounter++;  // カウンタをインクリメント
            const cardId = `default_card_0${cardCounter}_gacha`;  // インクリメンタルなカードIDを生成

            // Firestoreにカードを追加し、保存数をインクリメント
            await soukoRef.set({
                [`${cardId}`]: {
                    name: card.name,
                    image: card.image,
                    effect: card.effect,
                    rarity: card.rarity,
                    type: 'gacha',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                },
                savedCount: firebase.firestore.FieldValue.increment(100)  // 保存数をインクリメント
            }, { merge: true });
        } catch (error) {
            console.error('カード追加エラー:', error);
            alert('カードを追加できませんでした');
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
                resultCard.innerHTML = `★${selectedItem.rarity}★<br>${selectedItem.name}<br>効果: ${selectedItem.effect}`;
                // 適切な画像を表示する場合は、必要に応じて画像要素を追加
                const img = document.createElement('img');
                img.src = selectedItem.image;
                img.alt = selectedItem.name;
                resultCard.appendChild(img);

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
        const db = initializeFirebase();
        if (!db) return;  // Firebaseが初期化できなかった場合は終了

        try {
            const soukoRef = db.collection('Souko').doc(playerId);
            await soukoRef.update({
                gachaItems: items,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('データ更新エラー:', error);
            alert('データを更新できませんでした');
        }
    }

    // 残りのアイテム数をコンソールに表示
    function displayItemsRemaining() {
        console.clear();
        items.forEach(item => {
            console.log(`${item.rarity} ${item.name}: 残り ${item.count} 個`);
        });
    }

    function updateButtonState() {
        if (!mainButton) return; // mainButtonがnullの場合は処理を中止
        const hasAvailableItems = items.some(item => item.count > 0);
        mainButton.disabled = !hasAvailableItems;
        if (!hasAvailableItems) showEndMessage();
    }

    function showEndMessage() {
        result.style.display = 'block'; // 結果画面を表示
        resultCard.innerHTML = '全てのアイテムがなくなりました。'; // メッセージを表示
    }

    // スタートボタンがクリックされた時の処理
    mainButton.addEventListener('click', async () => {
        try {
            mainSystem.style.display = 'none'; // メインシステムを非表示
            cardSelect.classList.remove('hidden'); // カード選択画面を表示
            await initializeGacha(); // ガチャの初期化
        } catch (error) {
            console.error('ガチャ実行エラー:', error);
            alert('ガチャの初期化に失敗しました');
        }
    });

    // 再挑戦ボタンがクリックされた時の処理
    tryAgainButton.addEventListener('click', () => {
        result.style.display = 'none'; // 結果画面を非表示
        cardSelect.classList.remove('hidden'); // カード選択画面を再表示
        // ここに再挑戦のロジックを追加することができます
    });

    // エラーハンドリング（グローバルエラーハンドラー）
    window.addEventListener('error', function(event) {
        console.error('エラーが発生しました:', event.error);
        alert('エラーが発生しました');
    });

    // 未処理のPromiseエラーをキャッチするハンドラー
    window.addEventListener('unhandledrejection', function(event) {
        console.error('未処理のPromiseエラー:', event.reason);
        alert('エラーが発生しました');
    });
});

