// クライアントサイドのコード
let cards = [];
let currentEffect = '';
let effectGenerated = false;

// ページ読み込み時に保存されているカードを読み込む
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

        // 新しいカードの場合、アニメーション用クラスを追加
        if (index === cards.length - 1) {
            cardElement.classList.add('new-card');
        }

        // 削除ボタンのイベントリスナーを追加
        const deleteButton = cardElement.querySelector('.delete-button');
        deleteButton.addEventListener('click', () => deleteCard(index));

        return cardElement;
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
    function deleteCard(index) {
        cards.splice(index, 1);
        localStorage.setItem('cards', JSON.stringify(cards));
        updateCardCount();
        showCardList();
    }

    // ランダム効果の生成
    function generateRandomEffect(type) {
        const value = Math.floor(Math.random() * 8) + 3; // 3から10までの値を生成
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
    function showSuccessMessage(message = 'カードを作成しました！') {
        const messageElement = document.createElement('div');
        messageElement.className = 'success-message';
        messageElement.textContent = message;
        document.body.appendChild(messageElement);
        setTimeout(() => messageElement.remove(), 2000);
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

    createButton.addEventListener('click', function() {
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

        const newCard = {
            name: cardNameInput.value.trim() || 'No Name',
            image: previewImage.src,
            effect: currentEffect
        };

        cards.push(newCard);
        localStorage.setItem('cards', JSON.stringify(cards));
        
        const cardElement = createCardElement(newCard, cards.length - 1);
        cardListGrid.appendChild(cardElement);
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        updateCardCount();
        showSuccessMessage();
        resetForm();
    });

    saveDeckButton.addEventListener('click', async function() {
        if (cards.length === 0) {
            alert('カードが作成されていません。');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/save-cards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cards: cards
                })
            });

            const result = await response.json();
            if (result.success) {
                showSuccessMessage('カードがデータベースに保存されました！');
                localStorage.removeItem('cards');
                cards = [];
                updateCardCount();
                showCardList();
            } else {
                throw new Error(result.message || 'カードの保存に失敗しました');
            }

        } catch (error) {
            console.error('Error:', error);
            alert('エラーが発生しました: ' + error.message);
        }
    });

    // 初期化
    updateCardCount();
    showCardList();
});