// Firebaseの設定
const firebaseConfig = {
    projectId: "deck-dreamers",
    organizationId: "oic-ok.ac.jp",
    projectNumber: "165933225805"
};

// Firebaseを初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM要素の取得
const gachaButton = document.getElementById('gachaButton');
const reloadButton = document.getElementById('reloadButton');
const gachaResult = document.getElementById('gachaResult');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const gachaContainer = document.getElementById('gachaContainer');
const rows = [
    document.getElementById('row1'),
    document.getElementById('row2'),
    document.getElementById('row3')
];

// ガチャアイテムのデータ
const GACHA_ITEMS = [
    {
        name: '徳田家ののりちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/N-%E5%BE%B3%E7%94%B0%E5%AE%B6%E3%81%AE%E3%81%AE%E3%82%8A%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+1',  // アイテムの効果
        count: 20,  // 残り個数
        rarity: 'N',  // レアリティ
        explanation: '',
        weight: 35  // 抽選時の重み（確率）
    },
    {
        name: 'メンズマーモット',
        image: 'https://raw.githubusercontent.com/haruki1298/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E3%83%A1%E3%83%B3%E3%82%BA%E3%83%9E%E3%83%BC%E3%83%A2%E3%83%83%E3%83%88.png',
        effect: '攻撃力+1',  // アイテムの効果
        count: 20,  // 残り個数
        rarity: 'N',  // レアリティ
        explanation: '',
        weight: 35  // 抽選時の重み（確率）
    },
    {
        name: '夕日マーモット',
        image: 'https://raw.githubusercontent.com/haruki1298/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E5%A4%95%E6%97%A5%E3%83%9E%E3%83%BC%E3%83%A2%E3%83%83%E3%83%88.png',
        effect: '攻撃力+1',  // アイテムの効果
        count: 20,  // 残り個数
        rarity: 'N',  // レアリティ
        explanation: '',
        weight: 35  // 抽選時の重み（確率）
    },
    {
        name: '遊んでいるマーモット',
        image: 'https://raw.githubusercontent.com/haruki1298/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E9%81%8A%E3%82%93%E3%81%A7%E3%81%84%E3%82%8B%E3%83%9E%E3%83%BC%E3%83%A2%E3%83%83%E3%83%88.png',
        effect: '攻撃力+1',  // アイテムの効果
        count: 20,  // 残り個数
        rarity: 'N',  // レアリティ
        explanation: '',
        weight: 35  // 抽選時の重み（確率）
    },
    {
        name: '学祭のピザ',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E5%AD%A6%E7%A5%AD%E3%81%AE%E3%83%94%E3%82%B6.png',
        effect: '回復+1',  // アイテムの効果
        count: 10,  // 残り個数
        rarity: 'R',  // レアリティ
        explanation: '',
        weight: 30  // 抽選時の重み（確率）
    },
    {
        name: '二郎系',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/R-%E4%BA%8C%E9%83%8E%E7%B3%BB.png',
        effect: '攻撃力+1',  // アイテムの効果
        count: 10,  // 残り個数
        rarity: 'R',  // レアリティ
        explanation: '',
        weight: 30  // 抽選時の重み（確率）
    },
    {
        name: '河合家のりょうちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E6%B2%B3%E5%90%88%E5%AE%B6%E3%81%AE%E3%82%8A%E3%82%87%E3%81%86%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        explanation: '',
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '喜友名家のともちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E5%96%9C%E5%8F%8B%E5%90%8D%E5%AE%B6%E3%81%AE%E3%81%A8%E3%82%82%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        explanation: '',
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '金田家のしょうちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E9%87%91%E7%94%B0%E5%AE%B6%E3%81%AE%E3%81%97%E3%82%87%E3%81%86%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        explanation: '',
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '佐藤家のやまちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E4%BD%90%E8%97%A4%E5%AE%B6%E3%81%AE%E3%82%84%E3%81%BE%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        explanation: '',
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '中野家のてんちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SR-%E4%B8%AD%E9%87%8E%E5%AE%B6%E3%81%AE%E3%81%A6%E3%82%93%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '攻撃力+2',  // アイテムの効果
        count: 5,  // 残り個数
        rarity: 'SR',  // レアリティ
        explanation: '',
        weight: 15  // 抽選時の重み（確率）
    },
    {
        name: '先生集合',
        image: 'https://raw.githubusercontent.com/haruki1298/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SSR-%E5%85%88%E7%94%9F%E9%9B%86%E5%90%88.png',
        effect: '攻撃力+3',  // アイテムの効果
        count: 2,  // 残り個数
        rarity: 'SSR',  // レアリティ
        explanation: '',
        weight: 5  // 抽選時の重み（確率）
    },
    {
        name: 'マーモット系男子',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SSR-%E3%83%9E%E3%83%BC%E3%83%A2%E3%83%83%E3%83%88%E7%B3%BB%E7%94%B7%E5%AD%90.png',
        effect: '攻撃力+3',  // アイテムの効果
        count: 2,  // 残り個数
        rarity: 'SSR',  // レアリティ
        explanation: '',
        weight: 5  // 抽選時の重み（確率）
    },
    {
        name: '佐藤家のてんちゃん',
        image: 'https://raw.githubusercontent.com/togeharuki/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/SSR-%E4%BD%90%E8%97%A4%E5%AE%B6%E3%81%AE%E3%81%A6%E3%82%93%E3%81%A1%E3%82%83%E3%82%93.png',
        effect: '回復力+3',  // アイテムの効果
        count: 2,  // 残り個数
        rarity: 'SSR',  // レアリティ
        explanation: '',
        weight: 5  // 抽選時の重み（確率）
    },
];

