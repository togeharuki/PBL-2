// BGMの状態を管理する変数
let bgmPlaying = JSON.parse(localStorage.getItem('bgmPlaying')) || false; // 初期状態はローカルストレージから取得

const audioPlayer = document.getElementById('music-player');
const musicSource = document.getElementById('music-source');
const bgmToggleButton = document.getElementById('bgmToggleButton'); // ボタンの要素

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
    if (bgmPlaying) {
        audioPlayer.play();
    }
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

        // BGMの再生状態に応じて再生/停止を行う
        if (bgmPlaying) {
            audioPlayer.play();
            bgmToggleButton.textContent = "BGM オフ"; // ボタンのテキスト変更
        } else {
            audioPlayer.pause();
            bgmToggleButton.textContent = "BGM オン"; // ボタンのテキスト変更
        }
    }
});

// ページ遷移時に再生時間を保存する
window.addEventListener('beforeunload', function () {
    if (!audioPlayer.paused) {
        localStorage.setItem('currentTime', audioPlayer.currentTime);
    }
});

// 音楽選択コンボボックスのイベントハンドラ
document.getElementById('music-select').addEventListener('change', function () {
    let selectedMusic = this.value;
    playSelectedMusic(selectedMusic);
});

// タイトルボタンをクリックした時にページ遷移
document.getElementById('titleButton').addEventListener('click', function () {
    if (!audioPlayer.paused) {
        localStorage.setItem('currentTime', audioPlayer.currentTime); // 再生時間を保存
    }

    // フェードアウト効果を追加してページ遷移
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';

    setTimeout(function () {
        window.location.href = '../title.html'; // タイトルページに遷移
    }, 500);
});

// BGM オン/オフ ボタンのイベントハンドラ
bgmToggleButton.addEventListener('click', function () {
    bgmPlaying = !bgmPlaying; // BGMの再生状態を切り替え
    localStorage.setItem('bgmPlaying', bgmPlaying); // 状態を保存

    if (bgmPlaying) {
        audioPlayer.play();
        bgmToggleButton.textContent = "BGM オフ"; // ボタンのテキストを変更
    } else {
        audioPlayer.pause();
        bgmToggleButton.textContent = "BGM オン"; // ボタンのテキストを変更
    }
});
