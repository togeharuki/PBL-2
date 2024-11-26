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
        this.isMatchFound = false;

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

            // 既存の待機中マッチを探す
            const availableMatch = await this.findAvailableMatch();
            
            if (availableMatch) {
                // 既存マッチに参加
                this.matchId = availableMatch.id;
                await this.joinMatch(availableMatch.ref);
            } else {
                // 新規マッチ作成
                await this.createNewMatch();
            }

            // マッチングの監視開始
            this.watchMatchStatus();

        } catch (error) {
            console.error('マッチングエラー:', error);
            this.hideMatchingOverlay();
            alert('マッチングに失敗しました。再度お試しください。');
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

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ref: doc.ref, data: doc.data() };
        }
        return null;
    }

    async createNewMatch() {
        const matchRef = doc(collection(this.db, 'matches'));
        this.matchId = matchRef.id;

        const matchData = {
            status: 'waiting',
            createdAt: new Date().toISOString(),
            player1: {
                id: this.playerId,
                name: this.playerName
            },
            player2: null,
            isGameReady: false
        };

        await setDoc(matchRef, matchData);
        console.log('新規マッチ作成:', this.matchId);
    }

    async joinMatch(matchRef) {
        try {
            // トランザクションを使用して競合を防ぐ
            const matchDoc = await getDoc(matchRef);
            const matchData = matchDoc.data();

            if (matchData.status !== 'waiting') {
                throw new Error('このマッチは既に埋まっています');
            }

            await updateDoc(matchRef, {
                status: 'matched',
                player2: {
                    id: this.playerId,
                    name: this.playerName
                },
                updatedAt: new Date().toISOString()
            });

            // ゲームドキュメント作成
            await this.createGameDocument();
            this.isMatchFound = true;

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

        // マッチのステータスを更新
        const matchRef = doc(this.db, 'matches', this.matchId);
        await updateDoc(matchRef, {
            isGameReady: true
        });
    }

    watchMatchStatus() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const matchRef = doc(this.db, 'matches', this.matchId);
        
        this.unsubscribe = onSnapshot(matchRef, (snapshot) => {
            if (snapshot.exists()) {
                const matchData = snapshot.data();
                
                if ((matchData.status === 'matched' && matchData.isGameReady) || 
                    (this.isMatchFound && matchData.isGameReady)) {
                    this.hideMatchingOverlay();
                    this.redirectToGame();
                }
            }
        });
    }

    redirectToGame() {
        const gameUrl = new URL('../taisen.html', window.location.href);
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
    
    window.addEventListener('beforeunload', () => {
        matchingSystem.cleanup();
    });
});