// Firebaseの設定
const firebaseConfig = {
    apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
    authDomain: "deck-dreamers.firebaseapp.com",
    projectId: "deck-dreamers",
    storageBucket: "deck-dreamers.appspot.com",
    messagingSenderId: "165933225805",
    appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
};

// Firebaseを初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOMの準備完了を待つ
document.addEventListener('DOMContentLoaded', function() {
    // グローバル変数
    let items = [];
    let playerId = null;

    // DOM要素の取得を関数化
    function initializeDOMElements() {
        return {
            gachaButton: document.getElementById('gachaButton'),
            resetButton: document.getElementById('resetButton'),
            gachaResult: document.getElementById('gachaResult'),
            gachaCapsule: document.getElementById('gachaCapsule'),
            gachaCapsuleImage: document.getElementById('gachaCapsuleImage'),
            endMessage: document.getElementById('endMessage')
        };
    }

    // DOM要素を取得
    const elements = initializeDOMElements();

    const GACHA_ITEMS = [
        {
            name: '学祭のピザ',
            image: 'https://togeharuki.github.io/Deck-Dreamers/battle/gatya/写真/R-学祭のピザ.png',
            effect: '攻撃力+1',
            count: 10,
            rarity: 'R',
            weight: 30
        },
        {
            name: '二郎系',
            image: 'https://togeharuki.github.io/Deck-Dreamers/battle/gatya/写真/R-二郎系.png',
            effect: '攻撃力+1',
            count: 10,
            rarity: 'R',
            weight: 30
        },
        {
            name: '先生集合',
            image: 'https://togeharuki.github.io/Deck-Dreamers/battle/gatya/写真/R-先生集合.png',
            effect: '攻撃力+1',
            count: 10,
            rarity: 'R',
            weight: 30
        },
        {
            name: '河合家のりょうちゃん',
            image: 'https://togeharuki.github.io/Deck-Dreamers/battle/gatya/写真/SR-河合家のりょうちゃん.png',
            effect: '攻撃力+5',
            count: 5,
            rarity: 'SR',
            weight: 10
        },
        {
            name: '金田家のしょうちゃん',
            image: 'https://togeharuki.github.io/Deck-Dreamers/battle/gatya/写真/SR-金田家のしょうちゃん.png',
            effect: '攻撃力+3',
            count: 5,
            rarity: 'SR',
            weight: 10
        },
        {
            name: '喜友名家のともちゃん',
            image: 'https://togeharuki.github.io/Deck-Dreamers/battle/gatya/写真/SR-喜友名家のともちゃん.png',
            effect: '攻撃力+2',
            count: 5,
            rarity: 'SR',
            weight: 10
        },
        {
            name: '佐藤家のてんちゃん',
            image: 'https://togeharuki.github.io/Deck-Dreamers/battle/gatya/写真/SSR-佐藤家のてんちゃん.png',
            effect: '回復+10',
            count: 2,
            rarity: 'SSR',
            weight: 2
        },
        {
            name: 'マーモット系男子',
            image: 'https://togeharuki.github.io/Deck-Dreamers/battle/gatya/写真/SSR-マーモット系男子.png',
            effect: '回復+10',
            count: 2,
            rarity: 'SSR',
            weight: 2
        }
    ];

    // Firebaseが利用可能か確認
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error('Firebase が初期化されていません');
        showSuccessNotification('システムエラーが発生しました');
        return;
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
            showSuccessNotification('ログインが必要です');
            window.location.href = '../login.html';
            return;
        }

        try {
            const soukoRef = db.collection('Souko').doc(playerId.toString());
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
        elements.resetButton.style.display = 'none';
        elements.gachaButton.disabled = false;
        elements.gachaButton.style.display = 'inline-block';
        elements.gachaResult.value = '';
        elements.gachaCapsuleImage.src = 'https://togeharuki.github.io/Deck-Dreamers/battle/gatya/写真/00-カードの裏面.png';
        elements.gachaCapsule.style.animation = 'none';
    }

    function displayItemsRemaining() {
        console.clear();
        items.forEach(item => {
            console.log(`${item.rarity} ${item.name}: 残り ${item.count} 個`);
        });
    }

    function updateButtonState() {
        const hasAvailableItems = items.some(item => item.count > 0);
        elements.gachaButton.disabled = !hasAvailableItems;
        if (!hasAvailableItems) showEndMessage();
    }

    function showEndMessage() {
        elements.endMessage.style.display = 'block';
        elements.gachaButton.style.display = 'none';
        elements.gachaResult.style.display = 'none';
    }

    // 成功通知を表示する関数
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

    // イベントリスナーの設定
    elements.gachaButton.addEventListener('click', async () => {
        try {
            elements.gachaButton.disabled = true;
            triggerGachaAnimation();
            await handleGachaResult();
        } catch (error) {
            console.error('ガチャ実行エラー:', error);
            showSuccessNotification('ガチャの実行に失敗しました');
            elements.gachaButton.disabled = false;
        }
    });

    elements.resetButton.addEventListener('click', resetGacha);

    // 初期化の実行
    initializeGacha();
});

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
    showSuccessNotification('エラーが発生しました');
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('未処理のPromiseエラー:', event.reason);
    showSuccessNotification('エラーが発生しました');
});