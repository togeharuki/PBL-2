// BGMの状態を管理する変数
let bgmPlaying = JSON.parse(localStorage.getItem('bgmPlaying')) || false;

const audioPlayer = document.getElementById('music-player');
const musicSource = document.getElementById('music-source');

// 選択された音楽の再生と保存を行う関数
function playSelectedMusic(selectedMusic) {
    switch (selectedMusic) {
        case 'bgm1':
            musicSource.src = "./audio/maou_game_medley02.mp3";
            break;
        case 'bgm2':
            musicSource.src = "./audio/upbeat.mp3";
            break;
        case 'bgm3':
            musicSource.src = "./audio/classic.mp3";
            break;
        default:
            musicSource.src = "";
    }

    audioPlayer.load();
    if (bgmPlaying) {
        audioPlayer.play();
    }
    localStorage.setItem('selectedMusic', selectedMusic);
}

// ページ読み込み時に音楽を再開する
window.addEventListener('load', function () {
    let selectedMusic = localStorage.getItem('selectedMusic');
    let currentTime = localStorage.getItem('currentTime');

    if (selectedMusic) {
        playSelectedMusic(selectedMusic);

        if (currentTime) {
            audioPlayer.currentTime = currentTime;
        }

        if (bgmPlaying) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    }
});

// 音楽選択コンボボックスのイベントハンドラ
document.getElementById('music-select').addEventListener('change', function () {
    let selectedMusic = this.value;
    playSelectedMusic(selectedMusic);
});

// 別ページのオン/オフボタン用の設定（このコードはボタンがある別ページでも機能）
const bgmToggleButton = document.getElementById('bgmToggleButton');
if (bgmToggleButton) {
    bgmToggleButton.addEventListener('click', function () {
        bgmPlaying = !bgmPlaying;
        localStorage.setItem('bgmPlaying', bgmPlaying);

        if (bgmPlaying) {
            audioPlayer.play();
            bgmToggleButton.textContent = "BGM オフ";
        } else {
            audioPlayer.pause();
            bgmToggleButton.textContent = "BGM オン";
        }
    });
}

// ページ遷移時に再生時間を保存
window.addEventListener('beforeunload', function () {
    if (!audioPlayer.paused) {
        localStorage.setItem('currentTime', audioPlayer.currentTime);
    }
});
