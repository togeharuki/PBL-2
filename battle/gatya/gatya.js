// Firebaseの設定
const firebaseConfig = {
    apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
    authDomain: "deck-dreamers.firebaseapp.com",
    projectId: "deck-dreamers",
    storageBucket: "deck-dreamers.appspot.com",
    messagingSenderId: "165933225805",
    appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
};

// ログインしているユーザーの情報を取得します。
const user = firebase.auth().currentUser()

// ユーザーコレクションへのリファレンスを作成します。
const userRef = db.collection('user')

userRef.doc().set({
    name: 'アイテム1',
    image: '写真/Deck.png',
    effect: '攻撃力1',
    count: 2,
    birthday: new Date('1996-11-11'), // timestampe型にはDateオブジェクトを渡します。
    createdAt: db.FieldValue.serverTimestamp() // サーバーの時間をセットすることもできます。
})

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

