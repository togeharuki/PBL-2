// アイテムの配列（画像のパスとアイテム名）
// 各アイテムに個数のプロパティを追加
const items = [
    //name:名前,image:写真の場所,count:枚数
    { name: 'アイテム1', image: '写真/Deck.png', count: 1 },
    { name: 'アイテム2', image: '写真/Dream.png', count: 1 },
    { name: 'アイテム3', image: '写真/dream world.png', count: 1 },
    { name: 'アイテム4', image: '写真/ice world.png', count: 1 },
    { name: 'アイテム5', image: '写真/hell world.png', count: 1 }
];

const gachaCapsule = document.getElementById('gachaCapsule');
const gachaButton = document.getElementById('gachaButton');
const resultArea = document.getElementById('gachaResult');
const gachaCapsuleImage = document.getElementById('gachaCapsuleImage');
const resetButton = document.getElementById('resetButton');

// ガチャボタンがクリックされたとき
gachaButton.addEventListener('click', () => {
    // ボタンに押すアニメーションを加える
    gachaButton.classList.add('clicked'); // 新しいクラスを追加してアニメーション効果を適用

    // ガチャボタンを非表示にして戻るボタンを表示
    gachaButton.style.display = 'none';
    resetButton.style.display = 'inline-block';  // 戻るボタンを表示

    // カプセルの回転アニメーションを開始
    gachaCapsule.style.animation = 'rotateCapsule 2s ease forwards';

    let randomItem;

    // アイテムをランダムに選ぶ。選ばれたアイテムが在庫切れなら再度選ぶ。
    do {
        randomItem = items[Math.floor(Math.random() * items.length)];
    } while (randomItem.count === 0); // 在庫がない場合は再度選び直す

    // アイテムの個数を減らす
    randomItem.count--;

    // アニメーション終了後に結果を表示
    setTimeout(() => {
        // 結果を表示
        resultArea.value = `選ばれたアイテムは: ${randomItem.name}`;
        
        // 回転後にカプセルの画像を変更
        gachaCapsuleImage.src = randomItem.image;

        // カプセルの回転をリセット
        gachaCapsule.style.transform = 'rotateY(0deg)';

        // アイテムの在庫をコンソールに表示
        displayItemsRemaining();

        // 全アイテムが在庫切れの場合にメッセージを表示
        checkAllItemsOutOfStock();
    }, 2000);  // アニメーションが終わる2秒後に実行
});

// 戻るボタンがクリックされたとき
resetButton.addEventListener('click', () => {
    // 戻るボタンを非表示にしてガチャボタンを表示
    resetButton.style.display = 'none';
    gachaButton.style.display = 'inline-block';  // ガチャボタンを表示

    // 結果表示エリアをリセット
    resultArea.value = '';
    
    // カプセルの画像を元の状態に戻す
    gachaCapsuleImage.src = '写真/カードの裏面.png';

    // カプセルの回転をリセット
    gachaCapsule.style.transform = 'rotateY(0deg)';
});

// アイテムの残り個数を一覧で表示する関数
function displayItemsRemaining() {
    console.clear(); // 以前の出力をクリアして、新しい状態を表示

    items.forEach(item => {
        console.log(`${item.name}: 残り ${item.count} 個`);
    });
}

// すべてのアイテムが在庫切れかをチェックする関数
function checkAllItemsOutOfStock() {
    const allOutOfStock = items.every(item => item.count === 0); // すべてのアイテムが在庫切れかを確認

    if (allOutOfStock) {
        console.log('天井です。(カモれたぞぉ！！！)');
    }
}
