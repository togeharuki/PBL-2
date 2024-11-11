const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// CORS設定
app.use(cors());

// MongoDBの接続URI
const MONGODB_URI = 'mongodb+srv://23110003:zXXBXMSaBThDllH1@deckdreamers.bg6ts.mongodb.net/deck_dreamers';

// Cardスキーマの定義
const cardSchema = new mongoose.Schema({
    card_url: {
        type: String,
        required: true
    },
    card_name: {
        type: String,
        required: true
    },
    card_effect: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// モデルの作成
const Card = mongoose.model('Card', cardSchema);

// MongoDB接続
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDBデータベースに接続されました');
    })
    .catch(err => {
        console.error('データベース接続エラー:', err);
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
        // カードデータの変換
        const cardDocuments = cards.map(card => ({
            card_url: card.image,
            card_name: card.name,
            card_effect: card.effect
        }));

        // カードデータの一括保存
        await Card.insertMany(cardDocuments);

        console.log(`${cards.length}枚のカードを保存しました`);
        res.json({
            success: true,
            message: 'カードが保存されました',
            count: cards.length
        });

    } catch (error) {
        console.error('カード保存エラー:', error);
        res.status(500).json({
            success: false,
            message: 'カードの保存中にエラーが発生しました',
            error: error.message
        });
    }
});

// カード取得エンドポイント
app.get('/api/cards', async (req, res) => {
    try {
        const cards = await Card.find().sort({ created_at: -1 });
        res.json({
            success: true,
            cards: cards.map(card => ({
                id: card._id,
                name: card.card_name,
                image: card.card_url,
                effect: card.card_effect,
                created_at: card.created_at
            }))
        });
    } catch (error) {
        console.error('カード取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'カードの取得中にエラーが発生しました',
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
    if (mongoose.connection.readyState === 1) {
        res.json({ 
            status: 'ok', 
            message: 'データベース接続は正常です',
            database: 'MongoDB'
        });
    } else {
        res.status(500).json({ 
            status: 'error', 
            message: 'データベース接続エラー',
            state: mongoose.connection.readyState
        });
    }
});

// サーバー起動
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`サーバーがポート${PORT}で起動しました`);
});

// グレースフルシャットダウン
async function gracefulShutdown(signal) {
    console.log(`${signal} を受信しました。シャットダウンを開始します...`);
    try {
        await mongoose.connection.close();
        console.log('MongoDBデータベース接続を閉じました');
        server.close(() => {
            console.log('HTTPサーバーを停止しました');
            process.exit(0);
        });
    } catch (err) {
        console.error('シャットダウン中にエラーが発生しました:', err);
        process.exit(1);
    }
}

// シグナルハンドラの設定
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 予期せぬエラーのハンドリング
process.on('uncaughtException', (error) => {
    console.error('予期せぬエラーが発生しました:', error);
    gracefulShutdown('uncaughtException');
});