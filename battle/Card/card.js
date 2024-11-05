// クライアントサイドのコード
let cards = JSON.parse(localStorage.getItem('cards') || '[]');
let currentEffect = '';
let effectGenerated = false;

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
    const startBattleButton = document.getElementById('start-battle');

    // カード数の更新
    function updateCardCount() {
        const count = cards.length;
        cardCountDisplay.textContent = `作成したカード: ${count} / 20`;
        createButton.disabled = count >= 20;
        startBattleButton.disabled = count < 20;
    }

    // カードリストの表示
    function showCardList() {
        cardListGrid.innerHTML = '';
        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card-item';
            cardElement.innerHTML = `
                <button class="delete-button" data-index="${index}">×</button>
                <div class="card-image">
                    <img src="${card.image || ''}" alt="カード ${index + 1}" style="${!card.image ? 'display: none;' : ''}">
                </div>
                <div class="card-name-display">${card.name || 'No Name'}</div>
                <div class="card-effect">${card.effect}</div>
            `;
            cardListGrid.appendChild(cardElement);
        });

        // 削除ボタンのイベントリスナー
        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', function() {
                deleteCard(parseInt(this.getAttribute('data-index')));
            });
        });
    }

    // カードの削除
    function deleteCard(index) {
        cards.splice(index, 1);
        try {
            localStorage.setItem('cards', JSON.stringify(cards));
        } catch (e) {
            console.error('Storage error:', e);
        }
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
        
        // プレビューエフェクトに直接表示
        previewEffect.textContent = effectText;
        currentEffect = effectText;
        effectGenerated = true;
        return effectText;
    }

    function disableEffectButtons() {
        heartButton.disabled = true;
        swordButton.disabled = true;
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

                    // 圧縮した画像をプレビューに表示
                    previewImage.src = canvas.toDataURL('image/jpeg', 0.7);
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
        if (cards.length >= 20) {
            alert('最大20枚までしか作成できません。');
            return;
        }

        if (!currentEffect) {
            alert('効果を選択してください。');
            return;
        }

        if (!previewImage.src || previewImage.style.display === 'none') {
            alert('画像を選択してください。');
            return;
        }

        try {
            const newCard = {
                name: cardNameInput.value.trim() || 'No Name',
                image: previewImage.src,
                effect: currentEffect
            };

            cards.push(newCard);
            localStorage.setItem('cards', JSON.stringify(cards));
            updateCardCount();
            showCardList();
            resetForm();

        } catch (error) {
            console.error('Error saving card:', error);
            alert('カードの保存中にエラーが発生しました。');
        }
    });

    startBattleButton.addEventListener('click', async function() {
        if (cards.length < 20) {
            alert('デッキを完成させるには20枚のカードが必要です。');
            return;
        }

        try {
            const deckId = 'deck_' + Date.now();
            
            // デッキ情報をセッションストレージに保存
            sessionStorage.setItem('battle_deck', JSON.stringify({
                id: deckId,
                cards: cards
            }));
            
            // ローカルストレージのカードをクリア
            localStorage.removeItem('cards');
            alert('対戦を開始します。');
            window.location.href = '../battle/battle.html';

        } catch (error) {
            console.error('Error:', error);
            alert('エラーが発生しました: ' + error.message);
        }
    });

    // 初期化
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