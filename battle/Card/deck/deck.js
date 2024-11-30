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

        // Firebase接続確認
        if (!db) {
            throw new Error('Firebaseデータベースが初期化されていません');
        }

        // カードの読み込み
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
        
        // 倉庫からカードを読み込む
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
        console.log('倉庫データ:', cardData);

        // カードデータを配列に変換
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
        console.log('デッキデータ取得:', deckDoc.exists);

        const currentDeck = deckDoc.exists ? 
            deckDoc.data().cards.filter(card => !card.isCreated) : 
            [];
        console.log('現在のデッキ内の既存カード数:', currentDeck.length);

        // カードを表示
        let displayedCount = 0;
        for (const card of cards) {
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
            displayedCount++;
        }
        console.log('表示した効果カード数:', displayedCount);

        if (displayedCount === 0) {
            showNotification('効果カードが見つかりません', 'error');
        }

    } catch (error) {
        console.error('デッキの読み込みに失敗しました:', error);
        console.error('エラーの詳細:', {
            error: error.message,
            stack: error.stack
        });
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
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'card-checkbox';
    if (isCreated) {
        checkbox.dataset.cardId = card.id;
        checkbox.dataset.cardType = 'created';
    } else {
        checkbox.dataset.cardType = 'normal';
    }
    
    checkbox.addEventListener('change', function() {
        const { normalCount, createdCount } = getTotalSelectedCards();
        
        if (this.checked) {
            if (this.dataset.cardType === 'created' && createdCount > 20) {
                this.checked = false;
                showNotification('作成カードは20枚までしか選択できません');
                return;
            }
            if (this.dataset.cardType === 'normal' && normalCount > 10) {
                this.checked = false;
                showNotification('既存カードは10枚までしか選択できません');
                return;
            }
            
            if (this.dataset.cardType === 'created') {
                const cardId = this.dataset.cardId;
                const selectedCard = createdCards.find(c => c.id === cardId);
                if (selectedCard) {
                    selectedCards.push(selectedCard);
                }
            } else {
                selectedCards.push(card);
            }
        } else {
            if (this.dataset.cardType === 'created') {
                const cardId = this.dataset.cardId;
                selectedCards = selectedCards.filter(c => c.id !== cardId);
            } else {
                selectedCards = selectedCards.filter(c => c.name !== card.name);
            }
        }
        updateSaveButton();
    });
    
    cardElement.appendChild(checkbox);

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
            ${isCreated ? '<div class="created-card-label">作成カード</div>' : ''}
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
    try {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) {
            showNotification('ログインしてください', 'error');
            return;
        }

        const { normalCount, createdCount, total } = getTotalSelectedCards();

        // カード枚数の確認
        if (normalCount !== 10) {
            showNotification('既存カードは10枚選択する必要があります');
            return;
        }
        if (createdCount !== 20) {
            showNotification('作成カードは20枚選択する必要があります');
            return;
        }
        if (total !== 30) {
            showNotification('デッキは合計30枚のカードを選択する必要があります');
            return;
        }

        // 選択された通常カードを取得
        const normalCards = [];
        document.querySelectorAll('input[data-card-type="normal"]:checked').forEach(checkbox => {
            const cardElement = checkbox.closest('.card-item');
            const cardName = cardElement.querySelector('.card-name').textContent.trim();
            const cardEffect = cardElement.querySelector('.card-effect').textContent.trim();
            const cardImage = cardElement.querySelector('.card-image img')?.src || getCardImagePath({ name: cardName });
            
            normalCards.push({
                name: cardName,
                effect: cardEffect,
                type: 'normal',
                image: cardImage,
                isCreated: false
            });
        });

        // 選択された作成カードを取得
        const selectedCreatedCards = [];
        document.querySelectorAll('input[data-card-type="created"]:checked').forEach(checkbox => {
            const cardId = checkbox.dataset.cardId;
            const foundCard = createdCards.find(c => c.id === cardId);
            if (foundCard) {
                selectedCreatedCards.push({
                    name: foundCard.name,
                    effect: foundCard.effect,
                    type: 'created',
                    image: foundCard.image,
                    isCreated: true
                });
            }
        });

        // 全てのカードを結合
        const allDeckCards = [...normalCards, ...selectedCreatedCards];

        console.log('保存するデッキデータ:', {
            通常カード: normalCards.length,
            作成カード: selectedCreatedCards.length,
            合計: allDeckCards.length,
            データ: allDeckCards
        });

        if (allDeckCards.length !== 30) {
            throw new Error(`カードの総数が不正です: ${allDeckCards.length}`);
        }

        // デッキを保存
        const deckRef = db.collection('Deck').doc(playerId);
        await deckRef.set({
            cards: allDeckCards,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('デッキを保存しました', 'success');

        // 保存成功後、選択状態をリセット
        selectedCards = [];
        updateSaveButton();

    } catch (error) {
        console.error('デッキの保存に失敗しました:', error);
        showNotification('データの保存に失敗しました: ' + error.message, 'error');
    }
}

// 保存ボタンの状態を更新
function updateSaveButton() {
    const saveButton = document.getElementById('save-deck-button');
    const cardCounter = document.getElementById('card-counter');
    
    const { normalCount, createdCount, total } = getTotalSelectedCards();
    
    if (saveButton) {
        const isValid = normalCount === 10 && createdCount === 20;
        saveButton.disabled = !isValid;
        saveButton.classList.toggle('ready', isValid);
    }
    
    if (cardCounter) {
        cardCounter.textContent = `選択中: 既存${normalCount}/10 作成${createdCount}/20 (合計${total}/30)`;
        cardCounter.classList.toggle('complete', total === 30);
    }

    // デバッグ情報
    console.log('カード選択状態:', {
        normalCount,
        createdCount,
        total,
        selectedCards: selectedCards.length,
        createdChecked: document.querySelectorAll('input[data-card-type="created"]:checked').length
    });
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
