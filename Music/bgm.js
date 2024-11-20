// 音楽ファイルのパスを指定
const musicFiles = {
    bgm1: 'path/to/Sample.mp3',
    bgm2: 'path/to/神の一手.mp3',
    bgm3: 'path/to/フリー音源1.mp3',
    oic: 'path/to/oic_S.mp3',
};

// HTML要素を取得
const musicSelect = document.getElementById('music-select');
const musicPlayer = document.getElementById('music-player');
const musicSource = document.getElementById('music-source');
const speakerIcon = document.getElementById('speaker-icon');
const titleButton = document.getElementById('titleButton'); // タイトルボタンを取得

let isMuted = true; // 初期状態

// ページ読み込み時の処理
window.addEventListener('DOMContentLoaded', () => {
    // ローカルストレージからBGM選択状態を復元
    const selectedMusic = localStorage.getItem('selectedMusic');
    const storedMuteState = localStorage.getItem('isMuted');

    // ミュート状態を復元
    isMuted = storedMuteState === 'true'; // 文字列を真偽値に変換

    // 選択されたBGMがあれば再生を試みる
    if (selectedMusic && selectedMusic !== 'none') {
        musicSelect.value = selectedMusic;
        playMusic(musicFiles[selectedMusic]);
    }

    // スピーカーアイコンを初期化
    updateSpeakerIcon();
});

// 音楽選択が変更されたときの処理
musicSelect.addEventListener('change', () => {
    const selectedValue = musicSelect.value;

    if (selectedValue === 'none') {
        stopMusic();
    } else {
        playMusic(musicFiles[selectedValue]);
    }

    // BGM選択をローカルストレージに保存
    localStorage.setItem('selectedMusic', selectedValue);
});

// 音量オン/オフの切り替え
function toggleVolume() {
    isMuted = !isMuted;

    if (isMuted) {
        stopMusic();
    } else {
        // 音楽を再生（選択されている場合のみ）
        if (musicSelect.value !== 'none' && musicSource.src) {
            musicPlayer.play();
        }
    }

    // ミュート状態をローカルストレージに保存
    localStorage.setItem('isMuted', isMuted);

    // スピーカーアイコンを更新
    updateSpeakerIcon();
}

// 音楽を再生
function playMusic(src) {
    // ファイルパスのURLエンコードが必要ならエンコードを適用
    musicSource.src = encodeURI(src); // encodeURIで日本語ファイル名を扱えるようにする
    musicPlayer.load();
    if (!isMuted) {
        musicPlayer.play();
    }
}

// 音楽を停止
function stopMusic() {
    musicPlayer.pause();
    musicPlayer.currentTime = 0;
}

// スピーカーアイコンを更新する関数
function updateSpeakerIcon() {
    if (isMuted) {
        speakerIcon.innerHTML = '<img src="syasin/off.png" alt="音量オフ">';
    } else {
        speakerIcon.innerHTML = '<img src="syasin/on.png" alt="音量オン">';
    }
}

// スピーカーアイコンをクリックすると音量を切り替える
speakerIcon.addEventListener('click', toggleVolume);

// タイトルに戻るボタンのクリックイベントを設定
titleButton.addEventListener('click', () => {
    window.location.href = '../main/Menu/Menu.html'; // タイトルページのURLに変更してください
});
