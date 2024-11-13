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
async function createPlayerAndCards(playerName, playerId) {
    try {
        const batch = db.batch();

        // プレイヤー情報のドキュメント参照を作成
        const playerDocRef = db.collection('Player').doc(playerId.toString());

        // プレイヤー基本情報をプレイヤードキュメントに保存
        batch.set(playerDocRef, {
            info: {
                playerName: playerName,
                playerId: playerId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        });

        // Soukoサブコレクションにデフォルトカードを保存
        const soukoDocRef = playerDocRef.collection('Souko').doc('default_cards');
        const cardData = {};
        DEFAULT_CARDS.forEach((card, index) => {
            cardData[`default_card_${index + 1}`] = {
                ...card,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
        });
        batch.set(soukoDocRef, cardData);

        // バッチ処理を実行
        await batch.commit();
        console.log('プレイヤー情報とデフォルトカードを保存しました');
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
        const existingPlayers = await db.collection('Player').get();
        const playerExists = Array.from(existingPlayers.docs).some(doc => 
            doc.data().info?.playerName === playerName
        );

        if (playerExists) {
            showMessage('このプレイヤー名は既に使用されています', 'error');
            createAccountButton.disabled = false;
            return;
        }

        // 最新のプレイヤーIDを取得
        let nextPlayerId = 1;
        if (!existingPlayers.empty) {
            const playerIds = existingPlayers.docs.map(doc => doc.data().info?.playerId || 0);
            nextPlayerId = Math.max(...playerIds) + 1;
        }

        // プレイヤー情報とデフォルトカードを保存
        await createPlayerAndCards(playerName, nextPlayerId);

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

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('グローバルエラー:', event.error);
});