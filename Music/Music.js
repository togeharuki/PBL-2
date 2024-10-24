document.getElementById('titleButton').addEventListener('click', function() {
    // フェードアウト効果を追加
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';
    
    // 0.5秒後に遷移
    setTimeout(function() {
        window.location.href = '../title.html';
    }, 500);
});

        // 音楽選択コンボボックスのイベントハンドラ
        document.getElementById('music-select').addEventListener('change', function() {
    let selectedMusic = this.value;
    let audioPlayer = document.getElementById('music-player');
    let musicSource = document.getElementById('music-source');

    switch(selectedMusic) {
        case 'bgm1':
            musicSource.src = "maou_game_medley02.mp3" // 実際の音楽ファイルパスを指定
            break;
        case 'bgm2':
            musicSource.src = "upbeat.mp3"; // 実際の音楽ファイルパスを指定
            break;
        case 'bgm3':
            musicSource.src = "classic.mp3"; // 実際の音楽ファイルパスを指定
            break;
        default:
            musicSource.src = ""; // 音楽なしの場合
    }

    audioPlayer.load(); // 新しい音楽をロードして再生準備
});
