// Firebaseの設定
const firebaseConfig = {
    apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
    authDomain: "deck-dreamers.firebaseapp.com",
    projectId: "deck-dreamers",
    storageBucket: "deck-dreamers.appspot.com",
    messagingSenderId: "165933225805",
    appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', async function() {
    // プレイヤー情報の取得
    const playerId = localStorage.getItem('playerId');
    const playerName = localStorage.getItem('playerName');

    if (!playerId) {
        alert('ログインしてください');
        window.location.href = '../login.html';
        return;
    }

    // プレイヤー情報の表示
    document.getElementById('player-name').textContent = `プレイヤー名: ${playerName}`;
    document.getElementById('player-id').textContent = `ID: ${playerId}`;

    // カード一覧を表示
    await loadDeckCards();
});

// カードを表示する関数
function createCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card-item';
    cardElement.innerHTML = `
        <div class="card-image">
            <img src="${card.image}" alt="${card.name}">
        </div>
        <div class="card-name">${card.name}</div>
        <div class="card-effect">${card.effect}</div>
    `;
    return cardElement;
}

// デッキのカードを読み込む関数
async function loadDeckCards() {
    try {
        const playerId = localStorage.getItem('playerId');
        const soukoRef = db.collection('Souko').doc(playerId.toString());
        const doc = await soukoRef.get();

        if (doc.exists) {
            const deckGrid = document.getElementById('deck-grid');
            deckGrid.innerHTML = ''; // 既存のカードをクリア

            const cardData = doc.data();
            // カードデータがサブオブジェクトではなく配列の場合の処理
            const cards = Array.isArray(cardData.cards) ? cardData.cards : Object.values(cardData);

            const cardPromises = cards.map(async (card) => {
                const cardName = encodeURIComponent(card.name); // カード名をURLエンコード
                const imagePath = `${cardName}.jpg`; // JPG形式の画像
                const jpegPath = `${cardName}.jpeg`; // JPEG形式の画像

                // 画像の存在チェック
                const validImagePath = await checkImageExistence(imagePath, jpegPath);
                if (validImagePath) {
                    card.image = validImagePath; // 存在する画像パスをセット
                    return createCardElement(card); // カード要素を作成
                } else {
                    console.log(`画像が見つかりません: ${imagePath} または ${jpegPath}`);
                    return null; // 画像が見つからない場合はnullを返す
                }
            });

            // すべてのカード要素を取得
            const cardElements = await Promise.all(cardPromises);
            // nullでないカード要素だけをデッキグリッドに追加
            cardElements.forEach(cardElement => {
                if (cardElement) {
                    deckGrid.appendChild(cardElement);
                }
            });
        } else {
            console.log('デッキが見つかりません');
        }
    } catch (error) {
        console.error('デッキの読み込みに失敗しました:', error);
        alert('デッキの読み込みに失敗しました: ' + error.message);
    }
}
// 画像の存在チェックを行う関数
function checkImageExistence(jpgPath, jpegPath) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = jpgPath;
        img.onload = () => resolve(jpgPath); // JPGが存在する場合
        img.onerror = () => {
            // JPGが存在しない場合、JPEGを試す
            img.src = jpegPath;
            img.onload = () => resolve(jpegPath); // JPEGが存在する場合
            img.onerror = () => resolve(null); // どちらも存在しない場合
        };
    });
}

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
});
