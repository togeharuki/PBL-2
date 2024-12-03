export class EventHandler {
    constructor(gameCore, battleSystem, uiManager) {
        this.gameCore = gameCore;
        this.battleSystem = battleSystem;
        this.uiManager = uiManager;
    }

    initializeEventListeners() {
        console.log('イベントリスナー初期化開始');
        
        this.initializeGodHandListeners();
        this.initializeCardSlotListeners();
        this.initializePlayerHandListeners();
        this.initializeReturnButtonListener();
        
        console.log('イベントリスナー初期化完了');
    }

    initializeGodHandListeners() {
        document.querySelectorAll('.god-hand').forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
            card.addEventListener('mouseenter', () => this.uiManager.showCardDetails(card));
            card.addEventListener('mouseleave', () => this.uiManager.hideCardDetails());
        });
    }

    initializeCardSlotListeners() {
        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (this.gameCore.isPlayerTurn) {
                    e.target.style.borderColor = '#4CAF50';
                }
            });

            slot.addEventListener('dragleave', (e) => {
                e.target.style.borderColor = '#666';
            });

            slot.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    initializePlayerHandListeners() {
        const playerHand = document.getElementById('player-hand');
        if (playerHand) {
            playerHand.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('card')) {
                    this.handleDragStart(e);
                }
            });
        }
    }

    initializeReturnButtonListener() {
        const returnButton = document.querySelector('.return-button');
        if (returnButton) {
            returnButton.addEventListener('click', () => {
                this.cleanup();
                window.location.href = '../Room/room.html';
            });
        }
    }

    handleDragStart(event) {
        if (!this.gameCore.isPlayerTurn) return;
        
        const card = event.target.closest('.card');
        if (!card) return;
        
        event.dataTransfer.setData('text/plain', card.dataset.cardId);
        event.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
    }

    handleDragEnd(event) {
        const card = event.target.closest('.card');
        if (card) {
            card.classList.remove('dragging');
        }
    }

    async handleDrop(event) {
        event.preventDefault();
        const cardId = event.dataTransfer.getData('text/plain');
        const targetSlot = event.target.closest('.card-slot');
        
        if (!cardId || !targetSlot || !this.gameCore.isPlayerTurn) return;
        
        const playerState = this.gameCore.gameState.players[this.gameCore.playerId];
        const card = playerState.hand.find(c => c.id === cardId);
        
        if (card) {
            await this.battleSystem.playCard(card, targetSlot.dataset.slot);
        }
        
        targetSlot.style.borderColor = '#666';
    }

    cleanup() {
        this.uiManager.cleanup();
        this.gameCore.cleanup();
    }
} 