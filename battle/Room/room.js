function generateRoomId() {
    const part1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const part2 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${part1}-${part2}`;
}

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

function createRoom() {
    const roomId = generateRoomId(); // 新しいルームIDを生成
    document.querySelector('.room-id').textContent = roomId; // 生成したIDを表示
    const copyButton = document.querySelector('.copy-button');
    copyButton.textContent = 'コピー';
    copyButton.classList.remove('success');

    // 新しいルームを作成
    const newRoom = new GameRoom(roomId);
    rooms.set(roomId, newRoom); // グローバルなroomsマップに追加

    console.log(`ルーム ${roomId} が作成されました`);
}

function searchRoom() {
    const roomId = document.getElementById('roomIdInput').value; // 入力からルームIDを取得
    const regex = /^\d{3}-\d{4}$/; // 正しいフォーマットの確認
    
    if (!regex.test(roomId)) {
        alert('正しいフォーマットで入力してください（例：123-4567）');
        return;
    }

    const room = rooms.get(roomId); // マップからルームを取得
    if (room) {
        console.log(`ルーム ${roomId} が見つかりました`);
        // ルームが見つかった場合、matching.htmlへの遷移
        window.location.href = `../Match/matching.html?roomId=${roomId}`;
    } else {
        alert('指定されたルームが見つかりませんでした');
    }
}

function goBack() {
    window.location.href = '../Battle/battle.html'; // 戻るボタンの処理
}

// 入力フォーマットのバリデーション
document.getElementById('roomIdInput').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) {
        value = value.slice(0, 3) + '-' + value.slice(3, 7);
    }
    e.target.value = value;
});

// ルームを保持するためのMap
const rooms = new Map();

// ゲームルームクラス
class GameRoom {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = [];
        this.status = 'waiting'; // waiting, playing, finished
        this.createdAt = new Date();
        this.maxPlayers = 2;
    }

    // プレイヤーの追加
    addPlayer(player) {
        if (this.players.length >= this.maxPlayers) {
            throw new Error('ルームが満員です');
        }
        this.players.push(player);

        // プレイヤーが揃ったらゲーム開始
        if (this.players.length === this.maxPlayers) {
            this.status = 'playing';
        }
    }

    // プレイヤーの削除
    removePlayer(playerId) {
        this.players = this.players.filter(player => player.id !== playerId);
        
        // プレイヤーがいなくなったらルームを削除
        if (this.players.length === 0) {
            rooms.delete(this.roomId);
        }
    }

    // ゲームの状態を取得
    getStatus() {
        return {
            roomId: this.roomId,
            players: this.players,
            status: this.status,
            createdAt: this.createdAt,
            remainingSlots: this.maxPlayers - this.players.length
        };
    }

    // ルームの終了
    finish() {
        this.status = 'finished';
        // 必要に応じて終了処理を追加
    }
}

// ルーム管理の補助関数
function cleanupInactiveRooms() {
    const now = new Date();
    for (const [roomId, room] of rooms) {
        // 1時間以上経過した未使用のルームを削除
        const hoursPassed = (now - room.createdAt) / (1000 * 60 * 60);
        if (hoursPassed >= 1 && room.players.length === 0) {
            rooms.delete(roomId);
        }
    }
}

// 定期的な不要ルーム削除
setInterval(cleanupInactiveRooms, 1000 * 60 * 15); // 15分ごとにチェック