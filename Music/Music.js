export function playSoundEffect(audioId) {
    const audio = document.getElementById(audioId);
    if (audio) {
        audio.currentTime = 0; // 再生位置をリセット
        audio.play() // 再生
            .catch(err => console.warn('Audio playback failed:', err));
    } else {
        console.warn(`Audio element with ID "${audioId}" not found.`);
    }
}
