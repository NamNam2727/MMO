// =========================================================
// enemy/plains.js
// グライム平原に出現する敵のデータを定義する
// =========================================================

window.ENEMY_DB = window.ENEMY_DB || {};

window.ENEMY_DB['grime_01'] = {
    name: 'グライム',
    type: 'passive',      // こちらから攻撃しないと襲ってこない
    color: '#33ccff',     
    
    // ★追加: 敵の画像パスを指定
    imageUrl: 'enemy/pic/grime.PNG',

    radius: 15,           // 当たり判定の大きさ
    
    speed: 30,            // 歩くスピード（遅め）
    attackRange: 40,      // 攻撃が届く距離
    attackRate: 2.0,      // 2秒に1回攻撃（遅め）
    
    element: 'earth',     // 地属性（地属性の状態異常を与え、プレイヤーからの地属性を無効化）

    // --- ベースステータス (Lv1の時の数値) ---
    baseHp: 30,           
    baseAtk: 4,           
    baseArmor: 0,         
    baseExp: 10,          
    
    // --- ドロップアイテム (確率設定) ---
    dropTable: [
        // ★追加: グライムゼリーを75%の確率でドロップ
        { id: 'grime_jelly', chance: 0.75 } 
    ],

    // --- 特殊行動 (AIロジック) ---
    customUpdate: null
};
