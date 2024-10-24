const imageInput = document.getElementById('card-image');
const createButton = document.getElementById('create-card');
const previewImage = document.getElementById('preview-image');
const previewEffect = document.getElementById('preview-effect');
const cardCountDisplay = document.getElementById('card-count');
const cardList = document.getElementById('card-list');
const cardListGrid = document.getElementById('card-list-grid');
const startBattleButton = document.getElementById('start-battle');
const heartButton = document.getElementById('heart-button');
const swordButton = document.getElementById('sword-button');
const cardNameInput = document.getElementById('card-name-input');

let cards = JSON.parse(localStorage.getItem('cards') || '[]');
let currentEffect = '';
let effectGenerated = false;

updateCardCount();
showCardList();

imageInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
const reader = new FileReader();
reader.onload = function(e) {
    previewImage.src = e.target.result;
}
reader.readAsDataURL(file);
    }
});

function generateRandomEffect(type) {
    const value = Math.floor(Math.random() * 10) + 1;
    if (type === 'heal') {
return `✨ 回復魔法 ${value} ✨`;
    } else {
return `⚡ 攻撃力 ${value} ⚡`;
    }
}

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

createButton.addEventListener('click', function() {
    if (getCardCount() >= 20) {
alert('最大20枚までしか作成できません。');
return;
    }

    if (!previewImage.src) {
alert('写真をアップロードしてください。');
return;
    }

    if (!currentEffect) {
alert('効果を選択してください。');
return;
    }

    if (!cardNameInput.value.trim()) {
alert('カード名を入力してください。');
return;
    }

    const newCard = {
name: cardNameInput.value.trim(),
image: previewImage.src,
effect: currentEffect
    };

    cards.push(newCard);
    localStorage.setItem('cards', JSON.stringify(cards));
    updateCardCount();
    showCardList();

    // リセット
    previewImage.src = '';
    previewEffect.textContent = '';
    imageInput.value = '';
    cardNameInput.value = '';
    currentEffect = '';
    effectGenerated = false;
    heartButton.disabled = false;
    swordButton.disabled = false;
});

function getCardCount() {
    return cards.filter(card => card.image).length;
}

function updateCardCount() {
    const count = getCardCount();
    cardCountDisplay.textContent = `作成したカード: ${count} / 20`;
    createButton.disabled = count >= 20;
}

function showCardList() {
    cardListGrid.innerHTML = '';
    cards.forEach((card, index) => {
if (!card.image) return;
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
cardListGrid.appendChild(cardElement);
    });

    document.querySelectorAll('.delete-button').forEach(button => {
button.addEventListener('click', function() {
    const index = parseInt(this.getAttribute('data-index'));
    deleteCard(index);
});
    });
}

function deleteCard(index) {
    cards.splice(index, 1);
    localStorage.setItem('cards', JSON.stringify(cards));
    updateCardCount();
    showCardList();
}

startBattleButton.addEventListener('click', function() {
    if (getCardCount() < 20) {
alert('デッキを完成させるには20枚のカードが必要です。');
return;
    }

    const deckId = 'deck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const deckData = {
deckId: deckId,
cards: cards
    };

    fetch('/api/save-deck', {
method: 'POST',
headers: {
    'Content-Type': 'application/json',
},
body: JSON.stringify(deckData)
    })
    .then(response => {
if (!response.ok) {
    throw new Error('Network response was not ok');
}
return response.json();
    })
    .then(data => {
if (data.success) {
    alert(`デッキが保存されました。デッキID: ${deckId}`);
    // ここで対戦画面への遷移ロジックを実装
    // window.location.href = 'taisen.html?deckId=' + deckId;
} else {
    throw new Error(data.message || 'デッキの保存に失敗しました。');
}
    })
    .catch(error => {
console.error('Error:', error);
alert('エラーが発生しました: ' + error.message);
    });
});
// MySQLモジュールのインポート
const mysql = require('mysql2/promise');

// MySQL接続設定
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'deck_dreamers'  // データベース名を小文字に修正
};

let connection;

// MySQLに接続する関数
async function connectToDatabase() {
    try {
connection = await mysql.createConnection(dbConfig);
console.log('Successfully connected to MySQL.');
return connection;
    } catch (error) {
console.error('Error connecting to MySQL:', error);
throw error;
    }
}

// カードデータを保存する関数
async function saveDeck(cards) {
    try {
// デッキIDを生成
const deckId = 'deck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

// データベースに接続
const conn = await connectToDatabase();

// トランザクション開始
await conn.beginTransaction();

try {
    // カードデータを1枚ずつ保存
    for (const card of cards) {
const query = `
    INSERT INTO card (deck_id, image_url, card_name, card_effect) 
    VALUES (?, ?, ?, ?)
`;

await conn.execute(query, [
    deckId,
    card.image,
    card.name,
    card.effect
]);
    }

    // トランザクションをコミット
    await conn.commit();

    console.log('Deck saved successfully.');
    
    // セッションストレージにも保存
    sessionStorage.setItem('currentDeck', JSON.stringify({
deckId: deckId,
cards: cards
    }));
    
    // 対戦画面へ遷移
    window.location.href = 'taisen.html?deckId=' + deckId;

} catch (error) {
    // エラーが発生した場合はロールバック
    await conn.rollback();
    throw error;
}

    } catch (error) {
console.error('Error saving deck:', error);
throw error;
    } finally {
if (connection) {
    await connection.end();
    console.log('MySQL connection closed.');
}
    }
}

// デッキ情報を取得する関数
async function getDeck(deckId) {
    try {
const conn = await connectToDatabase();

const [rows] = await conn.execute(
    'SELECT * FROM card WHERE deck_id = ?', // テーブル名を小文字に修正
    [deckId]
);

return {
    deckId: deckId,
    cards: rows.map(row => ({
name: row.card_name,
image: row.image_url,
effect: row.card_effect
    }))
};

    } catch (error) {
console.error('Error retrieving deck:', error);
throw error;
    } finally {
if (connection) {
    await connection.end();
    console.log('MySQL connection closed.');
}
    }
}

// デッキを更新する関数
async function updateDeck(deckId, updatedCards) {
    try {
const conn = await connectToDatabase();
await conn.beginTransaction();

try {
    // 既存のカードを削除
    await conn.execute(
'DELETE FROM card WHERE deck_id = ?', // テーブル名を小文字に修正
[deckId]
    );

    // 新しいカードを挿入
    for (const card of updatedCards) {
await conn.execute(
    'INSERT INTO card (deck_id, image_url, card_name, card_effect) VALUES (?, ?, ?, ?)',
    [deckId, card.image, card.name, card.effect]
);
    }

    await conn.commit();
    return true;

} catch (error) {
    await conn.rollback();
    throw error;
}

    } catch (error) {
console.error('Error updating deck:', error);
throw error;
    } finally {
if (connection) {
    await connection.end();
    console.log('MySQL connection closed.');
}
    }
}

// デッキを削除する関数
async function deleteDeck(deckId) {
    try {
const conn = await connectToDatabase();
const [result] = await conn.execute(
    'DELETE FROM card WHERE deck_id = ?', // テーブル名を小文字に修正
    [deckId]
);
return result.affectedRows > 0;

    } catch (error) {
console.error('Error deleting deck:', error);
throw error;
    } finally {
if (connection) {
    await connection.end();
    console.log('MySQL connection closed.');
}
    }
}

// グローバルスコープで関数を利用可能にする
window.saveDeck = saveDeck;
window.getDeck = getDeck;
window.updateDeck = updateDeck;
window.deleteDeck = deleteDeck;