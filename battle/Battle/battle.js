function navigateTo(url) {
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';
    
    setTimeout(function() {
        window.location.href = url;
    }, 500);
}

document.getElementById('createCardButton').addEventListener('click', function() {
    navigateTo('../Card/card.html');
});

document.getElementById('backToMenuButton').addEventListener('click', function() {
    navigateTo('../Room/room.html');
});

document.getElementById('editDeckButton').addEventListener('click', function() {
    navigateTo('../Card/deck/deck.html'); 
});
