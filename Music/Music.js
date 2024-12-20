function playCancelSound() {
    const sound = document.getElementById('cancelSound');
    sound.currentTime = 0;
    sound.play();
}