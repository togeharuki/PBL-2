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
            if (!this.playerId || !this.playerName) {
                alert('ログインが必要です');
                window.location.href = '../login/login.html';
                return;
            }

            let matchRef = null;

            // まず、既存の待機中のマッチを探す
            const matchesRef = collection(this.db, 'matches');
            const q = query(matchesRef, 
                where('status', '==', 'waiting'),
                where('player1.id', '!=', this.playerId),
                limit(1)
            );

            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // 既存のマッチに参加
                matchRef = querySnapshot.docs[0].ref;
                this.matchId = matchRef.id;
                await this.joinMatch(matchRef);
            } else {
                // 新しいマッチを作成
                await this.createNewMatch();
            }

            // マッチの状態を監視
            this.watchMatchStatus();

        } catch (error) {
            console.error('マッチングエラー:', error);
            this.hideMatchingOverlay();
            alert('マッチングに失敗しました。再度お試しください。');
        }
    }

    async createNewMatch() {
        const matchRef = doc(collection(this.db, 'matches'));
        this.matchId = matchRef.id;

        await setDoc(matchRef, {
            status: 'waiting',
            createdAt: new Date().toISOString(),
            player1: {
                id: this.playerId,
                name: this.playerName
            },
            player2: null
        });

        console.log('新しいマッチを作成:', this.matchId);
    }

    async joinMatch(matchRef) {
        try {
            await updateDoc(matchRef, {
                status: 'matched',
                player2: {
                    id: this.playerId,
                    name: this.playerName
                },
                updatedAt: new Date().toISOString()
            });

            // ゲームドキュメントを作成
            await this.createGameDocument();

        } catch (error) {
            console.error('マッチ参加エラー:', error);
            throw error;
        }
    }

    async createGameDocument() {
        const gameRef = doc(this.db, 'games', this.matchId);
        const matchDoc = await getDoc(doc(this.db, 'matches', this.matchId));
        const matchData = matchDoc.data();

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
            turnTime: 60,
            createdAt: new Date().toISOString()
        };

        await setDoc(gameRef, initialGameState);
    }

    watchMatchStatus() {
        const matchRef = doc(this.db, 'matches', this.matchId);
        
        this.unsubscribe = onSnapshot(matchRef, (snapshot) => {
            if (snapshot.exists()) {
                const matchData = snapshot.data();
                
                if (matchData.status === 'matched') {
                    this.hideMatchingOverlay();
                    const gameUrl = new URL('../taisen.html', window.location.href);
                    gameUrl.searchParams.set('gameId', this.matchId);
                    gameUrl.searchParams.set('playerId', this.playerId);
                    window.location.href = gameUrl.toString();
                }
            }
        });
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
    
    window.addEventListener('beforeunload', () => {
        matchingSystem.cleanup();
    });
});