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
const updateAccountButton = document.getElementById('updateAccount');
const playerNameInput = document.getElementById('playerName');
const messageDiv = document.getElementById('message');
const playerInfoDiv = document.getElementById('playerInfo');

// ページ読み込み時の処理
window.addEventListener('load', () => {
    const savedPlayerId = localStorage.getItem('playerId');
    const savedPlayerName = localStorage.getItem('playerName');
    
    if (savedPlayerId && savedPlayerName) {
        playerInfoDiv.textContent = `プレイヤーID: ${savedPlayerId}`;
        playerNameInput.value = savedPlayerName;
        createAccountButton.style.display = 'none';
        updateAccountButton.style.display = 'block';
    } else {
        createAccountButton.style.display = 'block';
        updateAccountButton.style.display = 'none';
    }
});

// プレイヤー名の入力チェック
playerNameInput.addEventListener('input', function() {
    if (this.value.length > 20) {
        this.value = this.value.slice(0, 20);
    }
});

// アカウント更新処理
updateAccountButton.addEventListener('click', async () => {
    const newPlayerName = playerNameInput.value.trim();
    const currentPlayerId = localStorage.getItem('playerId');

    if (!newPlayerName) {
        showMessage('プレイヤー名を入力してください', 'error');
        return;
    }

    try {
        updateAccountButton.disabled = true;

        // 同じ名前のプレイヤーが存在するかチェック
        const existingPlayer = await db.collection('Player')
            .where('playerName', '==', newPlayerName)
            .where('playerId', '!=', parseInt(currentPlayerId))
            .get();

        if (!existingPlayer.empty) {
            showMessage('このプレイヤー名は既に使用されています', 'error');
            updateAccountButton.disabled = false;
            return;
        }

        // プレイヤー情報を更新
        const playerQuery = await db.collection('Player')
            .where('playerId', '==', parseInt(currentPlayerId))
            .get();

        if (!playerQuery.empty) {
            await playerQuery.docs[0].ref.update({
                playerName: newPlayerName
            });

            localStorage.setItem('playerName', newPlayerName);
            showMessage('プレイヤー名を更新しました', 'success');

            setTimeout(() => {
                window.location.href = 'title.html';
            }, 3000);
        }
    } catch (error) {
        console.error('更新エラー:', error);
        showMessage('更新に失敗しました', 'error');
    } finally {
        updateAccountButton.disabled = false;
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

        // 新しいプレイヤーを追加
        await db.collection('Player').add({
            playerName: playerName,
            playerId: nextPlayerId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

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