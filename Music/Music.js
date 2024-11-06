// BGMの状態を管理する変数
let bgmPlaying = JSON.parse(localStorage.getItem('bgmPlaying')) || false; // 初期状態はローカルストレージから取得

const audioPlayer = document.getElementById('music-player');
const musicSource = document.getElementById('music-source');

// 選択された音楽の再生と保存を行う関数
function playSelectedMusic(selectedMusic) {
    switch (selectedMusic) {
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
    audioPlayer.play();
    bgmPlaying = true;
    localStorage.setItem('bgmPlaying', true); // 状態を保存
    localStorage.setItem('selectedMusic', selectedMusic); // 選択された音楽を保存
}

// ページ読み込み時に音楽を再開する
window.addEventListener('load', function () {
    let selectedMusic = localStorage.getItem('selectedMusic');
    let currentTime = localStorage.getItem('currentTime');

    if (selectedMusic) {
        playSelectedMusic(selectedMusic);

        // 保存された再生時間があればその位置から再生
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

// ページ遷移時に再生時間を保存する
document.getElementById('titleButton').addEventListener('click', function () {
    if (!audioPlayer.paused) {
        localStorage.setItem('currentTime', audioPlayer.currentTime);
    }

    // フェードアウト効果を追加してページ遷移
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';

    setTimeout(function () {
        window.location.href = '../title.html';
    }, 500);
});

// 音楽選択コンボボックスのイベントハンドラ
document.getElementById('music-select').addEventListener('change', function () {
    let selectedMusic = this.value;
    playSelectedMusic(selectedMusic);
});


