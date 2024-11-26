// Firebase設定とSDKのインポート
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    onSnapshot,
    query,
    where,
    limit,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class MatchingSystem {
    constructor() {
        // Firebase初期化
        const firebaseConfig = {
            apiKey: "AIzaSyCGgRBPAF2W0KKw0tX2zwZeyjDGgvv31KM",
            authDomain: "deck-dreamers.firebaseapp.com",
            projectId: "deck-dreamers",
            storageBucket: "deck-dreamers.appspot.com",
            messagingSenderId: "165933225805",
            appId: "1:165933225805:web:4e5a3907fc5c7a30a28a6c"
        };

        const app = initializeApp(firebaseConfig);
        this.db = getFirestore(app);
        
        this.matchId = null;
        this.playerId = localStorage.getItem('playerId');
        this.playerName = localStorage.getItem('playerName');
        this.unsubscribe = null;

        // マッチング開始時にオーバーレイを表示
        this.showMatchingOverlay();
        this.startMatching();
    }

    showMatchingOverlay() {
        const overlay = document.getElementById('matching-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideMatchingOverlay() {
        const overlay = document.getElementById('matching-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    async startMatching() {
        try {
            // プレイヤー情報の確認
            if (!this.playerId || !this.playerName) {
                alert('プレイヤー情報が見つかりません。ログインしてください。');
                window.location.href = '../login.html';
                return;
            }

            // 既存の空きマッチを探す
            const matchRef = await this.findAvailableMatch();
            
            if (matchRef) {
                // 既存マッチに参加
                await this.joinMatch(matchRef);
            } else {
                // 新しいマッチを作成
                await this.createNewMatch();
            }

            // マッチの状態を監視
            this.watchMatchStatus();

        } catch (error) {
            console.error('マッチング開始エラー:', error);
            alert('マッチングに失敗しました。再度お試しください。');
            this.hideMatchingOverlay();
        }
    }

    async findAvailableMatch() {
        const matchesRef = collection(this.db, 'matches');
        const q = query(
            matchesRef, 
            where('status', '==', 'waiting'),
            where('player1.id', '!=', this.playerId),
            limit(1)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return snapshot.docs[0].ref;
        }
        return null;
    }

    async createNewMatch() {
        const matchRef = doc(collection(this.db, 'matches'));
        this.matchId = matchRef.id;

        const matchData = {
            status: 'waiting',
            player1: {
                id: this.playerId,
                name: this.playerName
            },
            player2: null,
            created: new Date().toISOString(),
            gameStarted: false
        };

        await setDoc(matchRef, matchData);
        console.log('新しいマッチを作成しました:', this.matchId);
    }

    async joinMatch(matchRef) {
        const player2Data = {
            id: this.playerId,
            name: this.playerName
        };

        await updateDoc(matchRef, {
            status: 'ready',
            player2: player2Data,
            gameStarted: true
        });

        this.matchId = matchRef.id;
        console.log('マッチに参加しました:', this.matchId);
    }

    watchMatchStatus() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const matchRef = doc(this.db, 'matches', this.matchId);
        
        this.unsubscribe = onSnapshot(matchRef, (snapshot) => {
            if (snapshot.exists()) {
                const matchData = snapshot.data();
                
                if (matchData.status === 'ready' && matchData.gameStarted) {
                    this.hideMatchingOverlay();
                    // ゲームの初期化処理を開始
                    this.initializeGame(matchData);
                }
            }
        });
    }

    async initializeGame(matchData) {
        const gameRef = doc(this.db, 'games', this.matchId);
        const initialGameState = {
            status: 'playing',
            players: {
                [matchData.player1.id]: {
                    name: matchData.player1.name,
                    hp: 10,
                    deck: [],
                    hand: [],
                    field: null,
                    godHandRemaining: 2
                },
                [matchData.player2.id]: {
                    name: matchData.player2.name,
                    hp: 10,
                    deck: [],
                    hand: [],
                    field: null,
                    godHandRemaining: 2
                }
            },
            currentTurn: matchData.player1.id,
            turnTime: 60
        };

        await setDoc(gameRef, initialGameState);
        
        // ゲームページへ移動
        const gameUrl = new URL(window.location.href);
        gameUrl.searchParams.set('gameId', this.matchId);
        gameUrl.searchParams.set('playerId', this.playerId);
        window.location.href = gameUrl.toString();
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// マッチングシステムの初期化
document.addEventListener('DOMContentLoaded', () => {
    const matchingSystem = new MatchingSystem();

    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', () => {
        matchingSystem.cleanup();
    });
});