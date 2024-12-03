import { GameCore } from './modules/GameCore.js';
import { BattleSystem } from './modules/BattleSystem.js';
import { CardSystem } from './modules/CardSystem.js';
import { UIManager } from './modules/UIManager.js';
import { EventHandler } from './modules/EventHandler.js';

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
    authDomain: "deck-dreamers.firebaseapp.com",
    projectId: "deck-dreamers",
    storageBucket: "deck-dreamers.appspot.com",
    messagingSenderId: "165933225805",
    appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
};

// Firebase初期化
let db;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    console.log('Firebase初期化成功');
} catch (error) {
    console.error('Firebase初期化エラー:', error);
}

// ゲーム初期化
document.addEventListener('DOMContentLoaded', async () => {
    if (!db) {
        console.error('Firebaseが初期化されていません');
        alert('ゲームの初期化に失敗しました。ページを再読み込みしてください。');
        return;
    }

    try {
        // URLパラメータから情報を取得
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('roomId');
        const tableNumber = urlParams.get('tableNumber');
        const playerId = localStorage.getItem('playerId');

        if (!roomId || !tableNumber || !playerId) {
            throw new Error('ゲーム情報が不正です');
        }

        // 各モジュールのインスタンスを作成
        const gameCore = new GameCore(db, roomId, tableNumber, playerId);
        const cardSystem = new CardSystem(gameCore);
        const battleSystem = new BattleSystem(gameCore);
        const uiManager = new UIManager(gameCore, cardSystem);
        const eventHandler = new EventHandler(gameCore, battleSystem, uiManager);

        // ゲームの初期化
        await gameCore.initializeGame();
        await cardSystem.initializePlayerDeck();
        eventHandler.initializeEventListeners();
        uiManager.updateUI();
        uiManager.initializeTimer();

    } catch (error) {
        console.error('ゲーム初期化エラー:', error);
        alert('ゲームの初期化に失敗しました。ルーム画面に戻ります。');
        window.location.href = '../Room/room.html';
    }
});

