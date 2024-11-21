class Game {
    constructor() {
        this.playerHp = 10;
        this.opponentHp = 10;
        this.timeLeft = 60;
        this.isPlayerTurn = true;
        this.effectCardUsed = false;
        this.godHandsRemaining = 2;
        
        this.initializeEventListeners();
        this.startTimer();
        this.updateGodHandDisplay();
    }

    initializeEventListeners() {
        // カードのドラッグ&ドロップ設定
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
            card.addEventListener('mouseenter', this.showCardDetails.bind(this));
            card.addEventListener('mouseleave', this.hideCardDetails.bind(this));
        });

        // カードスロットの設定
        document.querySelectorAll('.card-slot').forEach(slot => {
            slot.addEventListener('dragover', this.handleDragOver.bind(this));
            slot.addEventListener('dragleave', this.handleDragLeave.bind(this));
            slot.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    handleDragStart(e) {
        if (!this.isPlayerTurn) return;
        
        const card = e.target;
        // 神の一手が使用済みの場合はドラッグを禁止
        if (card.classList.contains('god-hand') && this.godHandsRemaining <= 0) {
            e.preventDefault();
            return;
        }

        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: card.dataset.type,
            value: card.dataset.value,
            effect: card.dataset.effect
        }));
        card.style.opacity = '0.5';
    }

    handleDragEnd(e) {
        e.target.style.opacity = '1';
    }

    handleDragOver(e) {
        e.preventDefault();
        e.target.style.borderColor = '#4CAF50';
    }

    handleDragLeave(e) {
        e.target.style.borderColor = '#666';
    }

    handleDrop(e) {
        e.preventDefault();
        const slot = e.target.closest('.card-slot');
        if (!slot) return;
        
        slot.style.borderColor = '#666';
        const cardData = JSON.parse(e.dataTransfer.getData('text/plain'));
        
        if (cardData.type === 'god') {
            if (this.godHandsRemaining > 0) {
                this.playGodCard(cardData);
                this.godHandsRemaining--;
                this.updateGodHandDisplay();
            }
        } else {
            this.playNormalCard(cardData, slot);
        }
    }

    playNormalCard(cardData, slot) {
        // バトルカードまたは効果カードの処理
        if (cardData.type === 'effect') {
            if (!this.effectCardUsed) {
                this.executeEffect(cardData.effect);
                this.effectCardUsed = true;
            }
        } else {
            // バトルカードの配置
            const cardElement = this.createCardElement(cardData);
            slot.innerHTML = '';
            slot.appendChild(cardElement);
            this.endTurn();
        }
    }

    createCardElement(cardData) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${cardData.type}`;
        cardElement.innerHTML = `
            <div class="card-content">
                <div class="card-value">${cardData.value || ''}</div>
                <div class="card-type">${cardData.type}</div>
            </div>
        `;
        return cardElement;
    }

    executeEffect(effect) {
        // 効果カードの効果を実行
        switch (effect) {
            case 'draw':
                this.drawCard();
                break;
            case 'view_hand':
                this.viewOpponentHand();
                break;
            // 他の効果の実装
        }
    }

    playGodCard(cardData) {
        // 神の一手の効果処理
        switch (cardData.effect) {
            case 'damage_up':
                this.applyDamageUp();
                break;
            case 'discard':
                this.discardOpponentCard();
                break;
            // 他の神の一手効果の実装
        }
    }

    updateGodHandDisplay() {
        const remainingDisplay = document.querySelector('.god-hand-remaining');
        remainingDisplay.textContent = `残り使用回数: ${this.godHandsRemaining}`;

        // 使用済みの場合、神の一手カードを無効化
        document.querySelectorAll('.god-hand').forEach(card => {
            if (this.godHandsRemaining <= 0) {
                card.classList.add('disabled');
                card.draggable = false;
            }
        });
    }

    startTimer() {
        const timerElement = document.querySelector('.timer');
        
        const timer = setInterval(() => {
            this.timeLeft--;
            timerElement.textContent = this.timeLeft;
            
            if (this.timeLeft <= 0) {
                clearInterval(timer);
                this.handleTimeUp();
            }
        }, 1000);
    }

    handleTimeUp() {
        // タイムアップ時は手札からランダムにカードを選択して場に出す
        const playerHand = document.querySelector('#player-hand');
        const cards = Array.from(playerHand.children);
        if (cards.length > 0) {
            const randomCard = cards[Math.floor(Math.random() * cards.length)];
            const slot = document.querySelector('#player-battle-slot');
            
            const cardData = {
                type: randomCard.dataset.type,
                value: randomCard.dataset.value,
                effect: randomCard.dataset.effect
            };
            
            this.playNormalCard(cardData, slot);
        }
    }

    showCardDetails(e) {
        const card = e.target.closest('.card');
        if (!card) return;

        const cardData = {
            type: card.dataset.type,
            value: card.dataset.value,
            effect: card.dataset.effect
        };

        const popup = document.querySelector('.card-popup');
        popup.style.display = 'block';
        popup.style.left = e.pageX + 10 + 'px';
        popup.style.top = e.pageY + 10 + 'px';
        
        // カードの詳細情報を表示
        popup.innerHTML = this.getCardDetailsHTML(cardData);
    }

    hideCardDetails() {
        const popup = document.querySelector('.card-popup');
        popup.style.display = 'none';
    }

    getCardDetailsHTML(cardData) {
        switch (cardData.type) {
            case 'attack':
                return `
                    <h3>攻撃カード</h3>
                    <p>攻撃力: ${cardData.value}</p>
                    <p>相手に${cardData.value}のダメージを与えることができます。</p>
                `;
            case 'heal':
                return `
                    <h3>回復カード</h3>
                    <p>回復量: ${cardData.value}</p>
                    <p>HPを${cardData.value}回復することができます。</p>
                `;
            case 'effect':
                return `
                    <h3>効果カード</h3>
                    <p>効果: ${this.getEffectDescription(cardData.effect)}</p>
                `;
            case 'god':
                return `
                    <h3>神の一手</h3>
                    <p>効果: ${this.getGodEffectDescription(cardData.effect)}</p>
                    <p>残り使用回数: ${this.godHandsRemaining}</p>
                `;
            default:
                return '';
        }
    }

    getEffectDescription(effect) {
        const effectDescriptions = {
            'draw': '山札から1枚ドローする',
            'view_hand': '相手の手札を2枚見る',
            'damage_both': '両方に2ダメージ',
            'force_damage': '強制1ダメージ',
            'value_up': '数値+2'
        };
        return effectDescriptions[effect] || '不明な効果';
    }

    getGodEffectDescription(effect) {
        const godEffectDescriptions = {
            'damage_up': '与えるダメージ+5',
            'discard': '相手の手札を1枚捨てる',
            'damage_buff': '2ターンの間与えるダメージ+2',
            'reduce_value': '相手の数値-3',
            'graveyard_recover': '墓地から任意のカードを回収',
            'damage_null': 'ダメージ無効化'
        };
        return godEffectDescriptions[effect] || '不明な効果';
    }

    applyDamageUp() {
        // ダメージ+5の効果を適用
        console.log('ダメージ+5が発動されました');
        // TODO: 実際のダメージ計算処理を実装
    }

    discardOpponentCard() {
        // 相手の手札を1枚破棄
        console.log('手札破棄が発動されました');
        // TODO: 相手の手札破棄処理を実装
    }

    drawCard() {
        // カードを1枚ドロー
        console.log('ドローが発動されました');
        // TODO: ドロー処理を実装
    }

    viewOpponentHand() {
        // 相手の手札を見る
        console.log('手札確認が発動されました');
        // TODO: 相手の手札確認処理を実装
    }

    endTurn() {
        this.isPlayerTurn = !this.isPlayerTurn;
        this.effectCardUsed = false;
        this.timeLeft = 60;
        
        // ターン切り替え時の処理
        if (!this.isPlayerTurn) {
            // 相手のターンの処理
            setTimeout(() => {
                this.playOpponentTurn();
            }, 1000);
        }
    }

    playOpponentTurn() {
        // 相手のターンのAI処理
        // TODO: AIの実装
        console.log('相手のターンです');
    }

    // HPの更新処理
    updateHP(player, newValue) {
        const hpValue = Math.min(Math.max(newValue, 0), 10); // HPを0-10の範囲に制限
        if (player === 'player') {
            this.playerHp = hpValue;
            document.querySelector('#player-hp').textContent = `${hpValue}/10`;
            document.querySelector('#player-hp-bar').style.width = `${hpValue * 10}%`;
        } else {
            this.opponentHp = hpValue;
            document.querySelector('#opponent-hp').textContent = `${hpValue}/10`;
            document.querySelector('#opponent-hp-bar').style.width = `${hpValue * 10}%`;
        }
        
        // 勝敗判定
        if (hpValue <= 0) {
            this.endGame(player === 'player' ? 'opponent' : 'player');
        }
    }

    endGame(winner) {
        alert(`ゲーム終了！ ${winner === 'player' ? 'あなた' : '相手'}の勝利です！`);
        // TODO: 結果画面への遷移処理を実装
    }
}

// ゲームの開始
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});