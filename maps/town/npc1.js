// =========================================================
// maps/town/npc1.js
// はじまりの街に配置するNPCのデータを定義する
// =========================================================

window.NPC_DB = window.NPC_DB || {};

window.NPC_DB['town_merchant_1'] = {
    name: '商人',
    type: 'npc',          
    color: '#ffaa00',     
    radius: 15,
    imageUrl: '', 
    
    interact: function(npc, player) {
        if (typeof window.addLog === 'function') {
            window.addLog(`<span class='color-sys'>商人: 「いらっしゃい！何か買っていくかい？」</span>`, 'sys');
        }
        if (typeof window.openShopWindow === 'function') {
            window.openShopWindow(npc);
        }
    },

    // ★修正: オブジェクト形式でレアリティ(rarity)を指定できるようにしました
    shopItems: [
        'potion_small',    // 文字列だけの指定も今まで通り可能
        'sword_wood',
        { id: 'sword_fire', rarity: 'Uncommon' }, // レアリティ指定販売
        { id: 'chip_enemy_single_str', rarity: 'Uncommon' },
        { id: 'chip_enemy_single_int', rarity: 'Uncommon' },
        { id: 'chip_self_str', rarity: 'Uncommon' },
        'etc_atk_up',
        'etc_heal'
    ]
};
