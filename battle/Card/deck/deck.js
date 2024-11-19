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

// 選択されたカードを追跡する配列
let selectedCards = [];

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
    // 作成したカードを表示
    await loadCreatedCards();
});

// 作成したカードを表示する関数
async function loadCreatedCards() {
    try {
        const playerId = localStorage.getItem('playerId');
        const cardRef = db.collection('Card').doc(playerId.toString());
        const doc = await cardRef.get();

        if (doc.exists) {
            const cardData = doc.data();
            const createdCardsSection = document.createElement('div');
            createdCardsSection.className = 'deck-container';
            createdCardsSection.innerHTML = `
                <h2 style="color: #4ecdc4; text-align: center; margin: 30px 0;">作成したカード一覧</h2>
                <div class="deck-grid" id="created-cards-grid"></div>
            `;
            
            // deck-containerの後に挿入
            document.querySelector('.deck-container').after(createdCardsSection);

            const createdCardsGrid = document.getElementById('created-cards-grid');
            
            // カードデータを配列に変換して新しい順にソート
            const cardsArray = Object.entries(cardData)
                .filter(([key, _]) => key !== 'timestamp')
                .map(([id, card]) => ({
                    ...card,
                    id
                }))
                .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            const cardPromises = cardsArray.map(async (card) => {
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
            });

            const cardElements = await Promise.all(cardPromises);
            cardElements.forEach(cardElement => {
                if (cardElement) {
                    createdCardsGrid.appendChild(cardElement);
                }
            });
        }
    } catch (error) {
        console.error('作成したカードの読み込みに失敗しました:', error);
    }
}

// カードを表示する関数
function createCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card-item';
    
    // チェックボックスを追加
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'card-checkbox';
    checkbox.addEventListener('change', function() {
        if (this.checked) {
            if (selectedCards.length >= 10) {
                this.checked = false;
                alert('デッキは10枚までしか選択できません');
                return;
            }
            selectedCards.push(card);
        } else {
            selectedCards = selectedCards.filter(c => c.name !== card.name);
        }
        updateSaveButton();
    });

    cardElement.innerHTML = `
        <div class="card-image">
            <img src="${card.image}" alt="${card.name}">
        </div>
        <div class="card-name">${card.name}</div>
        <div class="card-effect">${card.effect}</div>
    `;
    
    cardElement.insertBefore(checkbox, cardElement.firstChild);
    return cardElement;
}

// 保存ボタンの状態を更新する関数
function updateSaveButton() {
    const saveButton = document.getElementById('save-deck-button');
    saveButton.disabled = selectedCards.length !== 10;
}
// デッキを保存する関数
async function saveDeck() {
    if (selectedCards.length !== 10) {
        alert('デッキは10枚のカードを選択する必要があります');
        return;
    }

    try {
        const playerId = localStorage.getItem('playerId');
        const deckRef = db.collection('Deck').doc(playerId.toString());
        
        await deckRef.set({
            cards: selectedCards,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('デッキを保存しました');
        // 保存後に選択をリセット
        selectedCards = [];
        updateSaveButton();
        // チェックボックスをリセット
        document.querySelectorAll('.card-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
    } catch (error) {
        console.error('デッキの保存に失敗しました:', error);
        alert('デッキの保存に失敗しました: ' + error.message);
    }
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

            // 現在のデッキの状態を取得
            const deckRef = db.collection('Deck').doc(playerId.toString());
            const deckDoc = await deckRef.get();
            const currentDeck = deckDoc.exists ? deckDoc.data().cards : [];

            const cardPromises = cards.map(async (card) => {
                const cardName = encodeURIComponent(card.name); // カード名をURLエンコード
                const imagePath = `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${cardName}.jpg`; // JPG形式の画像
                const jpegPath = `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${cardName}.jpeg`; // JPEG形式の画像

                // 画像の存在チェック
                const validImagePath = await checkImageExistence(imagePath, jpegPath);
                if (validImagePath) {
                    card.image = validImagePath; // 存在する画像パスをセット
                    const cardElement = createCardElement(card);
                    
                    // 現在のデッキに含まれているカードは自動的にチェックを入れる
                    if (currentDeck.some(deckCard => deckCard.name === card.name)) {
                        const checkbox = cardElement.querySelector('.card-checkbox');
                        checkbox.checked = true;
                        selectedCards.push(card);
                    }
                    
                    return cardElement;
                } else {
                    console.log(`画像が見つかりません: ${imagePath} または ${jpegPath}`);
                    return null;
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

            // 保存ボタンの初期状態を設定
            updateSaveButton();
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