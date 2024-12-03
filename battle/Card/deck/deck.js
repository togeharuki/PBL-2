const firebaseConfig = {
    projectId: "deck-dreamers",
    organizationId: "oic-ok.ac.jp",
    projectNumber: "165933225805"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let selectedCards = [];
let createdCards = [];
let gachaCards = [];
let allCards = new Set();

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const playerId = localStorage.getItem('playerId');
        const playerName = localStorage.getItem('playerName');

        if (!playerId) {
            alert('ログインしてください');
            window.location.href = '../login.html';
            return;
        }

        document.getElementById('player-name').textContent = `プレイヤー名: ${playerName}`;
        document.getElementById('player-id').textContent = `ID: ${playerId}`;

        await loadAllCards();
        updateSaveButton();

    } catch (error) {
        console.error('初期化エラー:', error);
        showNotification('データの読み込みに失敗しました', 'error');
    }
});

async function loadAllCards() {
    const playerId = localStorage.getItem('playerId');
    try {
        await Promise.all([
            loadDeckCards(),
            loadCreatedCards(),
            loadGachaCards()
        ]);
    } catch (error) {
        console.error('カードの読み込みに失敗:', error);
        throw error;
    }
}

async function loadDeckCards() {
    try {
        const playerId = localStorage.getItem('playerId');
        const soukoRef = db.collection('Souko').doc(playerId);
        const soukoDoc = await soukoRef.get();

        const deckGrid = document.getElementById('deck-grid');
        deckGrid.innerHTML = '';

        if (!soukoDoc.exists) return;

        const cardData = soukoDoc.data();
        const defaultCards = Object.entries(cardData)
            .filter(([key]) => key.startsWith('default_card_'))
            .map(([_, card]) => ({
                name: card.name,
                type: 'effect',
                effect: card.effect,
                image: card.image,
                timestamp: card.timestamp
            }));

        const deckRef = db.collection('Deck').doc(playerId);
        const deckDoc = await deckRef.get();
        const currentDeck = deckDoc.exists ? 
            deckDoc.data().cards.filter(card => !card.isCreated) : 
            [];

        defaultCards.forEach(card => {
            const cardElement = createCardElement(card, false);
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
        console.error('デッキカードの読み込みに失敗:', error);
        throw error;
    }
}
async function loadCreatedCards() {
    try {
        const playerId = localStorage.getItem('playerId');
        const cardRef = db.collection('Card').doc(playerId);
        const doc = await cardRef.get();

        if (doc.exists) {
            const cardData = doc.data();
            const createdCardsSection = createCardsSection('作成したカード', 'created-cards-grid');
            const createdCardsGrid = document.getElementById('created-cards-grid');

            const cardsArray = Object.entries(cardData)
                .filter(([key, _]) => key !== 'timestamp')
                .map(([id, card]) => ({
                    ...card,
                    id,
                    isCreated: true
                }))
                .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
                .slice(0, 20);

            createdCards = cardsArray;

            cardsArray.forEach(card => {
                const cardElement = createCardElement(card, true);
                createdCardsGrid.appendChild(cardElement);
            });
        }
    } catch (error) {
        console.error('作成カードの読み込みに失敗:', error);
        throw error;
    }
}

function createCardsSection(title, gridId) {
    const section = document.createElement('div');
    section.className = 'deck-container';
    section.innerHTML = `
        <h2 class="section-title">${title}</h2>
        <div class="deck-grid" id="${gridId}"></div>
    `;
    document.querySelector('.deck-container').after(section);
    return section;
}

function createCardElement(card, isSpecial = false) {
    const cardElement = document.createElement('div');
    cardElement.className = `card-item ${card.rarity || ''}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'card-checkbox';
    checkbox.dataset.cardType = isSpecial ? 'special' : 'normal';
    
    checkbox.addEventListener('change', function() {
        handleCardSelection(this, card, isSpecial);
    });
    
    cardElement.appendChild(checkbox);

    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    cardContent.innerHTML = `
        <div class="card-image">
            <img src="${card.image}" alt="${card.name}" loading="lazy">
        </div>
        <div class="card-info">
            <div class="card-name">${card.name}</div>
            <div class="card-effect">${card.effect || ''}</div>
            ${card.rarity ? `<div class="card-rarity">${card.rarity}</div>` : ''}
        </div>
    `;

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

function updateSaveButton() {
    const saveButton = document.getElementById('save-deck-button');
    if (!saveButton) return;

    const normalCount = selectedCards.filter(card => !card.isSpecial && !card.isGacha).length;
    const specialCount = selectedCards.filter(card => card.isSpecial || card.isGacha).length;
    
    const isValid = normalCount === 10 && specialCount === 20;
    saveButton.disabled = !isValid;
    saveButton.classList.toggle('ready', isValid);
    
    updateCardCounter(normalCount, specialCount);
}

function updateCardCounter(normalCount, specialCount) {
    const cardCounter = document.getElementById('card-counter');
    if (cardCounter) {
        cardCounter.textContent = `選択中: 通常${normalCount}/10枚 特殊${specialCount}/20枚`;
        cardCounter.classList.toggle('complete', normalCount === 10 && specialCount === 20);
    }
}

window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
    showNotification('エラーが発生しました', 'error');
});