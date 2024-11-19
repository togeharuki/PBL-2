// 音楽ファイルのパスを指定
const musicFiles = {
    bgm1: 'path/to/Sample.mp3', // 正確なパスを指定
    bgm2: 'path/to/bgm2.mp3',
    bgm3: 'path/to/bgm3.mp3'
};

// HTML要素を取得
const musicSelect = document.getElementById('music-select');
const musicPlayer = document.getElementById('music-player');
const musicSource = document.getElementById('music-source');
const speakerIcon = document.getElementById('speaker-icon'); // HTMLに既存の要素を取得

let isMuted = true; // 初期状態を音量オフに設定

// ページ読み込み時の処理
window.addEventListener('DOMContentLoaded', () => {
    // localStorageから選択されたBGMを取得
    const selectedMusic = localStorage.getItem('selectedMusic');
    if (selectedMusic && selectedMusic !== 'none') {
        musicSelect.value = selectedMusic;
        playMusic(musicFiles[selectedMusic]); // 初期化時に再生を試みる
    }

    // localStorageからミュート状態を取得
    const storedMuteState = localStorage.getItem('isMuted');
    if (storedMuteState !== null) {
        isMuted = storedMuteState === 'true'; // 文字列を真偽値に変換
    }

    // スピーカーアイコンを初期化
    updateSpeakerIcon();

    // ミュートが解除されていれば音楽を再生
    if (!isMuted && selectedMusic && selectedMusic !== 'none') {
        musicPlayer.play();
    }
});

// 音楽選択が変更されたときの処理
musicSelect.addEventListener('change', () => {
    const selectedValue = musicSelect.value;

    if (selectedValue === 'none') {
        stopMusic();
    } else {
        playMusic(musicFiles[selectedValue]);
    }

    // 選択をlocalStorageに保存
    localStorage.setItem('selectedMusic', selectedValue);
});

// 音量オン/オフの切り替え
function toggleVolume() {
    isMuted = !isMuted; // ミュート状態を反転

    if (isMuted) {
        stopMusic();
    } else {
        // 音楽を再生（選択されている場合のみ）
        if (musicSelect.value !== 'none' && musicSource.src) {
            musicPlayer.play();
        }
    }

    // ミュート状態をlocalStorageに保存
    localStorage.setItem('isMuted', isMuted);

    // スピーカーアイコンを更新
    updateSpeakerIcon();

    // 現在時刻を取得し、コンソールに表示
    const currentTime = new Date().toLocaleTimeString();
    console.log(isMuted ? `音量オフ: ${currentTime}` : `音量オン: ${currentTime}`);
}

// 音楽を再生
function playMusic(src) {
    musicSource.src = src; // 音楽ファイルをセット
    musicPlayer.load();    // 音源を読み込み
    if (!isMuted) {
        musicPlayer.play(); // ミュート解除時のみ再生
    }
}

// 音楽を停止
function stopMusic() {
    musicPlayer.pause();   // 一時停止
    musicPlayer.currentTime = 0; // 再生位置をリセット
}

// スピーカーアイコンを更新する関数
function updateSpeakerIcon() {
    if (isMuted) {
        speakerIcon.innerHTML = '<img src="Music/syasin/offBth.png" alt="音量オフ">';
    } else {
        speakerIcon.innerHTML = '<img src="Music/syasin/onBth.png" alt="音量オン">';
    }
}

// スピーカーアイコンをクリックすると音量を切り替える
speakerIcon.addEventListener('click', toggleVolume);
