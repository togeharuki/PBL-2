// Firebase設定とSDKのインポート
const firebaseConfig = {
    apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
    authDomain: "deck-dreamers.firebaseapp.com",
    projectId: "deck-dreamers",
    storageBucket: "deck-dreamers.appspot.com",
    messagingSenderId: "165933225805",
    appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
};

// Firebase初期化
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const cardContainer = document.getElementById('card-container');
const singleGachaButton = document.getElementById('single-gacha');
const multiGachaButton = document.getElementById('multi-gacha');

// カードのリスト
const cardList = [
    { 
        name: '徳田家ののりちゃん',
        imageFront: '写真/徳田家ののりちゃん.png', 
        imageBack: '写真/カードの裏面.png', 
        rarity: 'N',
        effect: '攻撃力+1',
        type: 'attack',
        value: 1
    },
    { 
        name: '金田家のしょうちゃん',
        imageFront: '写真/金田家のしょうちゃん.png', 
        imageBack: '写真/カードの裏面.png', 
        rarity: 'N',
        effect: '回復+1',
        type: 'heal',
        value: 1
    },
    { 
        name: '佐藤家のてんちゃん',
        imageFront: '写真/佐藤家のてんちゃん.png', 
        imageBack: '写真/カードの裏面.png', 
        rarity: 'R',
        effect: '攻撃力+2',
        type: 'attack',
        value: 2
    },
    { 
        name: '二郎系',
        imageFront: '写真/二郎系.png', 
        imageBack: '写真/カードの裏面.png', 
        rarity: 'SR',
        effect: '回復+3',
        type: 'heal',
        value: 3
    },
    { 
        name: '佐藤家のやまちゃん',
        imageFront: '写真/佐藤家のやまちゃん.png', 
        imageBack: '写真/カードの裏面.png', 
        rarity: 'UR',
        effect: '攻撃力+5',
        type: 'attack',
        value: 5
    }
];

// レアリティごとの排出率
const rarityWeights = {
    'N': 60,
    'R': 25,
    'SR': 10,
    'UR': 5
};

// カードをランダムに引く関数
function drawCard() {
    const randomValue = Math.random() * 100;
    let cumulativeWeight = 0;
    
    for (const card of cardList) {
        cumulativeWeight += rarityWeights[card.rarity];
        if (randomValue < cumulativeWeight) {
            return card;
        }
    }
    return cardList[0];
}

// ガチャを引いた後にカードを倉庫に保存する関数
async function saveCardToSouko(card) {
    const playerId = localStorage.getItem('playerId');
    if (!playerId) return;

    try {
        const soukoRef = db.collection('Souko').doc(playerId);
        const soukoDoc = await soukoRef.get();
        
        if (soukoDoc.exists) {
            // 既存の倉庫データを取得
            const soukoData = soukoDoc.data();
            const existingCards = soukoData.cards || [];
            
            // 重複チェック
            const isDuplicate = existingCards.some(existingCard => 
                existingCard.name === card.name
            );
            
            if (!isDuplicate) {
                // 新しいカードを追加
                existingCards.push({
                    name: card.name,
                    effect: card.effect,
                    type: card.type,
                    value: card.value,
                    rarity: card.rarity,
                    obtainedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                await soukoRef.update({
                    cards: existingCards
                });
            }
        } else {
            // 新しい倉庫データを作成
            await soukoRef.set({
                cards: [{
                    name: card.name,
                    effect: card.effect,
                    type: card.type,
                    value: card.value,
                    rarity: card.rarity,
                    obtainedAt: firebase.firestore.FieldValue.serverTimestamp()
                }]
            });
        }
    } catch (error) {
        console.error('カードの保存に失敗しました:', error);
    }
}
// カード要素を作成する関数
function createCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card', card.rarity);
    
    const cardInner = document.createElement('div');
    cardInner.classList.add('card-inner');
    
    // フロント面（裏面の画像）
    const cardFront = document.createElement('div');
    cardFront.classList.add('card-front');
    const frontImage = document.createElement('img');
    frontImage.src = card.imageBack;
    frontImage.alt = 'カード表面';
    frontImage.style.width = '100%';
    frontImage.style.height = 'auto';
    cardFront.appendChild(frontImage);
    
    // バック面（表面の画像と情報）
    const cardBack = document.createElement('div');
    cardBack.classList.add('card-back');
    const backImage = document.createElement('img');
    backImage.src = card.imageFront;
    backImage.alt = card.name;
    backImage.style.width = '100%';
    backImage.style.height = 'auto';
    cardBack.appendChild(backImage);
    
    // カード情報の追加
    const cardInfo = document.createElement('div');
    cardInfo.classList.add('card-info');
    cardInfo.innerHTML = `
        <div class="card-name">${card.name}</div>
        <div class="card-rarity">レアリティ: ${card.rarity}</div>
        <div class="card-effect">${card.effect}</div>
    `;
    cardBack.appendChild(cardInfo);
    
    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    cardElement.appendChild(cardInner);
    
    // クリックでめくる処理
    cardElement.addEventListener('click', () => {
        cardElement.classList.toggle('flip');
    });
    
    return cardElement;
}

// カードを一枚ずつめくる処理
function flipCardsOneByOne(cards) {
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('flip');
            setTimeout(() => {
                card.classList.add('glow');
                // アニメーション後にカードを保存
                saveCardToSouko(card.cardData);
            }, 600);
        }, index * 980);
    });
}

