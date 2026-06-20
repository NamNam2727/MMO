// =========================================================
// maps/town/npc1.js
// はじまりの街に配置するNPCのデータを定義する
// =========================================================

// ENEMY_DB とは別に、友好的なNPC用のデータベースを用意します
window.NPC_DB = window.NPC_DB || {};

window.NPC_DB['town_merchant_1'] = {
    name: '商人',
    type: 'npc',          // ★重要: npcタイプは攻撃できないように制御します
    color: '#ffaa00',     // 黄色っぽい色
    radius: 15,
    
    // 商人の画像URLがあれば指定
    imageUrl: '', 
    
    // 話しかけた（タップした）時のイベント処理
    interact: function(npc, player) {
        if (typeof window.addLog === 'function') {
            window.addLog(`<span class='color-sys'>商人: 「いらっしゃい！何か買っていくかい？」</span>`, 'sys');
        }
        
        // ★次回作成するショップUIを開く処理を呼び出す
        if (typeof window.openShopWindow === 'function') {
            window.openShopWindow(npc);
        }
    },

    // この商人が販売しているアイテムのIDリスト
    shopItems: [
        'potion_small',
        'sword_wood',
        'armor_leather'
    ]
};
