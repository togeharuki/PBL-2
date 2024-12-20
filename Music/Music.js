export function playSoundEffect(audioId) {
    const audio = document.getElementById(audioId);
    if (audio) {
        audio.currentTime = 0; // 再生位置をリセット
        audio.play(); // 再生
    } else {
        console.warn(`Audio element with ID "${audioId}" が見つかりません。`);
    }
}
