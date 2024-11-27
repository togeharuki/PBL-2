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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let selectedCards = [];
let createdCards = [];
let allCards = new Set();

document.addEventListener('DOMContentLoaded', async function() {
    const playerId = localStorage.getItem('playerId');
    const playerName = localStorage.getItem('playerName');

    if (!playerId) {
        alert('ログインしてください');
        window.location.href = '../login.html';
        return;
    }

    document.getElementById('player-name').textContent = `プレイヤー名: ${playerName}`;
    document.getElementById('player-id').textContent = `ID: ${playerId}`;

    await loadDeckCards();
    await loadCreatedCards();
    updateSaveButton();
});

// デッキのカードを読み込む
async function loadDeckCards() {
    try {
        const playerId = localStorage.getItem('playerId');
        
        // 倉庫からカードを読み込む
        const soukoRef = db.collection('Souko').doc(playerId);
        const soukoDoc = await soukoRef.get();

        const deckGrid = document.getElementById('deck-grid');
        deckGrid.innerHTML = '';

        if (soukoDoc.exists) {
            const cardData = soukoDoc.data();
            const cards = cardData.cards || [];

            // 現在のデッキ状態を取得
            const deckRef = db.collection('Deck').doc(playerId);
            const deckDoc = await deckRef.get();
            const currentDeck = deckDoc.exists ? 
                              deckDoc.data().cards.filter(card => !card.isCreated) : 
                              [];

            // カードを表示
            for (const card of cards) {
                if (!allCards.has(card.name)) {
                    allCards.add(card.name);
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
    } catch (error) {
        console.error('デッキの読み込みに失敗しました:', error);
        alert('デッキの読み込みに失敗しました');
    }
}

// 作成したカードを読み込む
async function loadCreatedCards() {
    try {
        const playerId = localStorage.getItem('playerId');
        const cardRef = db.collection('Card').doc(playerId);
        const doc = await cardRef.get();

        if (doc.exists) {
            const cardData = doc.data();
            const createdCardsSection = document.createElement('div');
            createdCardsSection.className = 'deck-container';
            createdCardsSection.innerHTML = `
                <h2 class="section-title">作成したカード一覧</h2>
                <div class="deck-grid" id="created-cards-grid"></div>
            `;
            
            document.querySelector('.deck-container').after(createdCardsSection);
            const createdCardsGrid = document.getElementById('created-cards-grid');

            const cardsArray = Object.entries(cardData)
                .filter(([key, _]) => key !== 'timestamp')
                .map(([id, card]) => ({
                    ...card,
                    id,
                    isCreated: true
                }))
                .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            createdCards = cardsArray;

            cardsArray.forEach(card => {
                const cardElement = createCardElement(card, true);
                createdCardsGrid.appendChild(cardElement);
            });
        }
    } catch (error) {
        console.error('作成したカードの読み込みに失敗しました:', error);
    }
}
// カード要素を作成
function createCardElement(card, isCreated = false) {
    const cardElement = document.createElement('div');
    cardElement.className = `card-item ${card.rarity || ''}`;
    
    if (!isCreated) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'card-checkbox';
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                if (selectedCards.length >= 10) {
                    this.checked = false;
                    showNotification('デッキは10枚までしか選択できません');
                    return;
                }
                selectedCards.push(card);
            } else {
                selectedCards = selectedCards.filter(c => c.name !== card.name);
            }
            updateSaveButton();
        });
        cardElement.appendChild(checkbox);
    }

    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    cardContent.innerHTML = `
        <div class="card-image">
            <img src="${card.image || getCardImagePath(card)}" alt="${card.name}" loading="lazy">
        </div>
        <div class="card-info">
            <div class="card-name">${card.name}</div>
            <div class="card-type">${card.type || ''}${card.value ? ` ${card.value}` : ''}</div>
            <div class="card-effect">${card.effect || ''}</div>
            ${card.rarity ? `<div class="card-rarity">${card.rarity}</div>` : ''}
        </div>
    `;

    cardElement.appendChild(cardContent);

    // カードのホバーエフェクト
    cardElement.addEventListener('mouseenter', () => {
        cardElement.classList.add('hover');
    });

    cardElement.addEventListener('mouseleave', () => {
        cardElement.classList.remove('hover');
    });

    return cardElement;
}

// カード画像のパスを取得
function getCardImagePath(card) {
    const cardName = encodeURIComponent(card.name);
    return `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${cardName}.jpg`;
}

// デッキを保存
async function saveDeck() {
    if (selectedCards.length !== 10) {
        showNotification('デッキは10枚のカードを選択する必要があります');
        return;
    }

    try {
        const playerId = localStorage.getItem('playerId');
        const deckRef = db.collection('Deck').doc(playerId);
        
        const allCards = [...selectedCards, ...createdCards];
        
        await deckRef.set({
            cards: allCards.map(card => ({
                name: card.name,
                effect: card.effect,
                type: card.type,
                value: card.value,
                image: card.image || getCardImagePath(card),
                rarity: card.rarity,
                isCreated: card.isCreated || false
            })),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('デッキを保存しました', 'success');
        selectedCards = [];
        document.querySelectorAll('.card-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        updateSaveButton();

    } catch (error) {
        console.error('デッキの保存に失敗しました:', error);
        showNotification('デッキの保存に失敗しました', 'error');
    }
}

// 保存ボタンの状態を更新
function updateSaveButton() {
    const saveButton = document.getElementById('save-deck-button');
    const cardCounter = document.getElementById('card-counter');
    
    if (saveButton) {
        saveButton.disabled = selectedCards.length !== 10;
        saveButton.classList.toggle('ready', selectedCards.length === 10);
    }
    
    if (cardCounter) {
        cardCounter.textContent = `選択中: ${selectedCards.length}/10`;
        cardCounter.classList.toggle('complete', selectedCards.length === 10);
    }
}

// 通知を表示
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// デッキをリセット
function resetDeck() {
    if (confirm('デッキの選択をリセットしますか？')) {
        selectedCards = [];
        document.querySelectorAll('.card-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        updateSaveButton();
        showNotification('デッキをリセットしました');
    }
}

// メニューに戻る
function goBack() {
    if (selectedCards.length > 0) {
        if (!confirm('変更は保存されませんが、よろしいですか？')) {
            return;
        }
    }
    window.location.href = '../Menu/Menu.html';
}

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
    showNotification('エラーが発生しました', 'error');
});

// 未保存の変更がある場合に警告
window.addEventListener('beforeunload', (e) => {
    if (selectedCards.length > 0) {
        e.preventDefault();
        e.returnValue = '';
    }
});