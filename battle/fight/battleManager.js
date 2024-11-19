export class BattleManager {
    constructor(roomId, playerId) {
        this.roomId = roomId;
        this.playerId = playerId;
        this.gameState = {
            players: {},
            currentPhase: 'waiting',
            turnNumber: 1,
            turnTimeLeft: 60
        };
        
        this.cardEffects = new CardEffects(this);
        this.uiManager = new UIManager(this);
        this.initialize();
    }

    async initialize() {
        try {
            await this.setupFirebase();
            await this.loadGameData();
            this.setupWebSocket();
            this.setupEventListeners();
            this.startGame();
        } catch (error) {
            console.error('初期化エラー:', error);
            this.handleError(error);
        }
    }

    async setupFirebase() {
        const firebaseConfig = {
            apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
            authDomain: "deck-dreamers.firebaseapp.com",
            projectId: "deck-dreamers",
            storageBucket: "deck-dreamers.appspot.com",
            messagingSenderId: "165933225805",
            appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
        };
        
        firebase.initializeApp(firebaseConfig);
        this.db = firebase.firestore();
        this.rtdb = firebase.database();
    }

    setupWebSocket() {
        this.ws = new WebSocket(`wss://your-websocket-server/game/${this.roomId}`);
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleGameUpdate(data);
        };
    }

    async loadGameData() {
        const gameRef = this.db.collection('games').doc(this.roomId);
        const gameDoc = await gameRef.get();
        
        if (gameDoc.exists) {
            this.gameState = { ...this.gameState, ...gameDoc.data() };
            this.initializePlayers();
        }
    }

    initializePlayers() {
        const players = this.gameState.players;
        Object.keys(players).forEach(playerId => {
            players[playerId] = {
                ...players[playerId],
                hp: 10,
                deck: this.shuffleDeck(players[playerId].deck),
                hand: [],
                battleZone: null,
                graveyard: [],
                divineMovesLeft: 2
            };
        });
        this.dealInitialHands();
    }

    startGame() {
        this.gameState.currentPhase = 'playing';
        this.startTurn();
        this.uiManager.updateUI();
    }

    startTurn() {
        clearInterval(this.timer);
        this.gameState.turnTimeLeft = 60;
        this.startTimer();
        this.drawCards();
        this.updateGameState();
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.gameState.turnTimeLeft--;
            this.uiManager.updateTimer();
            
            if (this.gameState.turnTimeLeft <= 0) {
                this.handleTimeUp();
            }
        }, 1000);
    }

    handleTimeUp() {
        clearInterval(this.timer);
        this.playRandomCard();
    }

    updateGameState() {
        const gameRef = this.rtdb.ref(`games/${this.roomId}`);
        gameRef.set(this.gameState);
    }
}
