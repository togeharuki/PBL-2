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
const currentLoginContainer = document.getElementById('current-login-container');
const loginForm = document.getElementById('login-form');

// スタイルの追加
const style = document.createElement('style');
style.textContent = `
    .login-status {
        background-color: #2a2a4e;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        text-align: center;
    }

    .logout-section {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-top: 10px;
    }

    #logoutButton {
        background-color: #ff4757;
        color: white;
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    }

    #logoutButton:hover {
        background-color: #ff6b81;
    }

    .player-info {
        color: #4ecdc4;
        font-weight: bold;
        margin-bottom: 10px;
    }
`;
document.head.appendChild(style);

// プレイヤー名の入力チェック
playerNameInput.addEventListener('input', function() {
    if (this.value.length > 20) {
        this.value = this.value.slice(0, 20);
    }
});

// ログイン状態のUI更新
function updateLoginUI(playerName, playerId) {
    if (currentLoginContainer) {
        currentLoginContainer.innerHTML = `
            <div class="login-status">
                <div class="player-info">
                    <div>現在ログイン中のアカウント:</div>
                    <div>${playerName}</div>
                    <div>プレイヤーID: ${playerId}</div>
                </div>
                <div class="logout-section">
                    <button id="logoutButton">ログアウト</button>
                </div>
            </div>
        `;

        // ログアウトボタンのイベントリスナーを再設定
        document.getElementById('logoutButton').addEventListener('click', handleLogout);
    }
    
    if (loginForm) {
        loginForm.style.display = 'none';
    }
}

// ログイン状態の非表示
function hideLoginUI() {
    if (currentLoginContainer) {
        currentLoginContainer.innerHTML = '';
    }
    if (loginForm) {
        loginForm.style.display = 'block';
    }
    playerNameInput.value = '';
}
// ページ読み込み時の処理
window.addEventListener('load', async () => {
    const savedPlayerId = localStorage.getItem('playerId');
    const savedPlayerName = localStorage.getItem('playerName');
    
    if (savedPlayerId && savedPlayerName) {
        // ログイン状態を確認
        const currentLoginDoc = await db.collection('CurrentLogin').doc('active').get();
        const isLoggedIn = currentLoginDoc.exists && 
                          currentLoginDoc.data().playerIds && 
                          currentLoginDoc.data().playerIds.includes(savedPlayerId);

        if (isLoggedIn) {
            updateLoginUI(savedPlayerName, savedPlayerId);
        } else {
            localStorage.removeItem('playerName');
            localStorage.removeItem('playerId');
            hideLoginUI();
        }
    } else {
        hideLoginUI();
    }
});

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

        updateLoginUI(playerName, playerId);
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
async function handleLogout() {
    try {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) {
            showMessage('ログイン情報が見つかりません', 'error');
            return;
        }

        const currentLoginRef = db.collection('CurrentLogin').doc('active');
        const currentLoginDoc = await currentLoginRef.get();

        if (currentLoginDoc.exists) {
            const currentPlayerIds = currentLoginDoc.data().playerIds || [];
            const updatedPlayerIds = currentPlayerIds.filter(id => id !== playerId);

            if (updatedPlayerIds.length === 0) {
                await currentLoginRef.delete();
            } else {
                await currentLoginRef.update({
                    playerIds: updatedPlayerIds
                });
            }
        }

        localStorage.removeItem('playerName');
        localStorage.removeItem('playerId');
        hideLoginUI();
        showMessage('ログアウトしました', 'success');

        // 3秒後にページをリロード
        setTimeout(() => {
            window.location.reload();
        }, 3000);

    } catch (error) {
        console.error('ログアウトエラー:', error);
        showMessage('ログアウトに失敗しました', 'error');
    }
<<<<<<< HEAD
});
});
=======
}
>>>>>>> 31a36e1 (あああああ)

// メッセージ表示関数
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;

    // メッセージを5秒後に非表示にする
    setTimeout(() => {
        messageDiv.className = messageDiv.className.replace(' show', '');
    }, 5000);
}

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('グローバルエラー:', event.error);
});