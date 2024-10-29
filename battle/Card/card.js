// サーバーサイドの設定
const express = require('express');
const mysql = require('mysql2');
const app = express();

// AWS RDS接続設定
const connection = mysql.createConnection({
    host: 'deck-dreamers.cnyeqqe06mm2.us-east-1.rds.amazonaws.com',
    user: 'admin',
    password: '',  // AWSのデータベースパスワードを設定
    database: 'deck_dreamers'
});

connection.connect(err => {
    if (err) {
        console.error('データベース接続エラー:', err);
        return;
    }
    console.log('AWS RDSに接続されました');
});

// Express設定
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// クライアントサイドの変数
let cards = JSON.parse(localStorage.getItem('cards') || '[]');
let currentEffect = '';
let effectGenerated = false;

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

// 画像圧縮用の関数
async function compressImage(base64String) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const maxWidth = 200;
            const maxHeight = 200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.1));
        };
        img.src = base64String;
    });
}

// カード数の更新
function updateCardCount() {
    const count = getCardCount();
    cardCountDisplay.textContent = `作成したカード: ${count} / 20`;
    createButton.disabled = count >= 20;
    startBattleButton.disabled = count < 20;
}

function getCardCount() {
    return cards.length;
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

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            deleteCard(index);
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
    const value = Math.floor(Math.random() * 10) + 1;
    return type === 'heal' ? `✨ 回復魔法 ${value} ✨` : `⚡ 攻撃力 ${value} ⚡`;
}

// 画像アップロード処理
imageInput.addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (file) {
        try {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const compressedImage = await compressImage(e.target.result);
                    previewImage.src = compressedImage;
                    previewImage.style.display = 'block';
                } catch (error) {
                    console.error('Image compression error:', error);
                    alert('画像の圧縮中にエラーが発生しました。');
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('File reading error:', error);
            alert('ファイルの読み込み中にエラーが発生しました。');
        }
    }
});

function disableEffectButtons() {
    heartButton.disabled = true;
    swordButton.disabled = true;
}

heartButton.addEventListener('click', function() {
    if (!effectGenerated) {
        currentEffect = generateRandomEffect('heal');
        previewEffect.textContent = currentEffect;
        effectGenerated = true;
        disableEffectButtons();
    }
});

swordButton.addEventListener('click', function() {
    if (!effectGenerated) {
        currentEffect = generateRandomEffect('attack');
        previewEffect.textContent = currentEffect;
        effectGenerated = true;
        disableEffectButtons();
    }
});

// カード作成処理
createButton.addEventListener('click', async function() {
    if (getCardCount() >= 20) {
        alert('最大20枚までしか作成できません。');
        return;
    }

    if (!currentEffect) {
        alert('効果を選択してください。');
        return;
    }

    try {
        const newCard = {
            name: cardNameInput.value.trim() || 'No Name',
            image: previewImage.src || '',
            effect: currentEffect
        };

        try {
            cards.push(newCard);
            localStorage.setItem('cards', JSON.stringify(cards));
        } catch (storageError) {
            cards.pop();
            alert('ストレージの容量が不足しています。既存のカードを削除してください。');
            return;
        }

        updateCardCount();
        showCardList();

        // フォームのリセット
        previewImage.src = '';
        previewImage.style.display = 'none';
        previewEffect.textContent = '';
        imageInput.value = '';
        cardNameInput.value = '';
        currentEffect = '';
        effectGenerated = false;
        heartButton.disabled = false;
        swordButton.disabled = false;

    } catch (error) {
        console.error('Error saving card:', error);
        alert('カードの保存中にエラーが発生しました。');
    }
});

// 対戦開始処理
startBattleButton.addEventListener('click', async function() {
    if (getCardCount() < 20) {
        alert('デッキを完成させるには20枚のカードが必要です。');
        return;
    }

    try {
        const processedCards = await Promise.all(cards.map(async card => ({
            name: card.name,
            effect: card.effect,
            image: card.image ? await compressImage(card.image) : ''
        })));

        const deckId = 'deck_' + Date.now();
        
        try {
            // AWS RDSにデータを保存
            const savePromises = processedCards.map(card => {
                return new Promise((resolve, reject) => {
                    const query = 'INSERT INTO cards (deck_id, card_name, card_effect, image_url) VALUES (?, ?, ?, ?)';
                    connection.query(query, [deckId, card.name, card.effect, card.image], (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    });
                });
            });

            await Promise.all(savePromises);

            sessionStorage.setItem('battle_deck', JSON.stringify({
                id: deckId,
                cards: processedCards
            }));
            localStorage.removeItem('cards');
            alert('デッキが保存されました。対戦を開始します。');
            window.location.href = '../../battle/battle.html';

        } catch (dbError) {
            throw new Error('データベースへの保存に失敗しました: ' + dbError.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('エラーが発生しました: ' + error.message);
    }
});

// 初期化
updateCardCount();
showCardList();

// サーバーの起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`サーバーがポート${PORT}で起動しました`);
});