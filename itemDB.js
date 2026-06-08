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
    },

    // ==========================================
    // ★追加: スキル作成用のチップとETC素材
    // ==========================================
    'chip_test_str': { 
        id: 'chip_test_str', type: 'consume', name: '力チップ(テスト)', 
        rarity: 'Epic', maxStack: 99, color: '#aa5500', desc: 'ちから依存スキルのベース\n(最大容量: 20)', 
        chipData: { capacity: 20, dependency: 'str' } 
    },
    'chip_test_int': { 
        id: 'chip_test_int', type: 'consume', name: '魔力チップ(テスト)', 
        rarity: 'Epic', maxStack: 99, color: '#5500aa', desc: 'まりょく依存スキルのベース\n(最大容量: 20)', 
        chipData: { capacity: 20, dependency: 'int' } 
    },
    
    // ETC素材は desc を後から自動生成するため省略
    'etc_atk_up': { 
        id: 'etc_atk_up', type: 'etc', name: '素材:攻撃倍率+10%', rarity: 'Common', maxStack: 99, color: '#ffaaaa', 
        materialData: { cost: 2, effects: [{type: 'atk_up', value: 10}] } 
    },
    'etc_range_up': { 
        id: 'etc_range_up', type: 'etc', name: '素材:射程+5', rarity: 'Common', maxStack: 99, color: '#aaffaa', 
        materialData: { cost: 2, effects: [{type: 'range_up', value: 5}] } 
    },
    'etc_heal': { 
        id: 'etc_heal', type: 'etc', name: '素材:回復30%', rarity: 'Rare', maxStack: 99, color: '#aaffff', 
        materialData: { cost: 6, dependency: 'int', effects: [{type: 'heal', value: 30}] } 
    },
    'etc_target_self': { 
        id: 'etc_target_self', type: 'etc', name: '素材:対象変更<自身>', rarity: 'Common', maxStack: 99, color: '#ffffaa', 
        materialData: { cost: 0, effects: [{type: 'target_self', value: 1}] } 
    },
    'etc_area_self': { 
        id: 'etc_area_self', type: 'etc', name: '素材:効果範囲<自身周囲>', rarity: 'Uncommon', maxStack: 99, color: '#ffaaff', 
        materialData: { cost: 4, effects: [{type: 'area_self', value: 5}] } 
    },
    'etc_ice': { 
        id: 'etc_ice', type: 'etc', name: '素材:氷属性', rarity: 'Rare', maxStack: 99, color: '#aaaaff', 
        materialData: { cost: 4, effects: [{type: 'ice', value: 1}] } 
    }
};

// ==========================================
// 初期化時にETCアイテムのdescを自動生成
// ==========================================
for (const id in window.ITEM_DB) {
    const item = window.ITEM_DB[id];
    if (item.type === 'etc' && item.materialData && item.materialData.effects) {
        // skill_db.js の getEffectText を使用してテキスト化
        const effTexts = item.materialData.effects.map(e => {
            if (typeof window.getEffectText === 'function') {
                return window.getEffectText(e);
            }
            return '不明な効果';
        });
        
        let depText = item.materialData.dependency === 'int' ? '(魔力依存)' : 
                      item.materialData.dependency === 'str' ? '(力依存)' : '';
        
        item.desc = `${effTexts.join(', ')}${depText}\nコスト${item.materialData.cost}`;
    }
}