// Firebase関連の変数
let playerId = null;
let cardCounter = 1;

// ガチャの初期化
async function initializeGacha() {
    playerId = localStorage.getItem('playerId');
    if (!playerId) {
        alert('ログインが必要です');
        window.location.href = '../login.html';
        return;
    }

    try {
        const soukoRef = db.collection('Souko').doc(playerId);
        const soukoDoc = await soukoRef.get();

        if (!soukoDoc.exists || !soukoDoc.data().gachaItems) {
            await soukoRef.set({
                gachaItems: GACHA_ITEMS,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    } catch (error) {
        console.error('初期化エラー:', error);
        alert(`データの読み込みに失敗しました: ${error.message}`);
    }
}

async function addCardToSouko(card) {
    try {
        const soukoRef = db.collection('Souko').doc(playerId);
        const doc = await soukoRef.get();
        const existingData = doc.data() || {};
        
        // 既存のカードを配列として取得
        const cards = Object.values(existingData).filter(item => item.type === 'gacha');
        
        // 新しいカードIDを生成
        const newCardId = `default_card_ガチャID:${Date.now()}`;
        console.log(newCardId)
        
        // 新しいカードデータを作成
        const newData = {
            [newCardId]: {
                name: card.name,
                image: card.image,
                effect: card.effect,
                rarity: card.rarity,
                explanation: card.explanation || null,
                type: 'gacha',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        };

        // データを更新
        await soukoRef.set({
            ...newData,
            savedCount: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });

    } catch (error) {
        console.error('カード保存エラー:', error);
        throw error;
    }
}

// カードをランダムに並べ替える関数
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 効果音の追加
const gachaSound = new Audio('音声/クリック音.mp3');

// 行にカードを配置
function renderCards() {
    const rows = [document.getElementById('row1'), document.getElementById('row2'), document.getElementById('row3')];
    let shuffledItems = shuffleArray([...GACHA_ITEMS]); // カードをランダムに並べ替える
    let cardIndex = 0;

    for (let i = 0; i < 3; i++) {
        const row = rows[i];
        const cardCount = i === 1 ? 4 : 3;

        for (let j = 0; j < cardCount; j++) {
            if (cardIndex >= shuffledItems.length) break;

            const card = shuffledItems[cardIndex];
            const cardElement = document.createElement('div');
            cardElement.classList.add('gacha-item');

            cardElement.innerHTML = `
                <img src="https://raw.githubusercontent.com/haruki1298/Deck-Dreamers/refs/heads/Deck-Dreamers/battle/gatya/%E5%86%99%E7%9C%9F/%E3%82%AB%E3%83%BC%E3%83%89%E3%81%AE%E8%A3%8F%E9%9D%A2.png" alt="カードの裏面" class="card-image">
                <div class="info" style="display: none;">
                    ${card.name}<br>${card.effect}<br>残り枚数: ${card.count}<br>レアリティ: ${card.rarity}
                </div>
            `;

            cardElement.querySelector('.card-image').addEventListener('click', async function() {
                try {
                    const allCards = document.querySelectorAll('.card-image');
                    allCards.forEach(card => {
                        card.style.pointerEvents = 'none';
                        card.style.opacity = '0.5';
                    });
                    
                    this.style.opacity = '1';
                    this.src = card.image;
                    
                    // 効果音を再生
                    gachaSound.play();
                    
                    document.getElementById('gachaResult').innerHTML = `
                        <h3>カードの詳細</h3>
                        <img src="${card.image}" alt="${card.name}">
                        <p>カード名: ${card.name}<br>効果: ${card.effect}<br>レアリティ: ${card.rarity}</p>
                    `;
                    document.getElementById('modal').style.display = 'block';

                    await addCardToSouko(card);

                } catch (error) {
                    console.error('エラー:', error);
                    alert('カードの保存に失敗しました');
                }
            });

            row.appendChild(cardElement);
            cardIndex++;
        }
    }
}


// カードを表示させる関数
function showCards() {
    document.getElementById('gachaContainer').style.display = 'block';
    shuffleCards('row1');
    shuffleCards('row2');
    shuffleCards('row3');
}

// ページ読み込み時に各行のカードをランダムに並べ替える
window.onload = function() {
    document.getElementById('gachaContainer').style.display = 'none'; // 初期状態で非表示
};

// ガチャを引く機能
document.getElementById('gachaButton').addEventListener('click', function() {
    renderCards();
    
    const totalWeight = GACHA_ITEMS.reduce((sum, card) => sum + card.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    let selectedCard;

    for (const card of GACHA_ITEMS) {
        randomWeight -= card.weight;
        if (randomWeight <= 0) {
            selectedCard = card;
            break;
        }
    }

    document.getElementById('gachaResult').innerHTML = `
        <h3>ガチャで出たカード:</h3>
        <img src="${selectedCard.image}" alt="${selectedCard.name}">
        <p>${selectedCard.name}<br>効果: ${selectedCard.effect}<br>レアリティ: ${selectedCard.rarity}</p>
    `;

    document.getElementById('gachaButton').style.display = 'none';
    document.getElementById('reloadButton').style.display = 'block';
});

// その他のイベントリスナー
document.getElementById('reloadButton').addEventListener('click', function() {
    window.location.href = '../../main/Menu/Menu.html';
});

document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('modal').style.display = 'none';
});

document.getElementById('gachaContainer').addEventListener('click', function(event) {
    event.stopPropagation();
});

// 初期化
document.addEventListener('DOMContentLoaded', initializeGacha);