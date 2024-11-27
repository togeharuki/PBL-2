// Firebase設定
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

let selectedCards = [];
let createdCards = [];
let allCards = new Set();

document.addEventListener('DOMContentLoaded', async function() {
    // プレイヤー情報の取得と確認
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

    // カード一覧とデッキを読み込む
    await loadDeckCards();
    await loadCreatedCards();
});

// デッキのカードを読み込む関数
async function loadDeckCards() {
    try {
        const deckGrid = document.getElementById('deck-grid');
        deckGrid.innerHTML = '';

        // すべてのカードを取得
        const soukoSnapshot = await db.collection('Souko').get();
        const playerId = localStorage.getItem('playerId');

        // 現在のデッキの状態を取得
        const deckRef = db.collection('Deck').doc(playerId);
        const deckDoc = await deckRef.get();
        const currentDeck = deckDoc.exists ? 
                          deckDoc.data().cards.filter(card => !card.isCreated) : 
                          [];

        // すべてのSoukoドキュメントからカードを収集
        for (const doc of soukoSnapshot.docs) {
            const cardData = doc.data();
            if (cardData.cards && Array.isArray(cardData.cards)) {
                for (const card of cardData.cards) {
                    // 重複チェック
                    if (!allCards.has(card.name)) {
                        allCards.add(card.name);
                        
                        const cardName = encodeURIComponent(card.name);
                        const imagePath = `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${cardName}.jpg`;
                        const jpegPath = `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${cardName}.jpeg`;

                        const validImagePath = await checkImageExistence(imagePath, jpegPath);
                        if (validImagePath) {
                            card.image = validImagePath;
                            const cardElement = createCardElement(card);
                            
                            // 現在のデッキに含まれているカードをチェック
                            if (currentDeck.some(deckCard => deckCard.name === card.name)) {
                                const checkbox = cardElement.querySelector('.card-checkbox');
                                if (checkbox) {
                                    checkbox.checked = true;
                                    selectedCards.push(card);
                                }
                            }
                            
                            deckGrid.appendChild(cardElement);
                        }
                    }
                }
            }
        }

        updateSaveButton();
    } catch (error) {
        console.error('カードの読み込みに失敗しました:', error);
        alert('カードの読み込みに失敗しました: ' + error.message);
    }
}

// 作成したカードを表示する関数
async function loadCreatedCards() {
    try {
        const playerId = localStorage.getItem('playerId');
        const cardRef = db.collection('Card').doc(playerId);
        const doc = await cardRef.get();

        if (doc.exists) {
            const cardData = doc.data();
            // 作成したカードセクション作成
            const createdCardsSection = document.createElement('div');
            createdCardsSection.className = 'deck-container';
            createdCardsSection.innerHTML = `
                <h2 style="color: #4ecdc4; text-align: center; margin: 30px 0;">作成したカード一覧</h2>
                <div class="deck-grid" id="created-cards-grid"></div>
            `;
            
            document.querySelector('.deck-container').after(createdCardsSection);

            const createdCardsGrid = document.getElementById('created-cards-grid');
            
            // カードデータを配列に変換してソート
            const cardsArray = Object.entries(cardData)
                .filter(([key, _]) => key !== 'timestamp')
                .map(([id, card]) => ({
                    ...card,
                    id,
                    isCreated: true
                }))
                .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            createdCards = cardsArray;

            // 作成したカードを表示
            cardsArray.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'card-item created-card';
                cardElement.innerHTML = `
                    <div class="card-image">
                        <img src="${card.image}" alt="${card.name}">
                    </div>
                    <div class="card-name">${card.name}</div>
                    <div class="card-effect">${card.effect}</div>
                `;
                createdCardsGrid.appendChild(cardElement);
            });
        }
    } catch (error) {
        console.error('作成したカードの読み込みに失敗しました:', error);
    }
}
function createCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card-item';
    
    // チェックボックスを作成
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

    // カード要素を作成
    cardElement.innerHTML = `
        <div class="card-image">
            <img src="${card.image}" alt="${card.name}" loading="lazy">
        </div>
        <div class="card-name">${card.name}</div>
        <div class="card-effect">${card.effect}</div>
    `;
    
    cardElement.insertBefore(checkbox, cardElement.firstChild);
    
    // カードホバー時の挙動
    cardElement.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
    });
    
    cardElement.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });

    return cardElement;
}

// 保存ボタンの状態を更新
function updateSaveButton() {
    const saveButton = document.getElementById('save-deck-button');
    if (saveButton) {
        saveButton.disabled = selectedCards.length !== 10;
        
        // 視覚的フィードバック
        if (selectedCards.length === 10) {
            saveButton.classList.add('ready');
        } else {
            saveButton.classList.remove('ready');
        }
        
        // 選択状態の表示を更新
        const cardCounter = document.getElementById('card-counter');
        if (cardCounter) {
            cardCounter.textContent = `選択中: ${selectedCards.length}/10`;
        }
    }
}

// デッキを保存
async function saveDeck() {
    if (selectedCards.length !== 10) {
        alert('デッキは10枚のカードを選択する必要があります');
        return;
    }

    try {
        const playerId = localStorage.getItem('playerId');
        const deckRef = db.collection('Deck').doc(playerId);
        
        // 選択したカードと作成したカードを結合
        const allCards = [...selectedCards, ...createdCards];
        
        // デッキを保存
        await deckRef.set({
            cards: allCards.map(card => ({
                name: card.name,
                effect: card.effect,
                image: card.image,
                isCreated: card.isCreated || false,
                type: card.type || 'normal',
                value: card.value || null
            })),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 成功メッセージを表示
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'デッキを保存しました';
        document.body.appendChild(successMessage);

        // 選択をリセット
        selectedCards = [];
        document.querySelectorAll('.card-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        updateSaveButton();

        // メッセージを数秒後に削除
        setTimeout(() => {
            successMessage.remove();
        }, 3000);

    } catch (error) {
        console.error('デッキの保存に失敗しました:', error);
        alert('デッキの保存に失敗しました: ' + error.message);
    }
}

// 画像の存在チェック
function checkImageExistence(jpgPath, jpegPath) {
    return new Promise((resolve) => {
        const img = new Image();
        let tryJpeg = false;

        img.onload = () => {
            resolve(tryJpeg ? jpegPath : jpgPath);
        };

        img.onerror = () => {
            if (!tryJpeg) {
                tryJpeg = true;
                img.src = jpegPath;
            } else {
                resolve(null);
            }
        };

        img.src = jpgPath;
    });
}

// メニューに戻る
function goBack() {
    window.location.href = '../Menu/Menu.html';
}

// デッキをリセット
function resetDeck() {
    if (confirm('デッキの選択をリセットしますか？')) {
        selectedCards = [];
        document.querySelectorAll('.card-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        updateSaveButton();
    }
}

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
});

// ページを離れる前の警告
window.addEventListener('beforeunload', (e) => {
    if (selectedCards.length > 0) {
        e.preventDefault();
        e.returnValue = '';
    }
});