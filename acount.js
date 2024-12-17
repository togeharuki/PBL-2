// デフォルトカードの定義
const DEFAULT_CARDS = [
    {
        name: "逆転の1手",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/逆転の1手.jpg",
        effect: "山札から１ドロー",
        explanation:"山札からカードを１枚引く"
    },
    {
        name: "手札足りない",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/手札足りない.jpeg",
        effect: "山札から１ドロー",
        explanation:"山札からカードを１１枚引く"
    },
    {
        name: "のぞき見",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/のぞき見.jpeg",
        effect: "相手の手札を2枚見る",
        explanation:"相手の手札をランダムに２枚表示する"
    },
    {
        name: "パパラッチ",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/パパラッチ.jpg",
        effect: "相手の手札を2枚見る",
        explanation:"相手の手札をランダムに２枚表示する"
    },
    {
        name: "レゴブロック",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/レゴブロック.jpg",
        effect: "数値＋２",
        explanation:"ⅮまたはＨの値を２増やす"
    },
    {
        name: "ルブタンの財布",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/ルブタンの財布.jpg",
        effect: "数値＋２",
        explanation:"ⅮまたはＨの値を２増やす"
    },
    {
        name: "ちくちく",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/ちくちく.jpg",
        effect: "強制1ダメージ",
        explanation:"相手に１ダメージを与える"
    },
    {
        name: "とげとげ",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/とげとげ.jpg",
        effect: "強制1ダメージ",
        explanation:"相手に１ダメージを与える"
    },
    {
        name: "リストキャット",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/リストキャット.jpg",
        effect: "両方に2ダメージ",
        explanation:"自分と相手にそれぞれ２ダメージを与える"
    },
    {
        name: "共倒れの1手",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/共倒れの1手.jpg",
        effect: "両方に2ダメージ",
        explanation:"自分と相手にそれぞれ２ダメージを与える"
    }
];

// Firebase設定
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

// プレイヤー情報を保存する関数
async function createPlayer(playerName, playerId) {
    try {
        // プレイヤー情報をPlayerコレクションに保存
        await db.collection('Player').doc(playerId.toString()).set({
            playerName: playerName,
            playerId: playerId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // CurrentLoginに追加
        const currentLoginRef = db.collection('CurrentLogin').doc('active');
        const doc = await currentLoginRef.get();
        let playerIds = [];
        if (doc.exists) {
            playerIds = doc.data().playerIds || [];
        }
        if (!playerIds.includes(playerId)) {
            playerIds.push(playerId);
            await currentLoginRef.set({ 
                playerIds: playerIds,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        return true;
    } catch (error) {
        console.error('プレイヤー情報の保存に失敗しました:', error);
        throw error;
    }
}

// デフォルトカードを倉庫に保存する関数
async function createSoukoCards(playerId) {
    try {
        const cardData = {};
        DEFAULT_CARDS.forEach((card, index) => {
            cardData[`default_card_${index + 1}`] = {
                ...card,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
        });

        await db.collection('Souko').doc(playerId.toString()).set(cardData);
        return true;
    } catch (error) {
        console.error('倉庫へのカード保存に失敗しました:', error);
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

        // 新しいプレイヤーIDを取得
        const lastPlayerDoc = await db.collection('Player')
            .orderBy('playerId', 'desc')
            .limit(1)
            .get();

        let nextPlayerId = 1;
        if (!lastPlayerDoc.empty) {
            nextPlayerId = lastPlayerDoc.docs[0].data().playerId + 1;
        }

        try {
            // プレイヤー情報を保存
            await createPlayer(playerName, nextPlayerId);

            // デフォルトカードを倉庫に保��
            await createSoukoCards(nextPlayerId);

            // 効果音を再生
            playButtonSound();

            // 成功メッセージを表示
            const notification = document.createElement('div');
            notification.className = 'success-notification';
            notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgb(78, 205, 196);
                padding: 20px 40px;
                border-radius: 10px;
                color: white;
                text-align: center;
                z-index: 1000;
                font-size: 1.2em;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            `;
            notification.innerHTML = `
                <h2 style="margin: 0 0 10px 0;">アカウント作成成功！</h2>
                <p style="margin: 0;">プレイヤーID: ${nextPlayerId}<br>プレイヤー名: ${playerName}</p>
            `;
            document.body.appendChild(notification);

            // ローカルストレージにプレイヤー情報を保存
            localStorage.setItem('playerName', playerName);
            localStorage.setItem('playerId', nextPlayerId);

            // 3秒後にタイトル画面に遷移
            setTimeout(() => {
                window.location.href = 'title.html';
            }, 3000);

        } catch (error) {
            // エラー発生時のクリーンアップ
            try {
                await db.collection('Player').doc(nextPlayerId.toString()).delete();
                await db.collection('Souko').doc(nextPlayerId.toString()).delete();
                
                // CurrentLoginからも削除
                const currentLoginRef = db.collection('CurrentLogin').doc('active');
                const currentLoginDoc = await currentLoginRef.get();
                if (currentLoginDoc.exists) {
                    const playerIds = currentLoginDoc.data().playerIds.filter(id => id !== nextPlayerId);
                    if (playerIds.length === 0) {
                        await currentLoginRef.delete();
                    } else {
                        await currentLoginRef.set({ playerIds: playerIds });
                    }
                }
            } catch (cleanupError) {
                console.error('クリーンアップに失敗:', cleanupError);
            }
            throw error;
        }

    } catch (error) {
        console.error('アカウント作成エラー:', error);
        showMessage('アカウントの作成に失敗しました', 'error');
    } finally {
        createAccountButton.disabled = false;
    }
});

// メッセージ表示関数
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;

    setTimeout(() => {
        messageDiv.className = messageDiv.className.replace(' show', '');
    }, 5000);
}

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
});