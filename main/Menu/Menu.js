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
    navigateTo('../battle/battle.html');
});

document.getElementById('RuleBtn').addEventListener('click', function() {
    navigateTo('../Rule/Rule.html')
});