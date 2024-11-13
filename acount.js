// デフォルトカードの定義
const DEFAULT_CARDS = [
    {
        name: "ファイアソード",
        image: "/images/default/fire_sword.jpg",
        effect: "⚡ 攻撃力 8 ⚡"
    },
    {
        name: "ヒールポーション",
        image: "/images/default/heal_potion.jpg",
        effect: "✨ 回復魔法 7 ✨"
    },
    {
        name: "サンダーアックス",
        image: "/images/default/thunder_axe.jpg",
        effect: "⚡ 攻撃力 6 ⚡"
    },
    {
        name: "エンジェルブレス",
        image: "/images/default/angel_bless.jpg",
        effect: "✨ 回復魔法 5 ✨"
    },
    {
        name: "ダークブレード",
        image: "/images/default/dark_blade.jpg",
        effect: "⚡ 攻撃力 9 ⚡"
    },
    {
        name: "ホーリーライト",
        image: "/images/default/holy_light.jpg",
        effect: "✨ 回復魔法 8 ✨"
    },
    {
        name: "フレイムランス",
        image: "/images/default/flame_lance.jpg",
        effect: "⚡ 攻撃力 7 ⚡"
    },
    {
        name: "ネイチャーヒール",
        image: "/images/default/nature_heal.jpg",
        effect: "✨ 回復魔法 6 ✨"
    },
    {
        name: "アイスソード",
        image: "/images/default/ice_sword.jpg",
        effect: "⚡ 攻撃力 5 ⚡"
    },
    {
        name: "ライフエッセンス",
        image: "/images/default/life_essence.jpg",
        effect: "✨ 回復魔法 9 ✨"
    }
];

// Firebaseの設定
const firebaseConfig = {
    apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
    authDomain: "deck-dreamers.firebaseapp.com",
    projectId: "deck-dreamers",
    storageBucket: "deck-dreamers.appspot.com",
    messagingSenderId: "165933225805",
    appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM要素の取得
const createAccountButton = document.getElementById('createAccount');
const playerNameInput = document.getElementById('playerName');
const messageDiv = document.getElementById('message');

// プレイヤー情報とデフォルトカードを保存する関数
async function createPlayerAndDefaultCards(playerName, playerId) {
    try {
        // プレイヤー情報のドキュメント参照
        const playerRef = db.collection('Player').doc();
        
        // 倉庫のドキュメント参照
        const soukoRef = db.collection('Souko').doc(playerId.toString());

        // バッチ処理を作成
        const batch = db.batch();

        // プレイヤー情報を設定
        batch.set(playerRef, {
            playerName: playerName,
            playerId: playerId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // デフォルトカードのデータを準備
        const soukoData = {};
        DEFAULT_CARDS.forEach((card, index) => {
            const cardId = `default_card_${index + 1}`;
            soukoData[cardId] = {
                ...card,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
        });

        // 倉庫にデフォルトカードを設定
        batch.set(soukoRef, soukoData);

        // バッチ処理を実行
        await batch.commit();
        
        return true;
    } catch (error) {
        console.error('データの保存に失敗しました:', error);
        throw error;
    }
}

// プレイヤー名の入力チェック
playerNameInput.addEventListener('input', function() {
    if (this.value.length > 20) {
        this.value = this.value.slice(0, 20);
    }
});

// アカウント作成処理
createAccountButton.addEventListener('click', async () => {
    const playerName = playerNameInput.value.trim();

    if (!playerName) {
        showMessage('プレイヤー名を入力してください', 'error');
        return;
    }

    try {
        createAccountButton.disabled = true;

        // 既存のプレイヤー名をチェック
        const existingPlayer = await db.collection('Player')
            .where('playerName', '==', playerName)
            .get();

        if (!existingPlayer.empty) {
            showMessage('このプレイヤー名は既に使用されています', 'error');
            createAccountButton.disabled = false;
            return;
        }

        // 最新のプレイヤーIDを取得
        const lastPlayerDoc = await db.collection('Player')
            .orderBy('playerId', 'desc')
            .limit(1)
            .get();

        let nextPlayerId = 1;
        if (!lastPlayerDoc.empty) {
            nextPlayerId = lastPlayerDoc.docs[0].data().playerId + 1;
        }

        // プレイヤー情報とデフォルトカードを保存
        await createPlayerAndDefaultCards(playerName, nextPlayerId);

        showMessage(`アカウントを作成しました！\nプレイヤーID: ${nextPlayerId}`, 'success');

        // ローカルストレージにプレイヤー情報を保存
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('playerId', nextPlayerId);

        // 3秒後にタイトル画面に戻る
        setTimeout(() => {
            window.location.href = 'title.html';
        }, 3000);

    } catch (error) {
        console.error('アカウント作成エラー:', error);
        showMessage('アカウントの作成に失敗しました', 'error');
        createAccountButton.disabled = false;
    }
});

// メッセージ表示関数
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;
}