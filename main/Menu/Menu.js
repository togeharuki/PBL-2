function navigateTo(url) {
    // フェードアウト効果
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';
    
    // 0.5秒後に遷移
    setTimeout(function() {
        window.location.href = url;
    }, 500);
}

document.getElementById('settingsButton').addEventListener('click', function() {
    navigateTo('../../Music/Music.html');
});

document.getElementById('battleButton').addEventListener('click', function() {
    navigateTo('../../battle/Battle/battle.html');
});

document.getElementById('gatyaBth').addEventListener('click', function() {
    navigateTo('../../battle/gatya/gatya.html');
});

document.getElementById('RuleBtn').addEventListener('click', function() {
    navigateTo('../Rule/Rule.html')
});
// 追加した戻るボタンのイベントリスナー
document.getElementById('returnButton').addEventListener('click', function() {
    navigateTo('../title.html')
});
