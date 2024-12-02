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
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const playerNameInput = document.getElementById('playerName');
const messageDiv = document.getElementById('message');
const playerInfoDiv = document.getElementById('playerInfo');

// プレイヤー名の入力チェック
playerNameInput.addEventListener('input', function() {
    if (this.value.length > 20) {
        this.value = this.value.slice(0, 20);
    }
});

// ページ読み込み時の処理
window.addEventListener('load', async () => {
    // ログアウトボタンは常に表示
    logoutButton.style.display = 'block';
    
    const savedPlayerId = localStorage.getItem('playerId');
    const savedPlayerName = localStorage.getItem('playerName');
    
    if (savedPlayerId && savedPlayerName) {
        // ログイン状態を確認
        const currentLoginDoc = await db.collection('CurrentLogin').doc('active').get();
        const isLoggedIn = currentLoginDoc.exists && 
                          currentLoginDoc.data().playerIds && 
                          currentLoginDoc.data().playerIds.includes(savedPlayerId);

        if (isLoggedIn) {
            playerInfoDiv.textContent = `現在のログイン: ${savedPlayerName} (ID: ${savedPlayerId})`;
            playerInfoDiv.style.display = 'block';
            loginButton.style.display = 'none';
        } else {
            // ログイン状態が不整合の場合
            localStorage.removeItem('playerName');
            localStorage.removeItem('playerId');
            playerInfoDiv.textContent = 'ログインしていません';
            playerInfoDiv.style.display = 'block';
            loginButton.style.display = 'block';
        }
    } else {
        playerInfoDiv.textContent = 'ログインしていません';
        playerInfoDiv.style.display = 'block';
        loginButton.style.display = 'block';
    }
});

// ログイン状態の確認関数
async function checkLoginState(playerId) {
    try {
        const currentLoginDoc = await db.collection('CurrentLogin').doc('active').get();
        return currentLoginDoc.exists && 
               currentLoginDoc.data().playerIds && 
               currentLoginDoc.data().playerIds.includes(playerId);
    } catch (error) {
        console.error('ログイン状態の確認に失敗:', error);
        return false;
    }
}

// UIの更新関数
function updateUI(isLoggedIn, playerName = '', playerId = '') {
    if (isLoggedIn) {
        playerInfoDiv.textContent = `現在のログイン: ${playerName} (ID: ${playerId})`;
        loginButton.style.display = 'none';
    } else {
        playerInfoDiv.textContent = 'ログインしていません';
        loginButton.style.display = 'block';
    }
    playerInfoDiv.style.display = 'block';
}
// ログイン処理
loginButton.addEventListener('click', async () => {
    const playerName = playerNameInput.value.trim();

    if (!playerName) {
        showMessage('プレイヤー名を入力してください', 'error');
        return;
    }

    try {
        loginButton.disabled = true;

        // プレイヤー名で検索
        const playerQuery = await db.collection('Player')
            .where('playerName', '==', playerName)
            .get();

        if (playerQuery.empty) {
            showMessage('プレイヤーが見つかりません', 'error');
            loginButton.disabled = false;
            return;
        }

        // プレイヤー情報を取得
        const playerData = playerQuery.docs[0].data();
        const playerId = playerData.playerId;

        // 現在のログイン状態を確認
        const currentLoginRef = db.collection('CurrentLogin').doc('active');
        const currentLoginDoc = await currentLoginRef.get();

        if (currentLoginDoc.exists) {
            const currentPlayerIds = currentLoginDoc.data().playerIds || [];
            if (currentPlayerIds.includes(playerId)) {
                showMessage('このアカウントはすでにログインしています', 'error');
                loginButton.disabled = false;
                return;
            }

            // 既存のログイン状態に追加
            await currentLoginRef.update({
                playerIds: firebase.firestore.FieldValue.arrayUnion(playerId)
            });
        } else {
            // 新しいログイン状態を作成
            await currentLoginRef.set({
                playerIds: [playerId]
            });
        }

        // ローカルストレージに保存
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('playerId', playerId);

        // UI更新
        updateUI(true, playerName, playerId);
        showMessage('ログインしました', 'success');

        // 3秒後にタイトル画面に遷移
        setTimeout(() => {
            window.location.href = 'title.html';
        }, 3000);

    } catch (error) {
        console.error('ログインエラー:', error);
        showMessage('ログインに失敗しました', 'error');
    } finally {
        loginButton.disabled = false;
    }
});

// ログアウト処理
logoutButton.addEventListener('click', async () => {
    try {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) {
            showMessage('ログインしていません', 'error');
            return;
        }

        const currentLoginRef = db.collection('CurrentLogin').doc('active');
        const currentLoginDoc = await currentLoginRef.get();

        if (currentLoginDoc.exists) {
            const currentPlayerIds = currentLoginDoc.data().playerIds || [];
            const updatedPlayerIds = currentPlayerIds.filter(id => id !== playerId);

            if (updatedPlayerIds.length === 0) {
                // ログイン中のプレイヤーがいなくなった場合、ドキュメントを削除
                await currentLoginRef.delete();
            } else {
                // プレイヤーIDを配列から削除
                await currentLoginRef.update({
                    playerIds: updatedPlayerIds
                });
            }
        }

        // ローカルストレージをクリア
        localStorage.removeItem('playerName');
        localStorage.removeItem('playerId');

        // UI更新
        updateUI(false);
        showMessage('ログアウトしました', 'success');

        // 3秒後にページをリロード
        setTimeout(() => {
            window.location.reload();
        }, 3000);

    } catch (error) {
        console.error('ログアウトエラー:', error);
        showMessage('ログアウトに失敗しました', 'error');
    }
});

// メッセージ表示関数
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;

    // 5秒後にメッセージを非表示
    setTimeout(() => {
        messageDiv.className = messageDiv.className.replace(' show', '');
    }, 5000);
}

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('グローバルエラー:', event.error);
    showMessage('エラーが発生しました', 'error');
});

// データベース接続の監視
db.enableNetwork().catch(error => {
    console.error('データベース接続エラー:', error);
    showMessage('サーバーに接続できません', 'error');
});