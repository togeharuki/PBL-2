document.getElementById('onePull').addEventListener('click', function() {
    window.location.href = 'https://lucycal.net/web_tool/cpuStressTest/'; // 遷移先のURLを指定
});

document.getElementById('onePull').addEventListener('click', function(event) {
    event.stopPropagation(); // ガチャボックスのクリックイベントを防ぐ
    console.log("1連ガチャを引きました");
});

document.getElementById('tenPull').addEventListener('click', function() {
    window.location.href = 'https://misc.laboradian.com/test/prime-calc/'; // 遷移先のURLを指定
});

document.getElementById('tenPull').addEventListener('click', function(event) {
    event.stopPropagation(); // ガチャボックスのクリックイベントを防ぐ
    console.log("10連ガチャを引きました");
});