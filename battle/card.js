// MongoDBモジュールのインポート
const { MongoClient } = require('mongodb');

// MongoDB接続URI
const uri = "mongodb+srv://23110003:zXXBXMSaBThDllH1@deckdreamers.bg6ts.mongodb.net/";
const dbName = "Deck_Dreamers";
const collectionName = "Card";

let client;

// MongoDBに接続する関数
async function connectToDatabase() {
    try {
        client = new MongoClient(uri);
        await client.connect();
        console.log('Successfully connected to MongoDB.');
        return client.db(dbName);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

// カードデータを保存する関数
async function saveDeck(cards) {
    try {
        // デッキIDを生成
        const deckId = 'deck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // カードデータを整形
        const deckData = {
            deckId: deckId,
            cards: cards.map(card => ({
                name: card.name,
                image: card.image,
                effect: card.effect,
                createdAt: new Date()
            })),
            createdAt: new Date()
        };

        // データベースに接続
        const db = await connectToDatabase();
        const collection = db.collection(collectionName);

        // データを保存
        const result = await collection.insertOne(deckData);

        if (result.acknowledged) {
            console.log('Deck saved successfully.');
            
            // セッションストレージにも保存
            sessionStorage.setItem('currentDeck', JSON.stringify(deckData));
            
            // 対戦画面へ遷移
            window.location.href = 'taisen.html?deckId=' + deckId;
        } else {
            throw new Error('Failed to save deck to database.');
        }

    } catch (error) {
        console.error('Error saving deck:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed.');
        }
    }
}

// デッキ情報を取得する関数
async function getDeck(deckId) {
    try {
        const db = await connectToDatabase();
        const collection = db.collection(collectionName);

        const deck = await collection.findOne({ deckId: deckId });
        return deck;

    } catch (error) {
        console.error('Error retrieving deck:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed.');
        }
    }
}

// デッキを更新する関数
async function updateDeck(deckId, updatedCards) {
    try {
        const db = await connectToDatabase();
        const collection = db.collection(collectionName);

        const result = await collection.updateOne(
            { deckId: deckId },
            { 
                $set: { 
                    cards: updatedCards,
                    updatedAt: new Date()
                } 
            }
        );

        return result.modifiedCount > 0;

    } catch (error) {
        console.error('Error updating deck:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed.');
        }
    }
}

// デッキを削除する関数
async function deleteDeck(deckId) {
    try {
        const db = await connectToDatabase();
        const collection = db.collection(collectionName);

        const result = await collection.deleteOne({ deckId: deckId });
        return result.deletedCount > 0;

    } catch (error) {
        console.error('Error deleting deck:', error);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed.');
        }
    }
}

// グローバルスコープで関数を利用可能にする
window.saveDeck = saveDeck;
window.getDeck = getDeck;
window.updateDeck = updateDeck;
window.deleteDeck = deleteDeck;