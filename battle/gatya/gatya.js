// Firebase設定と初期化
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Firebaseの設定
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// プレイヤー情報の取得
const playerId = localStorage.getItem('playerId');
if (!playerId) {
    console.error('プレイヤー情報が見つかりません');
    alert('ログインしてください');
    window.location.href = 'login.html';
}

// Soukoのパスを指定
const playerCardsRef = doc(db, 'Card', playerId);

// カードが取得されるまでの初期設定
let cardDatabase = [];

// カードデータを初期化
async function initializeCardDatabase() {
    const cardData = await fetchCardDatabase();
    cardDatabase = cardData.length > 0 ? cardData : defaultCardDatabase();
}

// デフォルトのカードデータを返す関数
function defaultCardDatabase() {
    return [
        {
            id: 1,
            name: "不審者の極み'TOUGE'",
            image: "写真/touge.jpg",
            effect: "２ターン数値+5",
            rarity: "UR"
        },
        {
            id: 2,
            name: "徳田家ののりちゃん",
            image: "写真/徳田家ののりちゃん.jpg",
            effect: "手札を１枚捨てる",
            rarity: "N"
        },
        {
            id: 3,
            name: "佐藤家のてんちゃん",
            image: "写真/佐藤家のてんちゃん.jpg",
            effect: "数値を+5",
            rarity: "UR"
        }
    ];
}

// Firebaseからカードデータを取得する関数
async function fetchCardDatabase() {
    const docSnap = await getDoc(playerCardsRef);
    if (docSnap.exists()) {
        return docSnap.data().cards || [];
    } else {
        console.log("No data available");
        return [];
    }
}

// カードデータをSoukoに追加する関数
async function addCardToSouko(card) {
    try {
        const cardId = `card_${Date.now()}`; // 一意のIDを生成
        await setDoc(playerCardsRef, {
            cards: {
                [cardId]: {
                    name: card.name,
                    image: card.image,
                    effect: card.effect,
                    timestamp: new Date()
                }
            }
        }, { merge: true });
        console.log('カードがSoukoに追加されました:', cardId);
    } catch (error) {
        console.error('カードの追加に失敗しました:', error);
    }
}

// DOM要素の取得
const gachaButton = document.getElementById('gacha-button');
const gachaButton10 = document.getElementById('gacha-button-10');
const card = document.querySelector('.card');
const cardImage = document.querySelector('.card-back .card-image img');
const cardName = document.querySelector('.card-back .card-name');
const cardEffect = document.querySelector('.card-back .card-effect');
const rarityDisplay = document.querySelector('.rarity');
const pullCount = document.getElementById('pull-count');
const urRate = document.getElementById('ur-rate');
const srRate = document.getElementById('sr-rate');
const rRate = document.getElementById('r-rate');
const nRate = document.getElementById('n-rate');
const cardsContainer = document.querySelector('.cards-container');
const cardDisplay = document.querySelector('.card-display');

// 新たに追加したボタン要素
const endGachaButton = document.createElement('button');
endGachaButton.textContent = 'ガチャを終わる';
endGachaButton.className = 'gacha-button';
endGachaButton.style.display = 'none'; // 初期は非表示

const retryButton = document.createElement('button');
retryButton.textContent = 'もう1回';
retryButton.className = 'gacha-button';
retryButton.style.display = 'none'; // 初期は非表示

document.querySelector('.button-container').appendChild(endGachaButton);
document.querySelector('.button-container').appendChild(retryButton);

// スタッツの初期化
let stats = {
    total: 0,
    ur: 0,
    sr: 0,
    r: 0,
    n: 0
};

const raritySettings = {
    UR: { class: 'ultra-rare', probability: 3, color: '#e74c3c' },
    SR: { class: 'super-rare', probability: 12, color: '#f1c40f' },
    R: { class: 'rare', probability: 35, color: '#3498db' },
    N: { class: 'common', probability: 50, color: '#7f8c8d' }
};

// パーティクルを生成する関数
function createParticles(color, container) {
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.backgroundColor = color;
        particle.style.position = 'absolute';
        particle.style.left = '50%';
        particle.style.top = '50%';

        const angle = (Math.random() * 360) * Math.PI / 180;
        const distance = 100 + Math.random() * 100;
        particle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
        container.appendChild(particle);
        setTimeout(() => { particle.remove(); }, 1000);
    }
}

// ミニカードを作成する関数
function createMiniCard() {
    const miniCardContainer = document.createElement('div');
    miniCardContainer.className = 'mini-card';

    const cardElement = document.createElement('div');
    cardElement.className = 'card';

    // カード表面
    const cardFront = document.createElement('div');
    cardFront.className = 'card-front';
    const frontImg = document.createElement('img');
    frontImg.src = "写真/カードの裏面.jpg";
    cardFront.appendChild(frontImg);

    // カード裏面
    const cardBack = document.createElement('div');
    cardBack.className = 'card-back';

    const rarity = document.createElement('div');
    rarity.className = 'rarity';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'card-image';
    const cardImg = document.createElement('img');
    imageContainer.appendChild(cardImg);

    const nameDiv = document.createElement('div');
    nameDiv.className = 'card-name';

    const effectDiv = document.createElement('div');
    effectDiv.className = 'card-effect';

    cardBack.appendChild(rarity);
    cardBack.appendChild(imageContainer);
    cardBack.appendChild(nameDiv);
    cardBack.appendChild(effectDiv);

    cardElement.appendChild(cardFront);
    cardElement.appendChild(cardBack);
    miniCardContainer.appendChild(cardElement);

    return {
        container: miniCardContainer,
        image: cardImg,
        name: nameDiv,
        effect: effectDiv,
        rarity: rarity,
        card: cardElement
    };
}
let isFirstPull = true;

