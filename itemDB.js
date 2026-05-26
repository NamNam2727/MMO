// =========================================================
// itemDB.js
// アイテムのマスターデータとレアリティ設定
// =========================================================

// レアリティ設定
window.RARITY = { 
    Common: { color: '#ffffff' }, 
    Uncommon: { color: '#00ff00' }, 
    Rare: { color: '#0000ff' }, 
    Epic: { color: '#800080' }, 
    Legend: { color: '#ffa500' } 
};

// アイテムマスターデータ
window.ITEM_DB = {
    'sword_wood': { 
        id: 'sword_wood', type: 'equip', equipSlot: 'weapon', name: '木の剣', 
        rarity: 'Common', maxStack: 1, color: '#8b4513', desc: '粗末な木の剣。', stats: { atk: 5 } 
    },
    'armor_leather': { 
        id: 'armor_leather', type: 'equip', equipSlot: 'armor', name: '革の鎧', 
        rarity: 'Uncommon', maxStack: 1, color: '#a0522d', desc: '少し丈夫な鎧。', stats: { hp: 20 } 
    },
    'potion_small': { 
        id: 'potion_small', type: 'consume', name: '小型ポーション', 
        rarity: 'Common', maxStack: 99, color: '#00ff00', desc: 'HPを30回復する。', restore: 30 
    },
    'slime_jelly': { 
        id: 'slime_jelly', type: 'etc', name: 'スライムの粘液', 
        rarity: 'Common', maxStack: 99, color: '#00aaaa', desc: 'ベタベタする素材。' 
    }
};