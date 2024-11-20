let selectedPlayerCount = 2;

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

function createRoom() {
    const roomId = document.getElementById('generatedRoomId').textContent;
    const newRoom = new GameRoom(roomId, selectedPlayerCount);
    rooms.set(roomId, newRoom);
    console.log(`${selectedPlayerCount}人用のルーム ${roomId} が作成されました`);
}

function updateRoomDisplay(room) {
    document.getElementById('playerCapacity').textContent = room.maxPlayers;
    document.getElementById('currentPlayers').textContent = room.players.length;
}

function showCreateRoomModal() {
    const roomId = generateRoomId();
    document.getElementById('generatedRoomId').textContent = roomId;
    document.getElementById('createRoomModal').style.display = 'block';
    document.querySelector('[data-count="2"]').classList.add('selected');
}

function closeModal() {
    document.getElementById('createRoomModal').style.display = 'none';
    resetPlayerCountSelection();
}

function resetPlayerCountSelection() {
    selectedPlayerCount = 2;
    document.querySelectorAll('.player-count-button').forEach(button => {
        button.classList.remove('selected');
    });
    document.querySelector('[data-count="2"]').classList.add('selected');
    updateSelectedPlayerCount();
}

function updateSelectedPlayerCount() {
    document.getElementById('selectedPlayerCount').textContent = `選択中: ${selectedPlayerCount}人`;
}

function confirmCreateRoom() {
    createRoom();
    closeModal();
}

function searchRoom() {
    const roomId = document.getElementById('roomIdInput').value;
    const regex = /^\d{3}-\d{4}$/;
    
    if (!regex.test(roomId)) {
        alert('正しいフォーマットで入力してください（例：123-4567）');
        return;
    }

    const room = rooms.get(roomId);
    if (room) {
        const url = new URL('../Match/matching.html', window.location.href);
        url.searchParams.set('roomId', roomId);
        url.searchParams.set('maxPlayers', room.maxPlayers);
        window.location.href = url.toString();
        console.log(`ルーム ${roomId} が見つかりました`);
    } else {
        alert('指定されたルームが見つかりませんでした');
    }
}

function goBack() {
    window.location.href = '../Battle/battle.html';
}

document.addEventListener('DOMContentLoaded', function() {
    const playerCountButtons = document.querySelectorAll('.player-count-button');
    
    playerCountButtons.forEach(button => {
        button.addEventListener('click', function() {
            playerCountButtons.forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');
            selectedPlayerCount = parseInt(this.getAttribute('data-count'));
            updateSelectedPlayerCount();
        });
    });

    window.onclick = function(event) {
        const modal = document.getElementById('createRoomModal');
        if (event.target === modal) {
            closeModal();
        }
    };
});

document.getElementById('roomIdInput').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) {
        value = value.slice(0, 3) + '-' + value.slice(3, 7);
    }
    e.target.value = value;
});

const rooms = new Map();

class GameRoom {
    constructor(roomId, maxPlayers = 2) {
        this.roomId = roomId;
        this.players = [];
        this.status = 'waiting';
        this.createdAt = new Date();
        this.maxPlayers = maxPlayers;
    }

    addPlayer(player) {
        if (this.players.length >= this.maxPlayers) {
            throw new Error('ルームが満員です');
        }
        this.players.push(player);

        if (this.players.length === this.maxPlayers) {
            this.status = 'playing';
        }
    }

    removePlayer(playerId) {
        this.players = this.players.filter(player => player.id !== playerId);
        
        if (this.players.length === 0) {
            rooms.delete(this.roomId);
        }
    }

    getStatus() {
        return {
            roomId: this.roomId,
            players: this.players,
            status: this.status,
            createdAt: this.createdAt,
            remainingSlots: this.maxPlayers - this.players.length
        };
    }

    finish() {
        this.status = 'finished';
    }
}

function cleanupInactiveRooms() {
    const now = new Date();
    for (const [roomId, room] of rooms) {
        const hoursPassed = (now - room.createdAt) / (1000 * 60 * 60);
        if (hoursPassed >= 1 && room.players.length === 0) {
            rooms.delete(roomId);
        }
    }
}

setInterval(cleanupInactiveRooms, 1000 * 60 * 15);