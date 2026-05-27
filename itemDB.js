// =========================================================
// itemDB.js
// アイテムのマスターデータとレアリティ設定
// =========================================================

// レアリティ設定
window.RARITY = { 
    Common: { color: '#ffffff' }, 
    Uncommon: { color: '#00ff00' }, 
    Rare: { color: '#00bfff' }, // ★修正: 見やすい水色に変更
    Epic: { color: '#800080' }, 
    Legend: { color: '#ffa500' } 
};

// アイテムマスターデータ
window.ITEM_DB = {
    // --- 武器 ---
    'sword_wood': { 
        id: 'sword_wood', type: 'equip', equipSlot: 'weapon', name: '木の剣', 
        rarity: 'Common', maxStack: 1, color: '#8b4513', desc: '粗末な木の剣。', stats: { atk: 5 } 
    },
    'sword_fire': { 
        id: 'sword_fire', type: 'equip', equipSlot: 'weapon', name: '火の剣', 
        rarity: 'Rare', maxStack: 1, color: '#ff4444', desc: '炎を纏った剣。敵を炎上させる。', 
        stats: { atk: 10 }, element: 'fire', elementParams: { duration: 3.0, dmgRatio: 0.2 } 
    },
    'sword_ice': { 
        id: 'sword_ice', type: 'equip', equipSlot: 'weapon', name: '氷の剣', 
        rarity: 'Rare', maxStack: 1, color: '#4444ff', desc: '冷気を放つ剣。敵を凍結させる。', 
        stats: { atk: 10 }, element: 'ice', elementParams: { duration: 2.0 } 
    },
    'sword_lightning': { 
        id: 'sword_lightning', type: 'equip', equipSlot: 'weapon', name: '雷の剣', 
        rarity: 'Rare', maxStack: 1, color: '#ffff44', desc: '稲妻を帯びた剣。敵を感電させる。', 
        stats: { atk: 10 }, element: 'lightning', elementParams: { duration: 3.0 } 
    },
    'bow_wind': { 
        id: 'bow_wind', type: 'equip', equipSlot: 'weapon', name: '風の弓', 
        rarity: 'Rare', maxStack: 1, color: '#44ff44', desc: '疾風の弓。遠くから敵を吹き飛ばす。', 
        stats: { atk: 10, attackRange: 250 }, element: 'wind', elementParams: { duration: 0.5, distance: 30 } 
    },

    // --- 防具 ---
    'armor_leather': { 
        id: 'armor_leather', type: 'equip', equipSlot: 'armor', name: '革の鎧', 
        rarity: 'Uncommon', maxStack: 1, color: '#a0522d', desc: '少し丈夫な鎧。', stats: { armor: 10 } 
    },
    'armor_iron': { 
        id: 'armor_iron', type: 'equip', equipSlot: 'armor', name: '鉄の鎧', 
        rarity: 'Rare', maxStack: 1, color: '#aaaaaa', desc: '硬い鉄の鎧。火属性耐性。', 
        stats: { armor: 50 }, resists: ['fire'] 
    },

    // --- 消費・素材 ---
    'potion_small': { 
        id: 'potion_small', type: 'consume', name: '小型ポーション', 
        rarity: 'Common', maxStack: 99, color: '#00ff00', desc: 'HPを30回復する。', restore: 30 
    },
    'slime_jelly': { 
        id: 'slime_jelly', type: 'etc', name: 'スライムの粘液', 
        rarity: 'Common', maxStack: 99, color: '#00aaaa', desc: 'ベタベタする素材。' 
    }
};