// ガチャを引く処理
async function gacha(isMulti) {
    cardContainer.innerHTML = '';
    const drawCount = isMulti ? 10 : 1;
    const drawnCards = [];
    
    for (let i = 0; i < drawCount; i++) {
        const card = drawCard();
        const cardElement = createCardElement(card);
        cardElement.cardData = card; // カードデータを要素に保存
        cardContainer.appendChild(cardElement);
        drawnCards.push(cardElement);
    }
    
    // ガチャ演出
    setTimeout(() => flipCardsOneByOne(drawnCards), 1000);
    
    // ガチャ結果を表示
    showGachaResult(drawnCards.map(card => card.cardData));
}

// ガチャ結果の表示
function showGachaResult(cards) {
    const resultElement = document.createElement('div');
    resultElement.classList.add('gacha-result');
    
    const rarityCount = cards.reduce((acc, card) => {
        acc[card.rarity] = (acc[card.rarity] || 0) + 1;
        return acc;
    }, {});
    
    resultElement.innerHTML = `
        <h3>ガチャ結果</h3>
        ${Object.entries(rarityCount).map(([rarity, count]) => 
            `<p>${rarity}: ${count}枚</p>`
        ).join('')}
        <button onclick="closeGachaResult()">閉じる</button>
    `;
    
    document.body.appendChild(resultElement);
}

// ガチャ結果を閉じる
function closeGachaResult() {
    const resultElement = document.querySelector('.gacha-result');
    if (resultElement) {
        resultElement.remove();
    }
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
    // プレイヤー情報の確認
    const playerId = localStorage.getItem('playerId');
    if (!playerId) {
        alert('ログインが必要です');
        window.location.href = '../login.html';
        return;
    }

    // ガチャボタンのイベント設定
    singleGachaButton.addEventListener('click', () => gacha(false));
    multiGachaButton.addEventListener('click', () => gacha(true));
    
    // エラーハンドリング
    window.addEventListener('error', (event) => {
        console.error('エラーが発生しました:', event.error);
    });
});

// プレビューカードの作成
function createPreviewCard() {
    const previewContainer = document.getElementById('preview-container');
    if (!previewContainer) return;
    
    cardList.forEach(card => {
        const cardPreview = document.createElement('div');
        cardPreview.classList.add('card-preview', card.rarity);
        cardPreview.innerHTML = `
            <img src="${card.imageFront}" alt="${card.name}">
            <div class="card-preview-info">
                <div class="card-name">${card.name}</div>
                <div class="card-rarity">${card.rarity}</div>
                <div class="card-effect">${card.effect}</div>
                <div class="card-rate">出現率: ${rarityWeights[card.rarity]}%</div>
            </div>
        `;
        previewContainer.appendChild(cardPreview);
    });
}

// プレビューカードの表示
createPreviewCard();