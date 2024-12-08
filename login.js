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
            const currentLoginDoc = await db.collection('CurrentLogin')
                                         .doc(savedPlayerId)
                                         .get();
            
            if (currentLoginDoc.exists) {
                updateUIForLoggedInUser(savedPlayerName, savedPlayerId);
            } else {
                const playerDoc = await db.collection('Player')
                                        .doc(savedPlayerId)
                                        .get();
                
                if (playerDoc.exists) {
                    await addToCurrentLogin(savedPlayerId, savedPlayerName);
                    updateUIForLoggedInUser(savedPlayerName, savedPlayerId);
                } else {
                    resetLoginState();
                }
            }
        } else {
            resetLoginState();
        }
    } catch (error) {
        console.error('初期化エラー:', error);
        resetLoginState();
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

        const playerQuery = await db.collection('Player')
                                  .where('playerName', '==', playerName)
                                  .get();

        if (playerQuery.empty) {
            showMessage('存在しないプレイヤー名です', 'error');
            return;
        }

        const playerData = playerQuery.docs[0].data();
        const playerId = playerData.playerId;

        const currentLoginDoc = await db.collection('CurrentLogin')
                                      .doc(playerId)
                                      .get();
        
        if (currentLoginDoc.exists) {
            showMessage('このアカウントは既にログインしています', 'error');
            return;
        }

        await addToCurrentLogin(playerId, playerName);
        
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('playerId', playerId);

        updateUIForLoggedInUser(playerName, playerId);
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
// CurrentLoginにプレイヤーを追加
async function addToCurrentLogin(playerId, playerName) {
    try {
        const currentLoginRef = db.collection('CurrentLogin').doc(playerId);
        await currentLoginRef.set({
            playerName: playerName,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('CurrentLogin更新エラー:', error);
        throw error;
    }
}

// ログアウト処理
logoutButton.addEventListener('click', async () => {
    try {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) {
            showMessage('ログインしていません', 'error');
            return;
        }

        const currentLoginRef = db.collection('CurrentLogin').doc(playerId);
        const doc = await currentLoginRef.get();

        if (doc.exists) {
            await currentLoginRef.delete();
            localStorage.removeItem('playerName');
            localStorage.removeItem('playerId');

            resetLoginState();
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

// UIをログイン状態に更新
function updateUIForLoggedInUser(playerName, playerId) {
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