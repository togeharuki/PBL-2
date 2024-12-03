// Firebase設定とSDKのインポート
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
// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('ページ読み込み開始');
        const playerId = localStorage.getItem('playerId');
        const playerName = localStorage.getItem('playerName');
    try {
        console.log('ページ読み込み開始');
        const playerId = localStorage.getItem('playerId');
        const playerName = localStorage.getItem('playerName');
    try {
        const playerId = localStorage.getItem('playerId');
        const playerName = localStorage.getItem('playerName');

        if (!playerId) {
            console.log('プレイヤーIDが見つかりません');
            alert('ログインしてください');
            window.location.href = '../login.html';
            return;
        }
        if (!playerId) {
            console.log('プレイヤーIDが見つかりません');
            alert('ログインしてください');
            window.location.href = '../login.html';
            return;
        }
        if (!playerId) {
            alert('ログインしてください');
            window.location.href = '../login.html';
            return;
        }

        console.log('プレイヤー情報:', { playerId, playerName });
        document.getElementById('player-name').textContent = `プレイヤー名: ${playerName}`;
        document.getElementById('player-id').textContent = `ID: ${playerId}`;
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

    // カードをクリッカブルに見せるスタイルを追加
    cardElement.style.cursor = 'pointer';
    cardElement.appendChild(cardContent);
    return cardElement;
}
function handleCardSelection(checkbox, card, isSpecial) {
    const maxCards = isSpecial ? 20 : 10;
    const cardType = isSpecial ? 'special' : 'normal';
    const checkedCount = document.querySelectorAll(`input[data-card-type="${cardType}"]:checked`).length;
    
    if (checkbox.checked && checkedCount > maxCards) {
        checkbox.checked = false;
        showNotification(`${isSpecial ? '特殊' : '通常'}カードは${maxCards}枚までしか選択できません`, 'warning');
        return;
    }
    
    if (checkbox.checked) {
        selectedCards.push(card);
    } else {
        selectedCards = selectedCards.filter(c => c.name !== card.name);
    }
    updateSaveButton();
}
// デッキを保存
async function saveDeck() {
    try {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) {
            showNotification('ログインしてください', 'error');
            return;
        }

        // カードの選択数をチェック
        const normalCards = selectedCards.filter(card => !card.isSpecial && !card.isGacha);
        const specialCards = selectedCards.filter(card => card.isSpecial || card.isGacha);

        if (normalCards.length !== 10) {
            showNotification('通常カードを10枚選択してください', 'warning');
            return;
        }

        if (specialCards.length !== 20) {
            showNotification('特殊カードを20枚選択してください', 'warning');
            return;
        }

        const allDeckCards = [...normalCards, ...specialCards];

        // デッキを保存
        const deckRef = db.collection('Deck').doc(playerId);
        await deckRef.set({
            cards: allDeckCards,
            cards: allDeckCards,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showSuccessNotification();

    } catch (error) {
        console.error('デッキの保存に失敗しました:', error);
        showNotification('デッキの保存に失敗しました', 'error');
    }
}

function showSuccessNotification() {
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
    notification.textContent = 'デッキを保存しました！';
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 2000);
}

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

// スタイルの追加
const style = document.createElement('style');
style.textContent = `
    .card-item {
        transition: transform 0.2s, box-shadow 0.2s;
        position: relative;
    }

    .card-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .card-checkbox {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 2;
        opacity: 0;
    }

    .card-checkbox:checked + .card-content {
    background-color: rgba(78, 205, 196, 0.1);
    border: 6px solid rgb(78, 205, 196);  
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(78, 205, 196, 0.5); 
}

    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        opacity: 1;
        transition: opacity 0.5s ease;
    }

    .notification.info {
        background-color: #4e73df;
    }

    .notification.warning {
        background-color: #f6c23e;
    }

    .notification.error {
        background-color: #e74a3b;
    }

    .notification.fade-out {
        opacity: 0;
    }
});

// 選択されたカードの合計を取得
function getTotalSelectedCards() {
    const normalCheckboxes = document.querySelectorAll('input[data-card-type="normal"]:checked');
    const createdCheckboxes = document.querySelectorAll('input[data-card-type="created"]:checked');

    const normalCount = normalCheckboxes.length;
    const createdCount = createdCheckboxes.length;
    const total = normalCount + createdCount;

    console.log('カード選択状況:', {
        通常カード: normalCount,
        作成カード: createdCount,
        合計: total,
        チェックボックス総数: document.querySelectorAll('.card-checkbox').length
    });

    return { normalCount, createdCount, total };
}
