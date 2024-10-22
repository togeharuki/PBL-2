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