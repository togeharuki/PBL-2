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
            Object.values(cardData)
                .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
                .forEach(card => {
                    // 画像の相対パスを指定
                    const cardName = card.name;
                    const jpgPath = `kizon/${cardName}.jpg`; // JPG形式の画像
                    const jpegPath = `kizon/${cardName}.jpeg`; // JPEG形式の画像

                    // 画像の存在チェック（簡易版）
                    const img = new Image();
                    img.src = jpgPath;
                    img.onload = function() {
                        // JPGが存在する場合
                        card.image = jpgPath;
                        const cardElement = createCardElement(card);
                        deckGrid.appendChild(cardElement);
                    };
                    img.onerror = function() {
                        // JPGが存在しない場合、JPEGを試す
                        img.src = jpegPath;
                        img.onload = function() {
                            // JPEGが存在する場合
                            card.image = jpegPath;
                            const cardElement = createCardElement(card);
                            deckGrid.appendChild(cardElement);
                        };
                        img.onerror = function() {
                            // どちらも存在しない場合
                            console.log(`画像が見つかりません: ${jpgPath} または ${jpegPath}`);
                        };
                    };
                });
        } else {
            console.log('デッキが見つかりません');
        }
    } catch (error) {
        console.error('デッキの読み込みに失敗しました:', error);
        alert('デッキの読み込みに失敗しました: ' + error.message);
    }
}

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
});
