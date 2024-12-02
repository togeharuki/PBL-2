// グローバル変数の宣言
let selectedPlayerCount = 2;
let db;

// Firebaseの設定と初期化
function initializeFirebase() {
    const firebaseConfig = {
        apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
        authDomain: "deck-dreamers.firebaseapp.com",
        projectId: "deck-dreamers",
        storageBucket: "deck-dreamers.appspot.com",
        messagingSenderId: "165933225805",
        appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
    };

    // Firebase初期化
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
}

// 初期化を実行
initializeFirebase();

// ルームID生成関数
function generateRoomId() {
    const part1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const part2 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${part1}-${part2}`;
}

// コピー機能の関数
function copyRoomId() {
    const roomId = document.querySelector('.room-id').textContent;
    navigator.clipboard.writeText(roomId).then(() => {
        const copyButton = document.querySelector('.copy-button');
        copyButton.textContent = 'コピー完了!';
        copyButton.classList.add('success');

        setTimeout(() => {
            copyButton.textContent = 'コピー';
            copyButton.classList.remove('success');
        }, 1000);
    }).catch(err => {
        alert('コピーに失敗しました');
        console.error('コピーに失敗:', err);
    });
}

// 生成されたルームIDをコピーする関数
function copyGeneratedRoomId() {
    const roomId = document.getElementById('generatedRoomId').textContent;
    navigator.clipboard.writeText(roomId).then(() => {
        const copyButton = document.querySelector('.room-id-display .copy-button');
        copyButton.textContent = 'コピー完了!';
        copyButton.classList.add('success');

        setTimeout(() => {
            copyButton.textContent = 'コピー';
            copyButton.classList.remove('success');
        }, 1000);
    }).catch(err => {
        alert('コピーに失敗しました');
        console.error('コピーに失敗:', err);
    });
}

// ルーム作成関数
async function createRoom() {
    try {
        const roomId = document.getElementById('generatedRoomId').textContent;

        // Firestoreにルームを作成
        await db.collection('rooms').doc(roomId).set({
            maxPlayers: selectedPlayerCount,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'waiting',
            players: {}
        });

        console.log(`${selectedPlayerCount}人用のルーム ${roomId} が作成されました`);

        // マッチング画面に遷移
        const url = new URL('../Match/matching.html', window.location.href);
        url.searchParams.set('roomId', roomId);
        url.searchParams.set('maxPlayers', selectedPlayerCount);
        window.location.href = url.toString();
    } catch (error) {
        console.error('ルーム作成エラー:', error);
        alert('ルームの作成に失敗しました');
    }
}

// ルーム表示更新関数
function updateRoomDisplay(room) {
    if (room) {
        document.getElementById('playerCapacity').textContent = room.maxPlayers;
        document.getElementById('currentPlayers').textContent = Object.keys(room.players || {}).length;
    }
}

// モーダル表示関数
function showCreateRoomModal() {
    const roomId = generateRoomId();
    document.getElementById('generatedRoomId').textContent = roomId;
    document.getElementById('createRoomModal').style.display = 'block';
    document.querySelector('[data-count="2"]').classList.add('selected');
}

// モーダルを閉じる関数
function closeModal() {
    document.getElementById('createRoomModal').style.display = 'none';
    resetPlayerCountSelection();
}

// プレイヤー数選択のリセット関数
function resetPlayerCountSelection() {
    selectedPlayerCount = 2;
    document.querySelectorAll('.player-count-button').forEach(button => {
        button.classList.remove('selected');
    });
    document.querySelector('[data-count="2"]').classList.add('selected');
    updateSelectedPlayerCount();
}

// 選択プレイヤー数の表示更新関数
function updateSelectedPlayerCount() {
    document.getElementById('selectedPlayerCount').textContent = `選択中: ${selectedPlayerCount}人`;
}

// ルーム作成確認関数
function confirmCreateRoom() {
    createRoom();
}

// ルーム検索関数
async function searchRoom() {
    const roomId = document.getElementById('roomIdInput').value;
    const regex = /^\d{3}-\d{4}$/;

    if (!regex.test(roomId)) {
        alert('正しいフォーマットで入力してください（例：123-4567）');
        return;
    }

    try {
        // Firestoreでルームを検索
        const roomDoc = await db.collection('rooms').doc(roomId).get();

        if (roomDoc.exists) {
            const roomData = roomDoc.data();
            // プレイヤー数をチェック
            const currentPlayers = Object.keys(roomData.players || {}).length;

            if (currentPlayers >= roomData.maxPlayers) {
                alert('このルームは満員です');
                return;
            }

            const url = new URL('../Match/matching.html', window.location.href);
            url.searchParams.set('roomId', roomId);
            url.searchParams.set('maxPlayers', roomData.maxPlayers);
            window.location.href = url.toString();
            console.log(`ルーム ${roomId} が見つかりました`);
        } else {
            alert('指定されたルームが見つかりませんでした');
        }
    } catch (error) {
        console.error('ルーム検索エラー:', error);
        alert('ルームの検索に失敗しました');
    }
}

// ルームのプレイヤー数が0人になった場合の削除
function monitorRoomForDeletion(roomId) {
    db.collection('rooms').doc(roomId).onSnapshot((doc) => {
        if (doc.exists) {
            const roomData = doc.data();
            if (Object.keys(roomData.players || {}).length === 0) {
                doc.ref.delete().then(() => {
                    console.log(`ルーム ${roomId} が削除されました`);
                }).catch((error) => {
                    console.error('ルーム削除エラー:', error);
                });
            }
        }
    });
}

// 戻る関数
function goBack() {
    window.location.href = '../Battle/battle.html';
}

// DOMContentLoaded時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // プレイヤー数選択ボタンのイベントリスナー
    const playerCountButtons = document.querySelectorAll('.player-count-button');

    playerCountButtons.forEach(button => {
        button.addEventListener('click', function() {
            playerCountButtons.forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');
            selectedPlayerCount = parseInt(this.getAttribute('data-count'));
            updateSelectedPlayerCount();
        });
    });

    // モーダルの外側クリックで閉じる
    window.onclick = function(event) {
        const modal = document.getElementById('createRoomModal');
        if (event.target === modal) {
            closeModal();
        }
    };

    // ルームIDの入力フォーマット制御
    const roomIdInput = document.getElementById('roomIdInput');
    if (roomIdInput) {
        roomIdInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 3) {
                value = value.slice(0, 3) + '-' + value.slice(3, 7);
            }
            e.target.value = value;
        });
    }

    // 古いルームの自動クリーンアップ
    setInterval(async function cleanupInactiveRooms() {
        try {
            const oldRooms = await db.collection('rooms')
                .where('createdAt', '<=', new Date(Date.now() - 3600000)) // 1時間以上前
                .where('status', '==', 'waiting')
                .get();

            oldRooms.forEach(async (doc) => {
                const roomData = doc.data();
                if (Object.keys(roomData.players || {}).length === 0) {
                    await doc.ref.delete();
                }
            });
        } catch (error) {
            console.error('クリーンアップエラー:', error);
        }
    }, 1000 * 60 * 15); // 15分ごと

    // ルームのプレイヤー数が0人になった場合の削除を監視
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    if (roomId) {
        monitorRoomForDeletion(roomId);
    }
});

// エラーハンドリング
window.addEventListener('error', function(event) {
    console.error('グローバルエラー:', event.error);
});
