const cardDatabase = [
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
        rarity: "n"
    },
    {
        id: 3,
        name: "佐藤家のてんちゃん",
        image: "写真/佐藤家のてんちゃん.jpg",
        effect: "数値を+5",
        rarity: "UR"
    }
];

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
    cardImage.onload = () => {
        cardName.textContent = pulledCard.name;
        cardEffect.textContent = pulledCard.effect;
        rarityDisplay.textContent = pulledCard.rarity;
        rarityDisplay.className = `rarity ${raritySettings[pulledCard.rarity].class}`;

        updateStats(pulledCard.rarity);
        
        card.classList.add('flipped');
        createParticles(raritySettings[pulledCard.rarity].color, cardDisplay);

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
        miniCard.image.onload = () => {
            miniCard.name.textContent = pulledCard.name;
            miniCard.effect.textContent = pulledCard.effect;
            miniCard.rarity.textContent = pulledCard.rarity;
            miniCard.rarity.className = `rarity ${raritySettings[pulledCard.rarity].class}`;

            updateStats(pulledCard.rarity);

            setTimeout(() => {
                miniCard.card.classList.add('flipped');
                createParticles(raritySettings[pulledCard.rarity].color, miniCard.container);
            }, i * 200);
        };

        miniCard.image.onerror = () => {
            console.error("画像の読み込みに失敗しました。画像パスを確認してください。");
        };
    }

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

gachaButton.addEventListener('click', pullGacha);
gachaButton10.addEventListener('click', pullGacha10);