// 効果音を再生する関数
function playCancelSound() {
    const sound = document.getElementById('cancelSound');
    sound.currentTime = 0;
    sound.play();
}

document.getElementById('StartBtn').addEventListener('click', function() {
    // 効果音を再生
    playCancelSound();
    
    // フェードアウト効果を追加
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';
    
    // 0.5秒後に遷移する
    setTimeout(function() {
        window.location.href = '../Menu/Menu.html';
    }, 500);
});