async function pullGacha() {
    if (isFirstPull) {
        isFirstPull = false;
    } else {
        if (card.classList.contains('flipped')) {
            return;
        }
    }

    gachaButton.disabled = true;
    cardDisplay.style.display = 'block';
    cardsContainer.style.display = 'none';
    card.classList.remove('ur-card', 'sr-card', 'r-card', 'n-card');

    const randomIndex = Math.floor(Math.random() * cardDatabase.length);
    const pulledCard = cardDatabase[randomIndex];

    cardImage.src = pulledCard.image;
    cardImage.onload = async () => {
        cardName.textContent = pulledCard.name;
        cardEffect.textContent = pulledCard.effect;
        rarityDisplay.textContent = pulledCard.rarity;
        rarityDisplay.className = `rarity ${raritySettings[pulledCard.rarity].class}`;

        updateStats(pulledCard.rarity);
        
        card.classList.add('flipped');
        createParticles(raritySettings[pulledCard.rarity].color, cardDisplay);

        // カードをSoukoに追加
        await addCardToSouko(pulledCard);

        // カードが回転し終わった後にボタンを表示
        endGachaButton.style.display = 'block';
        retryButton.style.display = 'block';

        gachaButton.disabled = false;
    };

    cardImage.onerror = () => {
        console.error("画像の読み込みに失敗しました。画像パスを確認してください。");
        gachaButton.disabled = false;
    };
}

async function pullGacha10() {
    gachaButton10.disabled = true;
    cardDisplay.style.display = 'none';
    cardsContainer.innerHTML = '';
    cardsContainer.style.display = 'grid';

    const pulls = [];
    for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * cardDatabase.length);
        pulls.push(cardDatabase[randomIndex]);
    }

    for (let i = 0; i < pulls.length; i++) {
        const pulledCard = pulls[i];
        const miniCard = createMiniCard();
        cardsContainer.appendChild(miniCard.container);

        miniCard.image.src = pulledCard.image;
        miniCard.image.onload = async () => {
            miniCard.name.textContent = pulledCard.name;
            miniCard.effect.textContent = pulledCard.effect;
            miniCard.rarity.textContent = pulledCard.rarity;
            miniCard.rarity.className = `rarity ${raritySettings[pulledCard.rarity].class}`;

            updateStats(pulledCard.rarity);

            // Soukoにカードを追加
            await addCardToSouko(pulledCard);

            setTimeout(() => {
                miniCard.card.classList.add('flipped');
                createParticles(raritySettings[pulledCard.rarity].color, miniCard.container);
            }, i * 200);
        };

        miniCard.image.onerror = () => {
            console.error("画像の読み込みに失敗しました。画像パスを確認してください。");
        };
    }

    // 10連ガチャでもボタンを表示
    endGachaButton.style.display = 'block';
    retryButton.style.display = 'block';

    gachaButton10.disabled = false;
}

function updateStats(rarity) {
    stats.total++;
    if (rarity === 'UR') stats.ur++;
    else if (rarity === 'SR') stats.sr++;
    else if (rarity === 'R') stats.r++;
    else if (rarity === 'N') stats.n++;

    pullCount.textContent = stats.total;
    urRate.textContent = ((stats.ur / stats.total) * 100).toFixed(2);
    srRate.textContent = ((stats.sr / stats.total) * 100).toFixed(2);
    rRate.textContent = ((stats.r / stats.total) * 100).toFixed(2);
    nRate.textContent = ((stats.n / stats.total) * 100).toFixed(2);
}

// ボタンのイベントリスナーを追加
endGachaButton.addEventListener('click', () => {
    alert('ガチャを終わります。');
    // 必要に応じて、他の処理を追加
});

retryButton.addEventListener('click', () => {
    endGachaButton.style.display = 'none'; // 終了ボタンを非表示
    retryButton.style.display = 'none'; // もう1回ボタンを非表示
    card.classList.remove('flipped'); // カードの回転をリセット
    cardImage.src = "写真/カードの裏面.jpg"; // 裏面画像を設定
    cardDisplay.style.display = 'none'; // カード表示を非表示
    cardsContainer.style.display = 'none'; // カードコンテナを非表示
    gachaButton.disabled = false; // ボタンを有効にする
    gachaButton10.disabled = false; // 10連ボタンも有効にする
});

gachaButton.addEventListener('click', pullGacha);
gachaButton10.addEventListener('click', pullGacha10);
