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
        await loadGachaCards(); // 追加: ガチャカードの読み込み
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

        if (cards.length === 0) {
            console.error('倉庫にカードが存在しません');
            showNotification('効果カードが見つかりません', 'error');
            return;
        }

        const deckRef = db.collection('Deck').doc(playerId);
        const deckDoc = await deckRef.get();

        const currentDeck = deckDoc.exists ? 
            deckDoc.data().cards.filter(card => !card.isCreated) : 
            [];

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
// ガチャカードを読み込む関数を追加
async function loadGachaCards() {
    try {
        const playerId = localStorage.getItem('playerId');
        const soukoRef = db.collection('Souko').doc(playerId);
        const soukoDoc = await soukoRef.get();

        if (soukoDoc.exists) {
            const gachaData = soukoDoc.data().cards || {};
            const gachaGrid = document.getElementById('gacha-cards-grid'); // ガチャカード用のグリッド
            gachaGrid.innerHTML = '';

            Object.entries(gachaData).forEach(([cardId, card]) => {
                const cardElement = createCardElement(card);
                cardElement.querySelector('.card-checkbox').dataset.cardType = 'gacha'; // データ属性を追加
                gachaGrid.appendChild(cardElement);
            });
        }
    } catch (error) {
        console.error('ガチャカードの読み込みに失敗しました:', error);
        showNotification('ガチャカードの読み込みに失敗しました', 'error');
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

// その他の関数やエラーハンドリング...
// (省略せずに必要な部分も含めて記述してください)
