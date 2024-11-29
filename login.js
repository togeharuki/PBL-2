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
const loginForm = document.getElementById('login-form');

// スタイルの追加
const style = document.createElement('style');
style.textContent = `
    .login-status {
        background: rgba(78, 205, 196, 0.1);
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
        text-align: center;
    }

    .player-info {
        color: #4ecdc4;
        font-weight: bold;
        margin-bottom: 10px;
        font-size: 1.2em;
    }

    .logout-section {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-top: 10px;
    }

    #logoutButton {
        background: linear-gradient(45deg, #ff6b6b, #ff4757);
        color: white;
        padding: 12px 24px;
        border: none;
        border-radius: 25px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    #logoutButton:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .message.show {
        animation: fadeInOut 3s ease-in-out;
    }

    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-20px); }
        15% { opacity: 1; transform: translateY(0); }
        85% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
    }
`;
document.head.appendChild(style);

// プレイヤー名の入力チェック
playerNameInput?.addEventListener('input', function() {
    if (this.value.length > 20) {
        this.value = this.value.slice(0, 20);
    }
});

// ログイン状態のUI更新
function updateLoginUI(playerName, playerId) {
    playerInfoDiv.innerHTML = `
        <div class="login-status">
            <div class="player-info">
                現在のログイン:<br>
                ${playerName}<br>
                プレイヤーID: ${playerId}
            </div>
        </div>
    `;
    playerInfoDiv.style.display = 'block';
    logoutButton.style.display = 'block';
    loginForm.style.display = 'none';
}

// ログイン状態の非表示
function hideLoginUI() {
    playerInfoDiv.innerHTML = '';
    playerInfoDiv.style.display = 'none';
    logoutButton.style.display = 'none';
    loginForm.style.display = 'block';
    playerNameInput.value = '';
}

// ログイン状態の確認関数
async function checkLoginState(savedPlayerId) {
    const currentLoginDoc = await db.collection('CurrentLogin').doc('active').get();
    return currentLoginDoc.exists && 
           currentLoginDoc.data().playerIds && 
           currentLoginDoc.data().playerIds.includes(savedPlayerId);
}

// ページ読み込み時の処理
window.addEventListener('load', async () => {
    try {
        const savedPlayerId = localStorage.getItem('playerId');
        const savedPlayerName = localStorage.getItem('playerName');
        
        if (savedPlayerId && savedPlayerName) {
            const isLoggedIn = await checkLoginState(savedPlayerId);

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
    } catch (error) {
        console.error('ログイン状態の確認中にエラーが発生:', error);
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
            return;
        }

        const playerData = playerQuery.docs[0].data();
        const playerId = playerData.playerId;

        // 現在のログイン状態を確認
        const currentLoginRef = db.collection('CurrentLogin').doc('active');
        const currentLoginDoc = await currentLoginRef.get();

        if (currentLoginDoc.exists) {
            const currentPlayerIds = currentLoginDoc.data().playerIds || [];
            if (currentPlayerIds.includes(playerId)) {
                showMessage('このアカウントはすでにログインしています', 'error');
                return;
            }

        // ログイン状態を更新
        await addToCurrentLogin(playerId);

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

        // ローカルストレージをクリア
        localStorage.removeItem('playerName');
        localStorage.removeItem('playerId');

        // UI更新
        hideLoginUI();
        showMessage('ログアウトしました', 'success');

            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } catch (error) {
        console.error('ログアウトエラー:', error);
        showMessage('ログアウトに失敗しました', 'error');
    }
});
});

// メッセージ表示関数
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;

    // 5秒後にメッセージを非表示
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

// 接続状態の監視
db.enableNetwork().catch(error => {
    console.error('データベース接続エラー:', error);
    showMessage('サーバーに接続できません', 'error');
});