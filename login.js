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
playerNameInput?.addEventListener('input', function() {
    if (this.value.length > 20) {
        this.value = this.value.slice(0, 20);
    }
});

// ページ読み込み時の処理
window.addEventListener('load', async () => {
    try {
        const savedPlayerId = localStorage.getItem('playerId');
        const savedPlayerName = localStorage.getItem('playerName');

        if (savedPlayerId && savedPlayerName) {
            const playerDoc = await db.collection('Player').doc(savedPlayerId).get();
            
            if (playerDoc.exists) {
                const playerData = playerDoc.data();
                if (playerData.loginStatus?.isLoggedIn) {
                    updateLoginUI(savedPlayerName, savedPlayerId);
                } else {
                    // 自動的にログイン状態を復元
                    await updatePlayerLoginStatus(savedPlayerId, true);
                    updateLoginUI(savedPlayerName, savedPlayerId);
                }
            } else {
                resetLoginState();
            }
        } else {
            resetLoginState();
        }
    } catch (error) {
        console.error('初期化エラー:', error);
        resetLoginState();
    }
});

// ログイン状態のUI更新
function updateLoginUI(playerName, playerId) {
    playerInfoDiv.textContent = `現在のログイン: ${playerName} (ID: ${playerId})`;
    playerInfoDiv.style.display = 'block';
    loginButton.style.display = 'none';
    logoutButton.style.display = 'block';
}

// ログイン状態をリセット
function resetLoginState() {
    localStorage.removeItem('playerName');
    localStorage.removeItem('playerId');
    playerInfoDiv.textContent = 'ログインしていません';
    playerInfoDiv.style.display = 'block';
    loginButton.style.display = 'block';
    logoutButton.style.display = 'block';
}

// プレイヤーのログイン状態を更新
async function updatePlayerLoginStatus(playerId, isLoggedIn) {
    try {
        await db.collection('Player').doc(playerId).update({
            'loginStatus.isLoggedIn': isLoggedIn,
            'loginStatus.lastLoginAt': firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('ログイン状態の更新に失敗:', error);
        throw error;
    }
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
            showMessage('存在しないプレイヤー名です', 'error');
            loginButton.disabled = false;
            return;
        }

        const playerDoc = playerQuery.docs[0];
        const playerData = playerDoc.data();
        const playerId = playerData.playerId;

        // ログイン状態をチェック
        if (playerData.loginStatus?.isLoggedIn) {
            showMessage('このアカウントは既にログインしています', 'error');
            loginButton.disabled = false;
            return;
        }

        // ログイン状態を更新
        await updatePlayerLoginStatus(playerId, true);

        // ローカルストレージに保存
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('playerId', playerId);

        // UI更新
        updateLoginUI(playerName, playerId);
        showMessage('ログインしました', 'success');

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

        // ログイン状態を更新
        await updatePlayerLoginStatus(playerId, false);

        // ローカルストレージをクリア
        localStorage.removeItem('playerName');
        localStorage.removeItem('playerId');

        resetLoginState();
        showMessage('ログアウトしました', 'success');

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
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
        background-color: ${type === 'success' ? 'rgb(78, 205, 196)' : 'rgb(255, 71, 87)'};
    `;
    notification.textContent = text;
    document.body.appendChild(notification);

    setTimeout(() => notification.style.opacity = '1', 100);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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