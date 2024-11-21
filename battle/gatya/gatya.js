const cardContainer = document.getElementById('card-container'); // カードコンテナを取得
const singleGachaButton = document.getElementById('single-gacha'); // 1連引くボタンを取得
const multiGachaButton = document.getElementById('multi-gacha'); // 10連引くボタンを取得

// カードのリスト（レアリティと画像のパスを確認）
const cardList = [
    { imageFront: '写真/徳田家ののりちゃん.png', imageBack: '写真/カードの裏面.png', rarity: 'N' },
    { imageFront: '写真/金田家のしょうちゃん.png', imageBack: '写真/カードの裏面.png', rarity: 'N' },
    { imageFront: '写真/佐藤家のてんちゃん.png', imageBack: '写真/カードの裏面.png', rarity: 'R' },
    { imageFront: '写真/二郎系.png', imageBack: '写真/カードの裏面.png', rarity: 'SR' },
    { imageFront: '写真/佐藤家のやまちゃん.png', imageBack: '写真/カードの裏面.png', rarity: 'UR' }
];

// レアリティごとの排出率を設定
const rarityWeights = {
    'N': 60,   // 60%
    'R': 40,   // 30%
    'SR': 10,   // 7%
    'UR': 1     // 3%
};

// カードをランダムに引く関数
function drawCard() {
    const randomValue = Math.random() * 100; // 0から100の乱数を生成
    let cumulativeWeight = 0;

    for (const card of cardList) {
        cumulativeWeight += rarityWeights[card.rarity]; // 累積排出率を計算
        if (randomValue < cumulativeWeight) {
            return card; // 選ばれたカードを返す
        }
    }

    return cardList[0]; // デフォルトのカードを返す（万が一のため）
}

function createCardElement(card) {
    const cardElement = document.createElement('div'); // カードのdivを作成
    cardElement.classList.add('card', card.rarity); // カードクラスとレアリティクラスを追加
    
    const cardInner = document.createElement('div'); // 内部要素を作成
    cardInner.classList.add('card-inner'); // 内部要素にクラスを追加

    // フロント面を作成（裏面の画像をフロントにする）
    const cardFront = document.createElement('div'); 
    cardFront.classList.add('card-front'); // フロントクラスを追加
    const frontImage = document.createElement('img');
    frontImage.src = card.imageBack; // カードの表面の画像を裏面の画像に設定
    frontImage.alt = 'カード表面'; // 画像の代替テキスト
    frontImage.style.width = '100%'; // 画像の幅をカードに合わせる
    frontImage.style.height = 'auto'; // 高さを自動調整
    cardFront.appendChild(frontImage); // 画像をフロント面に追加

    // 裏面を作成（表面の画像を裏面にする）
    const cardBack = document.createElement('div'); // 裏面を作成
    cardBack.classList.add('card-back'); // 裏面クラスを追加
    const backImage = document.createElement('img');
    backImage.src = card.imageFront; // カードの裏面の画像を表面の画像に設定
    backImage.alt = 'カード裏面'; // 画像の代替テキスト
    backImage.style.width = '100%'; // 画像の幅をカードに合わせる
    backImage.style.height = 'auto'; // 高さを自動調整
    cardBack.appendChild(backImage); // 画像を裏面に追加
    
    // レアリティを表示する要素を作成
    const rarityLabel = document.createElement('div');
    rarityLabel.textContent = `レアリティ: ${card.rarity}`; // レアリティのテキスト
    rarityLabel.style.position = 'absolute'; // 絶対位置
    rarityLabel.style.bottom = '10px'; // 下から10px
    rarityLabel.style.left = '10px'; // 左から10px
    rarityLabel.style.color = 'white'; // テキストカラー
    rarityLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // 半透明の背景
    rarityLabel.style.padding = '5px'; // パディング
    rarityLabel.style.borderRadius = '5px'; // 角丸
    cardBack.appendChild(rarityLabel); // 裏面にレアリティを追加
    
    // 内部要素にフロントと裏面を追加
    cardInner.appendChild(cardFront); 
    cardInner.appendChild(cardBack); 
    cardElement.appendChild(cardInner); // 内部要素をカードに追加

    // カードをクリックした時にめくる処理
    cardElement.addEventListener('click', () => {
        cardElement.classList.toggle('flip'); // フリップクラスをトグル
    });

    return cardElement; // 作成したカードを返す
}

// カードを一枚ずつめくる関数
function flipCardsOneByOne(cards) {
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('flip'); // フリップクラスを追加
            // フリップが完了した後に光るクラスを追加
            setTimeout(() => {
                card.classList.add('glow'); // 光るクラスを追加
            }, 600); // フリップのアニメーション時間とほぼ同じ時間を待つ
        }, index * 980); // 0.98秒ごとにめくる
    });
}

// ガチャを引く関数
function gacha(isMulti) {
    cardContainer.innerHTML = ''; // 既存のカードをクリア
    const drawCount = isMulti ? 10 : 1; // 引くカードの数を設定
    const drawnCards = []; // 引いたカードを保存する配列
    
    for (let i = 0; i < drawCount; i++) {
        const card = drawCard(); // カードを引く
        const cardElement = createCardElement(card); // カード要素を作成
        cardContainer.appendChild(cardElement); // カードをコンテナに追加
        drawnCards.push(cardElement); // 引いたカードを配列に追加
    }

    // カードを一枚ずつめくる
    setTimeout(() => flipCardsOneByOne(drawnCards), 1000); // 1秒後にめくり始める
}

// ボタンにイベントリスナーを追加
singleGachaButton.addEventListener('click', () => gacha(false)); // 1連引くボタン
multiGachaButton.addEventListener('click', () => gacha(true)); // 10連引くボタン
