const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

// CORS設定
app.use(cors());

// AWS RDS データベース接続設定
const connection = mysql.createConnection({
    host: 'db-POSFXNXO7OWRKY5UTVWZQE7BKM.us-east-1.rds.amazonaws.com', // RDSのエンドポイント
    user: 'admin', // マスターユーザー名
    password: 'tomo2190', // マスターパスワード（実際のパスワードに置き換えてください）
    database: 'deck_dreamers',
    port: 3306,
    ssl: {
        rejectUnauthorized: true
    },
    connectTimeout: 20000 // タイムアウト設定（20秒）
});

// データベース接続テスト
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
    console.log('AWS RDSデータベースに接続されました');
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

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
    console.error('サーバーエラー:', err);
    res.status(500).json({
        success: false,
        message: '内部サーバーエラーが発生しました',
        error: err.message
    });
});

// 接続テスト用エンドポイント
app.get('/health', async (req, res) => {
    try {
        await connection.promise().query('SELECT 1');
        res.json({ 
            status: 'ok', 
            message: 'データベース接続は正常です',
            database: 'AWS RDS'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: 'データベース接続エラー',
            error: error.message 
        });
    }
});

// サーバー起動
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`サーバーがポート${PORT}で起動しました`);
});

// グレースフルシャットダウン
function gracefulShutdown(signal) {
    console.log(`${signal} を受信しました。シャットダウンを開始します...`);
    server.close(() => {
        console.log('HTTPサーバーを停止しました');
        connection.end(err => {
            if (err) {
                console.error('データベース接続のクローズ中にエラーが発生しました:', err);
                process.exit(1);
            }
            console.log('データベース接続を閉じました');
            process.exit(0);
        });
    });
}

// シグナルハンドラの設定
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 予期せぬエラーのハンドリング
process.on('uncaughtException', (error) => {
    console.error('予期せぬエラーが発生しました:', error);
    gracefulShutdown('uncaughtException');
});