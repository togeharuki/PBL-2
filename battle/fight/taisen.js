import { BattleManager } from './battleManager.js';
import { UIManager } from './uiManager.js';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    const playerId = urlParams.get('playerId');
    
    if (roomId && playerId) {
        window.battleManager = new BattleManager(roomId, playerId);
    } else {
        window.location.href = '/Room/room.html';
    }
});