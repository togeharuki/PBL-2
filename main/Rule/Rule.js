document.getElementById('StartBtn').addEventListener('click', function() {
    // フェードアウト効果を追加
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';
    
    // 0.5秒後に遷移する
    setTimeout(function() {
        window.location.href = '../Menu/Menu.html';
    }, 500);
});