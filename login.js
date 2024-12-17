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
            // プレイヤー情報の存在を確認
            const playerDoc = await db.collection('Player').doc(savedPlayerId).get();
            if (playerDoc.exists) {
                playerInfoDiv.textContent = `現在のログイン: ${savedPlayerName} (ID: ${savedPlayerId})`;
                playerInfoDiv.style.display = 'block';
                loginButton.style.display = 'none';
                logoutButton.style.display = 'block';
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

// ログイン状態をリセット
function resetLoginState() {
    localStorage.removeItem('playerName');
    localStorage.removeItem('playerId');
    playerInfoDiv.textContent = 'ログインしていません';
    playerInfoDiv.style.display = 'block';
    loginButton.style.display = 'block';
    logoutButton.style.display = 'block';
}

// ログイン処理
loginButton.addEventListener('click', async () => {
    playButtonSound(); // 効果音を再生
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

        const playerData = playerQuery.docs[0].data();
        const playerId = playerData.playerId;

        // ログイン状態を更新
        await db.collection('CurrentLogin').doc('active').set({
            playerIds: firebase.firestore.FieldValue.arrayUnion(playerId),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // ローカルストレージに保存
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('playerId', playerId);

        // UI更新
        playerInfoDiv.textContent = `現在のログイン: ${playerName} (ID: ${playerId})`;
        playerInfoDiv.style.display = 'block';
        loginButton.style.display = 'none';
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
    playButtonSound(); // 効果音を再生
    try {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) {
            showMessage('ログインしていません', 'error');
            return;
        }

        // CurrentLoginからプレイヤーIDを削除
        await db.collection('CurrentLogin').doc('active').update({
            playerIds: firebase.firestore.FieldValue.arrayRemove(playerId)
        });

        // ローカルストレージをクリア
        localStorage.removeItem('playerName');
        localStorage.removeItem('playerId');

        resetLoginState();
        showMessage('ログアウトしました', 'success');

        setTimeout(() => {
            window.location.reload();
        }, 1000);

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