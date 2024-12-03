export class BattleSystem {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.db = gameCore.db;
        this.gameId = gameCore.gameId;
        this.playerId = gameCore.playerId;
    }

    async playCard(card, slot) {
        if (!this.gameCore.isPlayerTurn) {
            alert('相手のターンです');
            return;
        }

        try {
            const gameRef = this.db.collection('games').doc(this.gameId);
            const gameDoc = await gameRef.get();
            const currentState = gameDoc.data();

            // バトルゾーンの状態を確認
            const battleZone = currentState.battleZone || {};
            if (battleZone[`slot${slot}`]) {
                alert('このスロットには既にカードが置かれています');
                return;
            }

            // カードをバトルゾーンに配置
            await gameRef.update({
                [`battleZone.slot${slot}`]: {
                    cardId: card.id,
                    playerId: this.playerId,
                    card: card,
                    isRevealed: false
                }
            });

            // 手札の更新
            await this.updatePlayerHand(card);

            // 攻撃側の場合は相手の応答を待つ
            if (currentState.battleZone?.attacker === this.playerId) {
                await this.waitForOpponentResponse();
            }
            // 守備側の場合はバトル処理を実行
            else if (currentState.battleZone?.attacker === this.gameCore.opponentId) {
                await this.processBattle();
            }

        } catch (error) {
            console.error('カードプレイ中にエラーが発生しました:', error);
            alert('カードのプレイに失敗しました');
        }
    }

    async updatePlayerHand(usedCard) {
        const gameRef = this.db.collection('games').doc(this.gameId);
        const updatedHand = this.gameCore.gameState.players[this.playerId].hand
            .filter(c => c.id !== usedCard.id);
        
        await gameRef.update({
            [`players.${this.playerId}.hand`]: updatedHand,
            currentTurn: this.gameCore.opponentId,
            turnTime: 60
        });
    }

    async waitForOpponentResponse() {
        return new Promise((resolve, reject) => {
            const unsubscribe = this.db.collection('games').doc(this.gameId)
                .onSnapshot((doc) => {
                    const state = doc.data();
                    if (state.battleZone?.[this.gameCore.opponentId]?.card) {
                        unsubscribe();
                        this.processBattle();
                        resolve();
                    }
                });

            setTimeout(() => {
                unsubscribe();
                reject(new Error('相手の応答待ちがタイムアウトしました'));
            }, 60000);
        });
    }

    async processBattle() {
        const gameRef = this.db.collection('games').doc(this.gameId);
        const state = this.gameCore.gameState;
        const battleZone = state.battleZone;
        
        if (!battleZone) return;

        const attackerCard = battleZone[battleZone.attacker].card;
        const defenderCard = battleZone[battleZone.defender].card;

        // カードを表にする
        await gameRef.update({
            [`battleZone.${battleZone.attacker}.isRevealed`]: true,
            [`battleZone.${battleZone.defender}.isRevealed`]: true
        });

        // バトル結果の処理
        await this.processBattleResult(attackerCard, defenderCard, battleZone);

        // バトルゾーンをクリア
        await this.clearBattleZone(attackerCard, defenderCard);
    }

    async processBattleResult(attackerCard, defenderCard, battleZone) {
        const gameRef = this.db.collection('games').doc(this.gameId);

        if (attackerCard.type === 'attack' && defenderCard.type === 'attack') {
            const damage = Math.max(0, attackerCard.value - defenderCard.value);
            if (damage > 0) {
                await gameRef.update({
                    [`players.${battleZone.defender}.hp`]: 
                        this.db.FieldValue.increment(-damage)
                });
            }
        } else if (attackerCard.type === 'heal') {
            const heal = Math.min(
                attackerCard.value, 
                10 - this.gameCore.gameState.players[battleZone.attacker].hp
            );
            await gameRef.update({
                [`players.${battleZone.attacker}.hp`]: 
                    this.db.FieldValue.increment(heal)
            });
        }
    }

    async clearBattleZone(attackerCard, defenderCard) {
        const gameRef = this.db.collection('games').doc(this.gameId);
        await gameRef.update({
            battleZone: {},
            [`players.${this.gameCore.gameState.battleZone.attacker}.graveyard`]: 
                this.db.FieldValue.arrayUnion(attackerCard),
            [`players.${this.gameCore.gameState.battleZone.defender}.graveyard`]: 
                this.db.FieldValue.arrayUnion(defenderCard)
        });
    }
} 