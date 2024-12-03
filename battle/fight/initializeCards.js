import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig.js';

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// カードデータ
const cards = [
    // バトルカード（攻撃）
    ...Array(10).fill().map((_, i) => ({
        type: 'battle',
        value: i + 1,
        effect: 'damage',
        name: `攻撃カード${i + 1}`
    })),
    // バトルカード（回復）
    ...Array(5).fill().map((_, i) => ({
        type: 'battle',
        value: i + 1,
        effect: 'heal',
        name: `回復カード${i + 1}`
    })),
    // 効果カード
    {
        type: 'effect',
        value: 0,
        effect: 'draw',
        name: 'ドローカード'
    },
    {
        type: 'effect',
        value: 0,
        effect: 'reveal',
        name: '手札確認'
    },
    {
        type: 'effect',
        value: 2,
        effect: 'boost',
        name: '強化カード'
    },
    // 神の一手カード
    {
        type: 'god',
        value: 5,
        effect: 'damage_boost',
        name: '神の一撃'
    },
    {
        type: 'god',
        value: 0,
        effect: 'discard_hand',
        name: '手札破棄'
    },
    {
        type: 'god',
        value: 0,
        effect: 'nullify',
        name: 'ダメージ無効'
    }
];

// カードをFirestoreに追加
async function initializeCards() {
    try {
        const deckRef = collection(db, 'deck');
        for (const card of cards) {
            await addDoc(deckRef, card);
        }
        console.log('カードの初期化が完了しました');
    } catch (error) {
        console.error('カードの初期化中にエラーが発生しました:', error);
    }
}

initializeCards(); 