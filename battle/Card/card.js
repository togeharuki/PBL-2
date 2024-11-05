// Express と MySQL の設定
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();

// データベース接続設定
const connection = mysql.createConnection({
    host: 'deck-dreamers.cnyeqqe06mm2.us-east-1.rds.amazonaws.com',
    user: 'admin',
    password: '', // AWSのデータベースパスワードを設定
    database: 'deck_dreamers'
});

// データベース接続
connection.connect(err => {
    if (err) {
        console.error('データベース接続エラー:', err);
        return;
    }
    console.log('データベースに接続されました');
});

// Express設定
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// デッキ保存API
app.post('/api/save-deck', async (req, res) => {
    const { deckId, cards } = req.body;

    try {
        await connection.promise().beginTransaction();

        // カードデータの保存
        for (const card of cards) {
            await connection.promise().query(
                'INSERT INTO cards (deck_id, card_name, card_effect, image_url) VALUES (?, ?, ?, ?)',
                [deckId, card.name, card.effect, card.image]
            );
        }

        await connection.promise().commit();
        res.json({ success: true, message: 'デッキが保存されました', deckId: deckId });

    } catch (error) {
        await connection.promise().rollback();
        console.error('デッキ保存エラー:', error);
        res.status(500).json({ success: false, message: 'デッキの保存中にエラーが発生しました' });
    }
});

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`サーバーがポート${PORT}で起動しました`);
});

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
        const value = Math.floor(Math.random() * 10) + 1;
        return type === 'heal' ? `✨ 回復魔法 ${value} ✨` : `⚡ 攻撃力 ${value} ⚡`;
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
            
            const response = await fetch('/api/save-deck', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    deckId: deckId,
                    cards: cards
                })
            });

            if (!response.ok) {
                throw new Error('デッキの保存に失敗しました');
            }

            sessionStorage.setItem('battle_deck', JSON.stringify({
                id: deckId,
                cards: cards
            }));
            
            localStorage.removeItem('cards');
            alert('デッキが保存されました。対戦を開始します。');
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
process.on('uncaughtException', (error) => {
    console.error('予期せぬエラーが発生しました:', error);
});

// 終了時の処理
process.on('SIGTERM', () => {
    connection.end();
    process.exit(0);
});