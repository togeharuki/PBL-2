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
let db;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    console.log('Firebase初期化成功');
} catch (error) {
    console.error('Firebase初期化エラー:', error);
}

let selectedCards = [];
let createdCards = [];
let allCards = new Set();

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('ページ読み込み開始');
        const playerId = localStorage.getItem('playerId');
        const playerName = localStorage.getItem('playerName');

        if (!playerId) {
            console.log('プレイヤーIDが見つかりません');
            alert('ログインしてください');
            window.location.href = '../login.html';
            return;
        }

        console.log('プレイヤー情報:', { playerId, playerName });
        document.getElementById('player-name').textContent = `プレイヤー名: ${playerName}`;
        document.getElementById('player-id').textContent = `ID: ${playerId}`;

        if (!db) {
            throw new Error('Firebaseデータベースが初期化されていません');
        }

        console.log('カードデータ読み込み開始');
        await loadDeckCards();
        await loadCreatedCards();
        updateSaveButton();
        console.log('カードデータ読み込み完了');

    } catch (error) {
        console.error('初期化エラー:', error);
        showNotification('データの読み込みに失敗しました', 'error');
    }
});

// デッキのカードを読み込む
async function loadDeckCards() {
    try {
        console.log('既存カードの読み込み開始');
        const playerId = localStorage.getItem('playerId');
        
        const soukoRef = db.collection('Souko').doc(playerId);
        const soukoDoc = await soukoRef.get();
        console.log('倉庫データ取得:', soukoDoc.exists);

        const deckGrid = document.getElementById('deck-grid');
        deckGrid.innerHTML = '';

        if (!soukoDoc.exists) {
            console.error('倉庫データが見つかりません');
            showNotification('カードデータの読み込みに失敗しました', 'error');
            return;
        }

        const cardData = soukoDoc.data();
        const cards = Object.entries(cardData)
            .filter(([key]) => key.startsWith('default_card_'))
            .map(([_, card]) => ({
                name: card.name,
                type: 'effect',
                effect: card.effect,
                image: card.image,
                timestamp: card.timestamp
            }));

        console.log('倉庫から読み込んだカード数:', cards.length);

        if (cards.length === 0) {
            console.error('倉庫にカードが存在しません');
            showNotification('効果カードが見つかりません', 'error');
            return;
        }

        // 現在のデッキ状態を取得
        const deckRef = db.collection('Deck').doc(playerId);
        const deckDoc = await deckRef.get();

        const currentDeck = deckDoc.exists ? 
            deckDoc.data().cards.filter(card => !card.isCreated) : 
            [];

        // カードを表示
        cards.forEach(card => {
            const cardElement = createCardElement(card);
            if (currentDeck.some(deckCard => deckCard.name === card.name)) {
                const checkbox = cardElement.querySelector('.card-checkbox');
                if (checkbox) {
                    checkbox.checked = true;
                    selectedCards.push(card);
                }
            }
            deckGrid.appendChild(cardElement);
        });

    } catch (error) {
        console.error('デッキの読み込みに失敗しました:', error);
        showNotification('デッキの読み込みに失敗しました', 'error');
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
                <h2 class="section-title">作成したカード</h2>
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
                .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
                .slice(0, 20); // 最新の20枚のみ使用

            createdCards = cardsArray;

            cardsArray.forEach(card => {
                const cardElement = createCardElement(card, true);
                createdCardsGrid.appendChild(cardElement);
            });
        }
    } catch (error) {
        console.error('作成したカードの読み込みに失敗しました:', error);
        showNotification('作成カードの読み込みに失敗しました', 'error');
    }
}

// カード要素を作成
function createCardElement(card, isCreated = false) {
    const cardElement = document.createElement('div');
    cardElement.className = `card-item ${card.rarity || ''}`;
    
    // チェックボックスは既存カードにのみ追加
    if (!isCreated) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'card-checkbox';
        checkbox.dataset.cardType = 'normal';
        
        checkbox.addEventListener('change', function() {
            const checkedCount = document.querySelectorAll('input[data-card-type="normal"]:checked').length;
            
            if (this.checked && checkedCount > 10) {
                this.checked = false;
                showNotification('既存カードは10枚までしか選択できません', 'warning');
                return;
            }
            
            if (this.checked) {
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
            <div class="card-effect">${card.effect || ''}</div>
            ${isCreated ? '<div class="created-card-label">作成カード</div>' : ''}
        </div>
    `;

    cardElement.appendChild(cardContent);
    return cardElement;
}

// カード画像のパスを取得
function getCardImagePath(card) {
    const cardName = encodeURIComponent(card.name);
    return `https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/${cardName}.jpg`;
}

// デッキを保存
async function saveDeck() {
    try {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) {
            showNotification('ログインしてください', 'error');
            return;
        }

        // 選択された既存カードを取得
        const normalCards = selectedCards.map(card => ({
            name: card.name,
            effect: card.effect,
            type: 'normal',
            image: card.image,
            isCreated: false
        }));

        if (normalCards.length !== 10) {
            showNotification('既存カードを10枚選択してください', 'warning');
            return;
        }

        if (createdCards.length !== 20) {
            showNotification('作成カードが20枚必要です', 'warning');
            return;
        }

        // 作成カードを準備
        const createdCardData = createdCards.map(card => ({
            name: card.name,
            effect: card.effect,
            type: 'created',
            image: card.image,
            isCreated: true
        }));

        // 全カードを結合
        const allDeckCards = [...normalCards, ...createdCardData];

        // デッキを保存
        const deckRef = db.collection('Deck').doc(playerId);
        await deckRef.set({
            cards: allDeckCards,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showSuccessNotification();

    } catch (error) {
        console.error('デッキの保存に失敗しました:', error);
        showNotification('デッキの保存に失敗しました', 'error');
    }
}

// 成功通知を表示
function showSuccessNotification() {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div class="success-content">
            <h2>デッキ作成成功！</h2>
            <p>既存カード10枚と作成カード20枚の<br>デッキを作成しました。</p>
        </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
            window.location.href = '../Menu/Menu.html';
        }, 500);
    }, 2000);
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

// 保存ボタンの状態を更新
function updateSaveButton() {
    const saveButton = document.getElementById('save-deck-button');
    const cardCounter = document.getElementById('card-counter');
    
    const checkedCount = document.querySelectorAll('input[data-card-type="normal"]:checked').length;
    const isValid = checkedCount === 10 && createdCards.length === 20;
    
    if (saveButton) {
        saveButton.disabled = !isValid;
        saveButton.classList.toggle('ready', isValid);
    }
    
    if (cardCounter) {
        cardCounter.textContent = `選択中: ${checkedCount}/10枚 (作成カード: ${createdCards.length}/20枚)`;
        cardCounter.classList.toggle('complete', isValid);
    }
}

// デッキをリセット
function resetDeck() {
    if (confirm('デッキの選択をリセットしますか？')) {
        selectedCards = [];
        document.querySelectorAll('.card-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        updateSaveButton();
        showNotification('選択をリセットしました');
    }
}

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
    showNotification('エラーが発生しました', 'error');
});