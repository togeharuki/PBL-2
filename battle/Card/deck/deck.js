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
const initializeFirebase = () => {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        return firebase.firestore();
    } catch (error) {
        console.error('Firebase初期化エラー:', error);
        return null;
    }
};

const db = initializeFirebase();
let selectedCards = [];
let createdCards = [];
let allCards = new Set();
let sortOption = 'name';

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
        await loadGachaCards();
        await loadCreatedCards();
        updateSaveButton();
        console.log('カードデータ読み込み完了');

    } catch (error) {
        console.error('初期化エラー:', error);
        showNotification('データの読み込みに失敗しました', 'error');
    }
});

// 並べ替えオプションの変更
function sortCards() {
    sortOption = document.getElementById('sort-select').value;
    loadDeckCards();
    loadGachaCards();
    loadCreatedCards();
}

// デッキのカードを読み込む
async function loadDeckCards() {
    try {
        console.log('既存カードの読み込み開始');
        const playerId = localStorage.getItem('playerId');
        
        const soukoRef = db.collection('Souko').doc(playerId);
        const soukoDoc = await soukoRef.get();

        const existingCardsGrid = document.getElementById('existing-cards-grid');
        existingCardsGrid.innerHTML = '';

        if (!soukoDoc.exists) {
            console.error('倉庫データが見つかりません');
            showNotification('カードデータの読み込みに失敗しました', 'error');
            return;
        }

        const cardData = soukoDoc.data();
        const cardCount = {};
        const cards = Object.entries(cardData)
            .filter(([key]) => key.startsWith('default_card_') && !key.startsWith('default_card_ガチャID:'))
            .map(([_, card]) => ({
                name: card.name,
                type: 'effect',
                effect: card.effect,
                image: card.image,
                explanation: card.explanation,
                timestamp: card.timestamp,
                rarity: card.rarity || 'common' // レアリティがない場合は 'common' とする
            }))
            .filter(card => {
                if (!cardCount[card.name]) {
                    cardCount[card.name] = 0;
                }
                cardCount[card.name]++;
                return cardCount[card.name] <= 2;
            })
            .sort((a, b) => {
                if (sortOption === 'name') {
                    return a.name.localeCompare(b.name);
                } else if (sortOption === 'rarity') {
                    return a.rarity.localeCompare(b.rarity);
                } else if (sortOption === 'timestamp') {
                    return (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0);
                }
            });

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
            existingCardsGrid.appendChild(cardElement);
        });

    } catch (error) {
        console.error('デッキの読み込みに失敗しました:', error);
        showNotification('デッキの読み込みに失敗しました', 'error');
    }
}

// ガチャカードを読み込む
async function loadGachaCards() {
    try {
        console.log('ガチャカードの読み込み開始');
        const playerId = localStorage.getItem('playerId');
        
        const soukoRef = db.collection('Souko').doc(playerId);
        const soukoDoc = await soukoRef.get();

        const gachaCardsGrid = document.getElementById('gacha-cards-grid');
        gachaCardsGrid.innerHTML = '';

        if (!soukoDoc.exists) {
            console.error('倉庫データが見つかりません');
            showNotification('カードデータの読み込みに失敗しました', 'error');
            return;
        }

        const cardData = soukoDoc.data();
        const cardCount = {};
        const cards = Object.entries(cardData)
            .filter(([key]) => key.startsWith('default_card_ガチャID:'))
            .map(([_, card]) => ({
                name: card.name,
                type: 'effect',
                effect: card.effect,
                image: card.image,
                explanation: card.explanation,
                timestamp: card.timestamp,
                rarity: card.rarity || 'common' // レアリティがない場合は 'common' とする
            }))
            .filter(card => {
                if (!cardCount[card.name]) {
                    cardCount[card.name] = 0;
                }
                cardCount[card.name]++;
                return cardCount[card.name] <= 2;
            })
            .sort((a, b) => {
                if (sortOption === 'name') {
                    return a.name.localeCompare(b.name);
                } else if (sortOption === 'rarity') {
                    return a.rarity.localeCompare(b.rarity);
                } else if (sortOption === 'timestamp') {
                    return (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0);
                }
            });

        if (cards.length === 0) {
            console.error('倉庫にカードが存在しません');
            showNotification('効果カードが見つかりません', 'error');
            return;
        }

        cards.forEach(card => {
            const cardElement = createCardElement(card);
            gachaCardsGrid.appendChild(cardElement);
        });

    } catch (error) {
        console.error('ガチャカードの読み込みに失敗しました:', error);
        showNotification('ガチャカードの読み込みに��敗しました', 'error');
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
            const createdCardsGrid = document.getElementById('created-cards-grid');
            createdCardsGrid.innerHTML = '';

            const cardsArray = Object.entries(cardData)
                .filter(([key, _]) => key !== 'timestamp')
                .map(([id, card]) => ({
                    ...card,
                    id,
                    isCreated: true,
                    rarity: card.rarity || 'common' // レアリティがない場合は 'common' とする
                }))
                .sort((a, b) => {
                    if (sortOption === 'name') {
                        return a.name.localeCompare(b.name);
                    } else if (sortOption === 'rarity') {
                        return a.rarity.localeCompare(b.rarity);
                    } else if (sortOption === 'timestamp') {
                        return (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0);
                    }
                })
                .slice(0, 20);

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
    
    if (!isCreated) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'card-checkbox';
        checkbox.dataset.cardType = 'normal';
        
        cardElement.addEventListener('click', function(e) {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });

        checkbox.addEventListener('change', function() {
            const checkedCount = document.querySelectorAll('input[data-card-type="normal"]:checked').length;
            
            if (this.checked && checkedCount > 15) {
                this.checked = false;
                showNotification('既存カードとガチャカードは合計15枚までしか選択できません', 'warning');
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

    cardElement.style.cursor = 'pointer';
    cardElement.appendChild(cardContent);
    return cardElement;
}

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

        const normalCards = selectedCards.map(card => ({
            name: card.name,
            effect: card.effect,
            type: 'normal',
            image: card.image,
            isCreated: false,
            explanation: card.explanation
        }));

        if (normalCards.length !== 15) {
            showNotification('既存カードとガチャカードを合計15枚選択してください', 'warning');
            return;
        }

        if (createdCards.length !== 20) {
            showNotification('作成カードが20枚必要です', 'warning');
            return;
        }

        const createdCardData = createdCards.map(card => ({
            name: card.name,
            effect: card.effect,
            type: 'created',
            image: card.image,
            isCreated: true
        }));

        const allDeckCards = [...normalCards, ...createdCardData];

        const deckRef = db.collection('Deck').doc(playerId);
        await deckRef.set({
            cards: allDeckCards,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

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

    } catch (error) {
        console.error('デッキの保存に失敗しました:', error);
        showNotification('デッキの保存に失敗しました', 'error');
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

// 保存ボタンの状態を更新
function updateSaveButton() {
    const saveButton = document.getElementById('save-deck-button');
    const cardCounter = document.getElementById('card-counter');
    
    const checkedCount = document.querySelectorAll('input[data-card-type="normal"]:checked').length;
    const isValid = checkedCount === 15 && createdCards.length === 20;
    
    if (saveButton) {
        saveButton.disabled = !isValid;
        saveButton.classList.toggle('ready', isValid);
    }
    
    if (cardCounter) {
        cardCounter.textContent = `選択中: ${checkedCount}/15枚 (作成カード: ${createdCards.length}/20枚)`;
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
`;

document.head.appendChild(style);