// Firebase設定と初期化を追加
let cards = [];
let currentEffect = '';
let effectGenerated = false;

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

// プレイヤー情報の取得
const playerId = localStorage.getItem('playerId');
if (!playerId) {
    console.error('プレイヤー情報が見つかりません');
    alert('ログインしてください');
    window.location.href = 'login.html';
}

// Card/{playerId} のパスでコレクションの参照を作成
const playerCardsRef = db.collection('Card').doc(playerId.toString());

document.addEventListener('DOMContentLoaded', function() {
    // DOM要素の取得
    const imageInput = document.getElementById('card-image');
    const createButton = document.getElementById('create-card');
    const previewImage = document.getElementById('preview-image');
    const previewEffect = document.getElementById('preview-effect');
    const heartButton = document.getElementById('heart-button');
    const swordButton = document.getElementById('sword-button');
    const cardNameInput = document.getElementById('card-name-input');
    const cardCountDisplay = document.getElementById('card-count');
    const cardListGrid = document.getElementById('card-list-grid');
    const deckEditContainer = document.getElementById('deck-edit-container');

    // カード数の更新とデッキ編集ボタンの表示制御
    function updateCardCount() {
        const count = cards.length;
        cardCountDisplay.textContent = `作成したカード: ${count} / 20`;
        createButton.disabled = count >= 20;
        
        // 20枚になったらデッキ編集ボタンを表示
        if (count >= 20) {
            deckEditContainer.style.display = 'block';
            // スムーズにスクロール
            setTimeout(() => {
                deckEditContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        } else {
            deckEditContainer.style.display = 'none';
        }
    }

    // カード要素を作成する関数
    function createCardElement(card, index) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card-item';
        cardElement.innerHTML = `
            <button class="delete-button" data-index="${index}">×</button>
            <div class="card-image">
                <img src="${card.image}" alt="カード ${index + 1}">
            </div>
            <div class="card-name-display">${card.name || 'No Name'}</div>
            <div class="card-effect">${card.effect}</div>
        `;

        if (index === cards.length - 1) {
            cardElement.classList.add('new-card');
        }

        const deleteButton = cardElement.querySelector('.delete-button');
        deleteButton.addEventListener('click', () => deleteCard(index));

        return cardElement;
    }
    // Firebaseからカードを読み込む関数
    async function loadCardsFromFirebase() {
        try {
            const doc = await playerCardsRef.get();
            if (doc.exists) {
                cards = Object.entries(doc.data() || {})
                    .filter(([key, _]) => key !== 'timestamp')
                    .map(([id, cardData]) => ({
                        firebaseId: id,
                        ...cardData
                    }))
                    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            } else {
                cards = [];
            }
            
            updateCardCount();
            showCardList();
        } catch (error) {
            console.error('カードの読み込みに失敗しました:', error);
            alert('カードの読み込みに失敗しました: ' + error.message);
        }
    }

    // カードをFirebaseに保存する関数
    async function saveCardToFirebase(card) {
        try {
            const cardId = `card_${Date.now()}`;
            const cardData = {
                name: card.name,
                image: card.image,
                effect: card.effect,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            await playerCardsRef.set({
                [cardId]: cardData
            }, { merge: true });

            console.log('カードが保存されました。ID:', cardId);
            return cardId;
        } catch (error) {
            console.error('カードの保存に失敗しました:', error);
            throw error;
        }
    }

    // カードリストの表示
    function showCardList() {
        cardListGrid.innerHTML = '';
        cards.forEach((card, index) => {
            const cardElement = createCardElement(card, index);
            cardListGrid.appendChild(cardElement);
        });
        updateCardCount();
    }

    // カードの削除
    async function deleteCard(index) {
        try {
            const cardId = cards[index].firebaseId;
            if (cardId) {
                await playerCardsRef.update({
                    [cardId]: firebase.firestore.FieldValue.delete()
                });
            }
            cards.splice(index, 1);
            updateCardCount();
            showCardList();
            showSuccessMessage('カードを削除しました');
        } catch (error) {
            console.error('カードの削除に失敗しました:', error);
            alert('カードの削除に失敗しました: ' + error.message);
        }
    }

    // ランダム効果の生成
    function generateRandomEffect(type) {
        let value;
        let effectText;
        if (type === 'heal') {
            // 回復効果の値を1から3の間で生成
            value = Math.floor(Math.random() * 3) + 1; // 1から3の範囲
            effectText = `✨ 回復魔法 ${value} ✨`;
        } else if (type === 'attack') {
            // 攻撃力の値を3から10の間で生成
            value = Math.floor(Math.random() * 8) + 3; // 3から10の範囲
            effectText = `⚡ 攻撃力 ${value} ⚡`;
        }
        
        previewEffect.textContent = effectText;
        currentEffect = effectText;
        effectGenerated = true;
        return effectText;
    }

    function disableEffectButtons() {
        heartButton.disabled = true;
        swordButton.disabled = true;
    }

    // 成功メッセージの表示
    function showSuccessMessage(message = 'カードを保存しました！', duration = 3000) {
        const messageElement = document.createElement('div');
        messageElement.className = 'success-message';
        messageElement.innerHTML = `
            <div class="success-icon">✔</div>
            <div class="success-text">${message}</div>
        `;
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            messageElement.remove();
        }, duration);
    }
// リセット関数
function resetForm() {
    previewImage.src = '';
    previewImage.style.display = 'none';
    previewEffect.textContent = '';
    imageInput.value = '';
    cardNameInput.value = '';
    currentEffect = '';
    effectGenerated = false;
    heartButton.disabled = false;
    swordButton.disabled = false;
}

// イベントリスナー設定
imageInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // リサイズ処理
            const maxWidth = 300;
            const maxHeight = 300;
            let width = img.width;
            let height = img.height;

            if (width > height && width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            } else if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // 圧縮した画像をプレビューに設定
            const compressedImage = canvas.toDataURL('image/jpeg', 0.7);
            previewImage.src = compressedImage;
            previewImage.style.display = 'block';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

// 効果ボタンのイベントリスナー
heartButton.addEventListener('click', function() {
    if (!effectGenerated) {
        generateRandomEffect('heal');
        disableEffectButtons();
    }
});

swordButton.addEventListener('click', function() {
    if (!effectGenerated) {
        generateRandomEffect('attack');
        disableEffectButtons();
    }
});

// カード作成ボタンのイベントリスナー
createButton.addEventListener('click', async function() {
    if (!currentEffect) {
        showMessage('効果を選択してください。', 'error');
        return;
    }

    if (!previewImage.src || previewImage.style.display === 'none') {
        showMessage('画像を選択してください。', 'error');
        return;
    }

    if (cards.length >= 20) {
        showMessage('最大20枚までしか作成できません。', 'error');
        return;
    }

    // 回復カードの枚数をカウント
    const healCardCount = cards.filter(card => card.effect.startsWith('✨ 回復魔法')).length;
    if (currentEffect.startsWith('✨ 回復魔法') && healCardCount >= 4) {
        showMessage('回復カードは最大4枚までしか作成できません。', 'error');
        // 効果をリセットしてボタンを再度有効にする
        resetEffect();
        return;
    }

    try {
        const newCard = {
            name: cardNameInput.value.trim() || 'No Name',
            image: previewImage.src,
            effect: currentEffect,
            timestamp: new Date()
        };

        // Firebaseにカードを保存
        const firebaseId = await saveCardToFirebase(newCard);
        newCard.firebaseId = firebaseId;

        cards.push(newCard);
        
        const cardElement = createCardElement(newCard, cards.length - 1);
        cardListGrid.appendChild(cardElement);
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        updateCardCount();
        showSuccessMessage();
        resetForm();

        // カードが20枚になったらデッキ編集ボタンを表示してスクロール
        if (cards.length >= 20) {
            setTimeout(() => {
                document.getElementById('deck-edit-container').scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 500);
        }

    } catch (error) {
        console.error('カードの作成に失敗しました:', error);
        showMessage('カードの作成に失敗しました: ' + error.message, 'error');
    }
});

// 効果をリセットする関数
function resetEffect() {
    currentEffect = '';
    effectGenerated = false;
    heartButton.disabled = false;
    swordButton.disabled = false;
    previewEffect.textContent = ''; // プレビュー効果をクリア
}

// ページ読み込み時の初期化
loadCardsFromFirebase();
updateCardCount();
showCardList();
});

// エラーハンドリング
window.addEventListener('error', function(event) {
console.error('エラーが発生しました:', event.error);
});