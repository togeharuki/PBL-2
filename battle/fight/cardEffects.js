export class CardEffects {
    constructor(battleManager) {
        this.battleManager = battleManager;
    }

    async executeEffect(effectType, params = {}) {
        const effects = {
            'draw': this.drawCard.bind(this),
            'viewHand': this.viewOpponentHand.bind(this),
            'increasePower': this.increasePower.bind(this),
            'directDamage': this.directDamage.bind(this),
            'damageAll': this.damageAllPlayers.bind(this),
            'divineDamagePlus': this.divineDamagePlus.bind(this),
            'discardOpponentCard': this.discardOpponentCard.bind(this),
            'temporaryPowerUp': this.temporaryPowerUp.bind(this),
            'nullifyDamage': this.nullifyDamage.bind(this),
            'decreaseOpponentPower': this.decreaseOpponentPower.bind(this),
            'recoverFromGraveyard': this.recoverFromGraveyard.bind(this)
        };

        if (effects[effectType]) {
            await effects[effectType](params);
            this.battleManager.updateGameState();
        }
    }

    // 効果カード実装
    async drawCard() {
        const player = this.battleManager.gameState.players[this.battleManager.playerId];
        if (player.deck.length > 0) {
            const card = player.deck.pop();
            player.hand.push(card);
            return true;
        }
        return false;
    }

    async viewOpponentHand() {
        const opponent = this.getOpponent();
        if (opponent.hand.length > 0) {
            const viewCards = opponent.hand
                .sort(() => Math.random() - 0.5)
                .slice(0, Math.min(2, opponent.hand.length));
            await this.battleManager.uiManager.showOpponentCards(viewCards);
        }
    }

    async increasePower(params) {
        const player = this.battleManager.gameState.players[this.battleManager.playerId];
        if (player.battleZone) {
            player.battleZone.value += 2;
        }
    }

    async directDamage() {
        const opponent = this.getOpponent();
        opponent.hp = Math.max(0, opponent.hp - 1);
        this.battleManager.checkGameEnd();
    }

    async damageAllPlayers() {
        Object.values(this.battleManager.gameState.players).forEach(player => {
            player.hp = Math.max(0, player.hp - 2);
        });
        this.battleManager.checkGameEnd();
    }

    // 神の一手実装
    async divineDamagePlus() {
        const player = this.battleManager.gameState.players[this.battleManager.playerId];
        if (player.battleZone?.type === 'attack') {
            player.battleZone.value += 5;
        }
    }

    async discardOpponentCard(params) {
        const opponent = this.getOpponent();
        if (opponent.hand.length > 0 && params.cardIndex !== undefined) {
            const discardedCard = opponent.hand.splice(params.cardIndex, 1)[0];
            opponent.graveyard.push(discardedCard);
        }
    }

    async temporaryPowerUp() {
        const player = this.battleManager.gameState.players[this.battleManager.playerId];
        player.effects = player.effects || {};
        player.effects.temporaryPowerUp = {
            value: 2,
            turnsLeft: 2
        };
    }

    async nullifyDamage() {
        const player = this.battleManager.gameState.players[this.battleManager.playerId];
        player.effects = player.effects || {};
        player.effects.damageNullification = true;
    }

    async decreaseOpponentPower() {
        const opponent = this.getOpponent();
        if (opponent.battleZone) {
            opponent.battleZone.value = Math.max(0, opponent.battleZone.value - 3);
        }
    }

    async recoverFromGraveyard(params) {
        const player = this.battleManager.gameState.players[this.battleManager.playerId];
        if (player.graveyard.length > 0 && params.cardIndex !== undefined) {
            const recoveredCard = player.graveyard.splice(params.cardIndex, 1)[0];
            player.hand.push(recoveredCard);
        }
    }

    getOpponent() {
        const players = this.battleManager.gameState.players;
        return Object.values(players).find(p => p.id !== this.battleManager.playerId);
    }
}
