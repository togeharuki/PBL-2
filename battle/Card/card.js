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

document.addEventListener('DOMContentLoaded', function() {
    try {
        const savedCards = localStorage.getItem('cards');
        if (savedCards) {
            cards = JSON.parse(savedCards);
        }
    } catch (e) {
        console.error('Failed to load cards:', e);
        cards = [];
    }

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
    const saveDeckButton = document.getElementById('save-deck');

    // カード数の更新
    function updateCardCount() {
        const count = cards.length;
        cardCountDisplay.textContent = `作成したカード: ${count} / 20`;
        createButton.disabled = count >= 20;
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
            const snapshot = await db.collection('Card')
                .get();
            
            cards = snapshot.docs.map(doc => ({
                firebaseId: doc.id,
                ...doc.data()
            }));
            
            localStorage.setItem('cards', JSON.stringify(cards));
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
            const docRef = await db.collection('Card').add({
                name: card.name,
                image: card.image,
                effect: card.effect,
            });
            console.log('カードが保存されました。ID:', docRef.id);
            return docRef.id;
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
    }

    // カードの削除
    async function deleteCard(index) {
        try {
            if (cards[index].firebaseId) {
                await db.collection('Card')
                    .doc(cards[index].firebaseId).delete();
            }
            cards.splice(index, 1);
            localStorage.setItem('cards', JSON.stringify(cards));
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
        const value = Math.floor(Math.random() * 8) + 3;
        let effectText;
        if (type === 'heal') {
            effectText = `✨ 回復魔法 ${value} ✨`;
        } else {
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
    function showSuccessMessage(message = 'カードを作成しました！', duration = 3000) {
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
        if (file) {
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
        }
    });

    // ボタンのイベントリスナー
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

    createButton.addEventListener('click', async function() {
        if (!currentEffect) {
            alert('効果を選択してください。');
            return;
        }

        if (!previewImage.src || previewImage.style.display === 'none') {
            alert('画像を選択してください。');
            return;
        }

        if (cards.length >= 20) {
            alert('最大20枚までしか作成できません。');
            return;
        }

        try {
            const newCard = {
                name: cardNameInput.value.trim() || 'No Name',
                image: previewImage.src,
                effect: currentEffect
            };

            // Firebaseにカードを保存
            const firebaseId = await saveCardToFirebase(newCard);
            newCard.firebaseId = firebaseId;

            cards.push(newCard);
            localStorage.setItem('cards', JSON.stringify(cards));
            
            const cardElement = createCardElement(newCard, cards.length - 1);
            cardListGrid.appendChild(cardElement);
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            updateCardCount();
            showSuccessMessage();
            resetForm();

        } catch (error) {
            console.error('カードの作成に失敗しました:', error);
            alert('カードの作成に失敗しました: ' + error.message);
        }
    });

    // ページ読み込み時の初期化
    loadCardsFromFirebase();
    updateCardCount();
    showCardList();
});

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
});

// アンロード時の処理
window.addEventListener('beforeunload', function() {
    try {
        localStorage.setItem('cards', JSON.stringify(cards));
    } catch (e) {
        console.error('Storage error:', e);
    }
});