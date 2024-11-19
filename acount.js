// デフォルトカードの定義
const DEFAULT_CARDS = [
    {
        name: "逆転の1手",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/逆転.jpg",
        effect: "山札から１ドロー"
    },
    {
        name: "手札足りない",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/手札足りない.jpeg",
        effect: "山札から１ドロー"
    },
    {
        name: "のぞき見",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/のぞき見.jpeg",
        effect: "相手の手札を2枚見る"
    },
    {
        name: "パパラッチ",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/パパラッチ.jpg",
        effect: "相手の手札を2枚見る"
    },
    {
        name: "レゴブロック",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/レゴブロック.jpg",
        effect: "数値＋２"
    },
    {
        name: "ルブタンの財布",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/ルブタン.jpg",
        effect: "数値＋２"
    },
    {
        name: "ちくちく",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/ちくちく.jpg",
        effect: "強制1ダメージ"
    },
    {
        name: "とげとげ",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/とげとげ.jpg",
        effect: "強制1ダメージ"
    },
    {
        name: "リストカット",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/りすか.jpg",
        effect: "両方に2ダメージ"
    },
    {
        name: "共倒れの1手",
        image: "https://togeharuki.github.io/Deck-Dreamers/battle/Card/deck/kizon/共倒れ.jpg",
        effect: "両方に2ダメージ"
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

// プレイヤー情報を保存する関数
async function createPlayer(playerName, playerId) {
    try {
        await db.collection('Player').doc(playerId.toString()).set({
            playerName: playerName,
            playerId: playerId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('プレイヤー情報を保存しました');
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
        console.log('デフォルトカードを倉庫に保存しました');
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

        // 最新のプレイヤーIDを取得
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

            // デフォルトカードを倉庫に保存
            await createSoukoCards(nextPlayerId);

            showMessage(`アカウントを作成しました！\nプレイヤーID: ${nextPlayerId}`, 'success');

            // ローカルストレージにプレイヤー情報を保存
            localStorage.setItem('playerName', playerName);
            localStorage.setItem('playerId', nextPlayerId);

            // 3秒後にタイトル画面に戻る
            setTimeout(() => {
                window.location.href = 'title.html';
            }, 3000);

        } catch (error) {
            // エラーが発生した場合、両方のコレクションをクリーンアップ
            try {
                if (db.collection('Player').doc(nextPlayerId.toString())) {
                    await db.collection('Player').doc(nextPlayerId.toString()).delete();
                }
                if (db.collection('Souko').doc(nextPlayerId.toString())) {
                    await db.collection('Souko').doc(nextPlayerId.toString()).delete();
                }
            } catch (cleanupError) {
                console.error('クリーンアップに失敗:', cleanupError);
            }
            throw error;
        }

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
                if (cardElement) {
                    deckGrid.appendChild(cardElement);
                }
            });
        } else {
            console.log('デッキが見つかりません');
        }
    } catch (error) {
        console.error('デッキの読み込みに失敗しました:', error);
        alert('デッキの読み込みに失敗しました: ' + error.message);
    }
}

// 画像の存在チェックを行う関数
function checkImageExistence(imageUrl) {
    const extensions = ['.jpg', '.jpeg', '.png']; // 対応する画像形式
    return new Promise((resolve) => {
        const checkNext = (index) => {
            if (index >= extensions.length) {
                resolve(null); // すべての拡張子で画像が見つからなかった場合
                return;
            }

            const img = new Image();
            img.src = imageUrl.replace(/\.(jpg|jpeg|png)$/, extensions[index]); // 拡張子を変更
            img.onload = () => resolve(img.src); // 画像が存在する場合
            img.onerror = () => checkNext(index + 1); // 次の拡張子をチェック
        };

        checkNext(0); // 最初の拡張子からチェック開始
    });
}

// カードを表示する関数
function createCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card-item';
    cardElement.innerHTML = `
        <div class="card-image">
            <img src="${card.image}" alt="${card.name}">
        </div>
        <div class="card-name">${card.name}</div>
        <div class="card-effect">${card.effect}</div>
    `;
    return cardElement;
}

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('エラーが発生しました:', event.error);
});
