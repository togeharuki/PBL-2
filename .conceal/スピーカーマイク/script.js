const speakerIcon = document.getElementById("speaker-icon");
const audio = document.getElementById("audio");  // 音楽の要素を取得

let isMuted = true; // 初期状態を音量オフに設定

// 音量を切り替える関数
function toggleVolume() {
  isMuted = !isMuted; // ミュート状態を反転
  
  const currentTime = new Date().toLocaleTimeString(); // 現在の時刻を取得（HH:MM:SS形式）

  if (isMuted) {
    // 音量オフ（ミュート状態）
    speakerIcon.innerHTML = '<img src="写真/offBth.png" alt="音量オフ">';
    audio.pause(); // 音楽を停止

    console.log(`音量オフ: ${currentTime}`); // コンソールに現在時刻を表示
  } else {
    // 音量オン
    speakerIcon.innerHTML = '<img src="写真/onBth.png" alt="音量オン">';
    audio.play(); // 音楽を再生

    console.log(`音量オン: ${currentTime}`); // コンソールに現在時刻を表示
  }
}

// アイコンをクリックすると音量のオン/オフを切り替える
speakerIcon.addEventListener("click", toggleVolume);
