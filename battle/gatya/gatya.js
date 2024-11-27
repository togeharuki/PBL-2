// アイテムの配列（name:アイテム名,image:画像のパス,effect:効果,count:個数）
const items = [
    { name: 'アイテム1', image: '写真/Deck.png', effect: '攻撃力アップ', count: 10 },
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
const endMessage = document.getElementById('endMessage');  // 終了メッセージ用の要素を追加

// ガチャボタンがクリックされたとき
gachaButton.addEventListener('click', () => {
    // ボタンに押すアニメーションを加える
    gachaButton.classList.add('clicked'); // 新しいクラスを追加してアニメーション効果を適用

    // ガチャボタンを非表示にして戻るボタンを表示
    gachaButton.style.display = 'none';
    resetButton.style.display = 'inline-block';  // 戻るボタンを表示

    // 既存のアニメーションをリセットしてから新たにアニメーションを適用
    gachaCapsule.style.animation = 'none'; // これでアニメーションをリセット
    void gachaCapsule.offsetWidth;  // これでリフローを強制し、アニメーションを再適用
    gachaCapsule.style.animation = 'rotateCapsule 2s ease forwards'; // 新しいアニメーションを適用

    let randomItem;

    // アイテムをランダムに選ぶ。選ばれたアイテムが在庫切れなら再度選ぶ。
    do {
        randomItem = items[Math.floor(Math.random() * items.length)];
    } while (randomItem.count === 0); // 在庫がない場合は再度選び直す

    // アイテムの個数を減らす
    randomItem.count--;

    // アニメーション終了後に結果を表示
    setTimeout(() => {
        // アイテム名と効果を1行で表示
        resultArea.value = `アイテム名: ${randomItem.name} 
効果: ${randomItem.effect}`;
        
        // 回転後にカプセルの画像を変更
        gachaCapsuleImage.src = randomItem.image;

        // アイテムの在庫をコンソールに表示
        displayItemsRemaining();

        // 全アイテムが在庫切れの場合にメッセージを表示し、ガチャを終了
        checkAllItemsOutOfStock();
    }, 2000);  // アニメーションが終わる2秒後に実行
});

// 戻るボタンがクリックされたとき
resetButton.addEventListener('click', () => {
    // ガチャを再開するための処理（ガチャをリセット）
    
    // 戻るボタンを非表示にし、ガチャボタンを表示
    resetButton.style.display = 'none';
    gachaButton.style.display = 'inline-block';  // ガチャボタンを表示

    // 結果表示エリアをリセット
    resultArea.value = '';
    resultArea.style.display = 'block';  // 結果表示エリアを再表示

    // カプセルの画像を元の状態に戻す
    gachaCapsuleImage.src = '写真/カードの裏面.png';

    // ガチャ終了メッセージを非表示
    endMessage.style.display = 'none';
    
    // アイテムの在庫をリセットしない（リセットはしない）
    // items.forEach(item => item.count = 1);  // ここを削除

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
        // 全アイテムがなくなった場合の処理
        console.log('ガチャ終了');
        
        // ガチャ終了画面に遷移（終了メッセージを表示）
        endMessage.style.display = 'block';  // 終了メッセージを表示
        gachaButton.style.display = 'none';  // ガチャボタンを非表示にする
        resultArea.style.display = 'none';  // 結果表示エリアを非表示にする

        // 戻るボタンのみ表示
        resetButton.style.display = 'inline-block';  // 戻るボタンを表示
    }
}
