const items = [
    { name: 'アイテム1', image: '写真/Deck.png', effect: '攻撃力アップ', count: 0 },
    { name: 'アイテム2', image: '写真/Dream.png', effect: '防御力アップ', count: 0 },
    { name: 'アイテム3', image: '写真/dream world.png', effect: '回避率アップ', count: 0 },
    { name: 'アイテム4', image: '写真/ice world.png', effect: 'スピードアップ', count: 0 },
    { name: 'アイテム5', image: '写真/hell world.png', effect: 'クリティカル率アップ', count: 1 }
];

const gachaCapsule = document.getElementById('gachaCapsule');
const gachaButton = document.getElementById('gachaButton');
const resultArea = document.getElementById('gachaResult');
const gachaCapsuleImage = document.getElementById('gachaCapsuleImage');
const resetButton = document.getElementById('resetButton');
const endMessage = document.getElementById('endMessage');

// ガチャボタンがクリックされたとき
gachaButton.addEventListener('click', () => {
    triggerGachaAnimation();
    handleGachaResult();
});

// 戻るボタンがクリックされたとき
resetButton.addEventListener('click', resetGacha);

function triggerGachaAnimation() {
    gachaButton.classList.add('clicked');
    gachaButton.style.display = 'none';
    resetButton.style.display = 'inline-block';

    gachaCapsule.style.animation = 'none';
    void gachaCapsule.offsetWidth;
    gachaCapsule.style.animation = 'rotateCapsule 2s ease forwards';
}

function handleGachaResult() {
    let randomItem;
    do {
        randomItem = getRandomItem();
    } while (randomItem.count === 0);

    randomItem.count--;
    setTimeout(() => {
        resultArea.value = `アイテム名: ${randomItem.name}\n効果: ${randomItem.effect}`;
        gachaCapsuleImage.src = randomItem.image;

        displayItemsRemaining();
        checkAllItemsOutOfStock();
    }, 2000);
}

function getRandomItem() {
    return items[Math.floor(Math.random() * items.length)];
}

function resetGacha() {
    resetButton.style.display = 'none';
    gachaButton.style.display = 'inline-block';
    resultArea.value = '';
    resultArea.style.display = 'block';
    gachaCapsuleImage.src = '写真/カードの裏面.png';
    endMessage.style.display = 'none';
    gachaCapsule.style.transform = 'rotateY(0deg)';
}

function displayItemsRemaining() {
    console.clear();
    items.forEach(item => console.log(`${item.name}: 残り ${item.count} 個`));
}

function checkAllItemsOutOfStock() {
    const allOutOfStock = items.every(item => item.count === 0);
    if (allOutOfStock) {
        endMessage.style.display = 'block';
        gachaButton.style.display = 'none';
        resultArea.style.display = 'none';
        resetButton.style.display = 'inline-block';
        resetButton.addEventListener('click', () => {
            window.location.href = '../../main/Menu/Menu.html';  // 遷移先のURLを指定
        });
    }
}

