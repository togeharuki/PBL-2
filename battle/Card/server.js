const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

// CORS設定
app.use(cors());

// データベース接続設定
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // XAMPPのデフォルト設定
    database: 'deck_dreamers',
    charset: 'utf8mb4',
    port: 3306,
    socketPath: 'C:/xampp/mysql/mysql.sock'
});

// データベース接続
connection.connect(err => {
    if (err) {
        console.error('データベース接続エラー:', err);
        console.error('エラーの詳細:', {
            code: err.code,
            errno: err.errno,
            sqlMessage: err.sqlMessage,
            sqlState: err.sqlState
        });
        return;
    }
    console.log('データベースに接続されました');
});

// Express設定
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// APIエンドポイント
app.post('/api/save-cards', async (req, res) => {
    const { cards } = req.body;

    if (!Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({
            success: false,
            message: '有効なカードデータがありません'
        });
    }

    try {
        // トランザクション開始
        await connection.promise().beginTransaction();

        // カードデータの保存
        for (const card of cards) {
            await connection.promise().query(
                'INSERT INTO Card (card_url, card_name, card_effect) VALUES (?, ?, ?)',
                [card.image, card.name, card.effect]
            );
        }

        // トランザクションのコミット
        await connection.promise().commit();
        
        console.log(`${cards.length}枚のカードを保存しました`);
        res.json({ 
            success: true, 
            message: 'カードが保存されました',
            count: cards.length
        });

    } catch (error) {
        // エラー時はロールバック
        await connection.promise().rollback();
        console.error('カード保存エラー:', error);
        res.status(500).json({ 
            success: false, 
            message: 'カードの保存中にエラーが発生しました',
            error: error.message
        });
    }
});

// 簡単な健全性チェックエンドポイント
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'サーバーは正常に動作しています' });
});

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`サーバーがポート${PORT}で起動しました`);
});

// エラーハンドリング
process.on('uncaughtException', (error) => {
    console.error('予期せぬエラーが発生しました:', error);
});

// クリーンアップ処理
process.on('SIGTERM', () => {
    console.log('サーバーをシャットダウンしています...');
    connection.end(err => {
        if (err) {
            console.error('データベース接続のクローズ中にエラーが発生しました:', err);
        }
        process.exit(err ? 1 : 0);
    });
});

process.on('SIGINT', () => {
    console.log('サーバーを中断しています...');
    connection.end(err => {
        if (err) {
            console.error('データベース接続のクローズ中にエラーが発生しました:', err);
        }
        process.exit(err ? 1 : 0);
    });
});