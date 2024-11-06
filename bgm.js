// BGM用のオーディオ要素を作成
const audioPlayer = document.createElement('audio');
audioPlayer.id = 'music-player';
audioPlayer.style.display = 'none'; // オーディオプレイヤーを非表示にする
document.body.appendChild(audioPlayer);

// 音楽ソースの取得
const musicSource = document.createElement('source');
musicSource.id = 'music-source';
audioPlayer.appendChild(musicSource);

// localStorageから選択されたBGM、再生時間、再生状態を取得
const selectedMusic = localStorage.getItem('selectedMusic');
const savedTime = localStorage.getItem('currentTime');
let bgmPlaying = localStorage.getItem('bgmStatus') === 'on';

// BGMの再生を管理する関数
function loadAndPlayBGM() {
    if (selectedMusic) {
        switch (selectedMusic) {
            case 'bgm1':
                musicSource.src = "/maou_game_medley02.mp3";
                break;
            case 'bgm2':
                musicSource.src = "/upbeat.mp3";
                break;
            case 'bgm3':
                musicSource.src = "/classic.mp3";
                break;
            default:
                musicSource.src = "";
        }

        audioPlayer.load();

        // 再生時間の復元
        if (savedTime) {
            audioPlayer.currentTime = savedTime;
        }

        // 再生状態がオンの場合にBGMを再生
        if (bgmPlaying) {
            audioPlayer.play();
        }
    }
}

// BGMのオン/オフ切り替え
const bgmToggleButton = document.getElementById('bgmToggleButton');
if (bgmToggleButton) {
    bgmToggleButton.addEventListener('click', function () {
        bgmPlaying = !bgmPlaying;
        localStorage.setItem('bgmStatus', bgmPlaying ? 'on' : 'off');

        if (bgmPlaying) {
            audioPlayer.play();
            this.textContent = "BGM オフ";
        } else {
            audioPlayer.pause();
            this.textContent = "BGM オン";
        }
    });

    bgmToggleButton.textContent = bgmPlaying ? "BGM オフ" : "BGM オン";
}

// ページ遷移時に再生時間を保存
window.addEventListener('beforeunload', function () {
    if (!audioPlayer.paused) {
        localStorage.setItem('currentTime', audioPlayer.currentTime);
    }
});

// ページ読み込み時にBGMを設定
window.addEventListener('load', loadAndPlayBGM);
