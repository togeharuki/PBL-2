// MySQLモジュールのインポート
const mysql = require('mysql2/promise');

// MySQL接続設定
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Deck_Dreamers'
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
                    INSERT INTO Card (deck_id, image_url, card_name, card_effect) 
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
            'SELECT * FROM Card WHERE deck_id = ?',
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
                'DELETE FROM Card WHERE deck_id = ?',
                [deckId]
            );

            // 新しいカードを挿入
            for (const card of updatedCards) {
                await conn.execute(
                    'INSERT INTO Card (deck_id, image_url, card_name, card_effect) VALUES (?, ?, ?, ?)',
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
            'DELETE FROM Card WHERE deck_id = ?',
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