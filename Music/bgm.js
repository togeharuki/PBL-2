// 音楽ファイルのパスを指定
const musicFiles = {
    bgm1: 'path/to/sample.mp3', // 各音楽ファイルのパスを正確に指定してください
    bgm2: 'path/to/bgm2.mp3',
    bgm3: 'path/to/bgm3.mp3'
};

// HTML要素を取得
const musicSelect = document.getElementById('music-select');
const musicPlayer = document.getElementById('music-player');
const musicSource = document.getElementById('music-source');
const speakerIcon = document.createElement('div'); // スピーカーアイコンを動的に追加
document.body.appendChild(speakerIcon);

speakerIcon.id = 'speaker-icon';
speakerIcon.innerHTML = '<img src="写真/offBth.png" alt="音量オフ">'; // 初期状態はオフ

let isMuted = true; // 初期状態を音量オフに設定

// ページ読み込み時の処理
window.addEventListener('DOMContentLoaded', () => {
    // localStorageから選択されたBGMを取得
    const selectedMusic = localStorage.getItem('selectedMusic');
    if (selectedMusic && selectedMusic !== 'none') {
        musicSelect.value = selectedMusic;
        musicSource.src = musicFiles[selectedMusic];
        musicPlayer.load();
        if (!isMuted) {
            musicPlayer.play(); // ミュートが解除されていれば再生
        }
        musicPlayer.style.display = 'block'; // プレイヤーを表示
    }

    // スピーカーアイコンを初期化
    updateSpeakerIcon();
});

// 音楽選択が変更されたときの処理
musicSelect.addEventListener('change', () => {
    const selectedValue = musicSelect.value;

    if (selectedValue === 'none') {
        musicPlayer.pause();
        musicPlayer.style.display = 'none'; // プレイヤーを非表示
        musicSource.src = '';
    } else {
        musicSource.src = musicFiles[selectedValue];
        musicPlayer.load();
        musicPlayer.style.display = 'block'; // プレイヤーを表示
        if (!isMuted) {
            musicPlayer.play(); // ミュートが解除されていれば再生
        }
    }

    // 選択をlocalStorageに保存
    localStorage.setItem('selectedMusic', selectedValue);
});

// 音量オン/オフの切り替え
function toggleVolume() {
    isMuted = !isMuted; // ミュート状態を反転

    if (isMuted) {
        musicPlayer.pause(); // 音楽を停止
    } else {
        // 音楽を再生（選択されている場合のみ）
        if (musicSelect.value !== 'none' && musicSource.src) {
            musicPlayer.play();
        }
    }

    // スピーカーアイコンを更新
    updateSpeakerIcon();

    // 現在時刻を取得し、コンソールに表示
    const currentTime = new Date().toLocaleTimeString();
    console.log(isMuted ? `音量オフ: ${currentTime}` : `音量オン: ${currentTime}`);
}

// スピーカーアイコンを更新する関数
function updateSpeakerIcon() {
    if (isMuted) {
        speakerIcon.innerHTML = '<img src="写真/offBth.png" alt="音量オフ">';
    } else {
        speakerIcon.innerHTML = '<img src="写真/onBth.png" alt="音量オン">';
    }
}

// スピーカーアイコンをクリックすると音量を切り替える
speakerIcon.addEventListener('click', toggleVolume);
