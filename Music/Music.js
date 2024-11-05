// BGMの状態を管理する変数
let bgmPlaying = false; // 初期状態をオフに設定

// タイトルボタンのイベントリスナー
document.getElementById('titleButton').addEventListener('click', function() {
    // 再生中の音楽があれば、その再生時間を保存
    let audioPlayer = document.getElementById('music-player');
    if (!audioPlayer.paused) {
        localStorage.setItem('currentTime', audioPlayer.currentTime);
    }
    
    // フェードアウト効果を追加
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';
    
    // 0.5秒後にタイトルページに遷移
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
            musicSource.src = "maou_game_medley02.mp3"; // 実際の音楽ファイルパスを指定
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

    if (musicSource.src) {
        audioPlayer.load(); // 音楽をロード
        audioPlayer.play(); // 音楽を再生
        bgmPlaying = true; // BGM再生中の状態にする
        document.getElementById('bgmToggleButton').textContent = "BGM オフ"; // ボタンのテキストを更新
    }

    // 選択された音楽をlocalStorageに保存
    localStorage.setItem('selectedMusic', selectedMusic);
});

// BGMトグルボタンのイベントリスナー
document.getElementById('bgmToggleButton').addEventListener('click', function() {
    let audioPlayer = document.getElementById('music-player');
    
    if (bgmPlaying) {
        audioPlayer.pause(); // 音楽を一時停止
        this.textContent = "BGM オン"; // ボタンのテキストを変更
    } else {
        audioPlayer.play(); // 音楽を再生
        this.textContent = "BGM オフ"; // ボタンのテキストを変更
    }
    
    bgmPlaying = !bgmPlaying; // 再生状態を反転
});

const audioPlayer = document.getElementById('music-player');

// ページを閉じる前に再生時間を保存する
window.addEventListener('beforeunload', function() {
    localStorage.setItem('currentTime', audioPlayer.currentTime);
});

// ページ読み込み時に音楽を再開する
window.addEventListener('load', function() {
    let selectedMusic = localStorage.getItem('selectedMusic');
    let musicSource = document.getElementById('music-source');

    // 前のページで選択された音楽がある場合
    if (selectedMusic) {
        switch(selectedMusic) {
            case 'bgm1':
                musicSource.src = "maou_game_medley02.mp3";
                break;
            case 'bgm2':
                musicSource.src = "upbeat.mp3";
                break;
            case 'bgm3':
                musicSource.src = "classic.mp3";
                break;
            default:
                musicSource.src = "";
        }

        audioPlayer.load();

        // 再生時間が保存されていたら設定
        let currentTime = localStorage.getItem('currentTime');
        if (currentTime) {
            audioPlayer.currentTime = currentTime;
        }

        audioPlayer.play(); // 音楽を再生
        bgmPlaying = true; // BGM再生中の状態にする
        document.getElementById('bgmToggleButton').textContent = "BGM オフ"; // ボタンのテキストを更新
    }
});

