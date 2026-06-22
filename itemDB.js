// =========================================================
// itemDB.js
// アイテムのマスターデータとレアリティ設定、および動的生成
// =========================================================

// レアリティ設定
window.RARITY = { 
    Common: { color: '#ffffff' }, 
    Uncommon: { color: '#00ff00' }, 
    Rare: { color: '#00bfff' }, 
    Epic: { color: '#800080' }, 
    Legend: { color: '#ffa500' } 
};

// ★追加: レアリティによる価格と容量の変動倍率テーブル
window.RARITY_RATES = {
    Common: { price: 1, capacity: 1 },
    Uncommon: { price: 5, capacity: 2 },
    Rare: { price: 25, capacity: 3 },
    Epic: { price: 125, capacity: 4 },
    Legend: { price: 625, capacity: 5 }
};

// アイテムマスターデータ（すべての基礎値として Common 相当のステータスを設定します）
window.ITEM_DB = {
    // --- 武器 ---
    'sword_wood': { 
        id: 'sword_wood', type: 'equip', equipSlot: 'weapon', name: '木の剣', 
        rarity: 'Common', maxStack: 1, color: '#8b4513', desc: '粗末な木の剣。', stats: { atk: 5 }, price: 100 
    },
    'sword_fire': { 
        id: 'sword_fire', type: 'equip', equipSlot: 'weapon', name: '火の剣', 
        rarity: 'Rare', maxStack: 1, color: '#ff4444', desc: '炎を纏った剣。敵を炎上させる。', 
        stats: { atk: 10 }, element: 'fire', elementParams: { duration: 3.0, dmgRatio: 0.2 }, price: 500 
    },
    'sword_ice': { 
        id: 'sword_ice', type: 'equip', equipSlot: 'weapon', name: '氷の剣', 
        rarity: 'Rare', maxStack: 1, color: '#4444ff', desc: '冷気を放つ剣。敵を凍結させる。', 
        stats: { atk: 10 }, element: 'ice', elementParams: { duration: 2.0 }, price: 500 
    },
    'sword_lightning': { 
        id: 'sword_lightning', type: 'equip', equipSlot: 'weapon', name: '雷の剣', 
        rarity: 'Rare', maxStack: 1, color: '#ffff44', desc: '稲妻を帯びた剣。敵を感電させる。', 
        stats: { atk: 10 }, element: 'lightning', elementParams: { duration: 3.0 }, price: 500 
    },
    'bow_wind': { 
        id: 'bow_wind', type: 'equip', equipSlot: 'weapon', name: '風の弓', 
        rarity: 'Rare', maxStack: 1, color: '#44ff44', desc: '疾風の弓。遠くから敵を吹き飛ばす。', 
        stats: { atk: 10, attackRange: 250 }, element: 'wind', elementParams: { duration: 0.5, distance: 30 }, price: 500 
    },

    // --- 防具 ---
    'armor_leather': { 
        id: 'armor_leather', type: 'equip', equipSlot: 'armor', name: '革の鎧', 
        rarity: 'Uncommon', maxStack: 1, color: '#a0522d', desc: '少し丈夫な鎧。', stats: { armor: 10 }, price: 200 
    },
    'armor_iron': { 
        id: 'armor_iron', type: 'equip', equipSlot: 'armor', name: '鉄の鎧', 
        rarity: 'Rare', maxStack: 1, color: '#aaaaaa', desc: '硬い鉄の鎧。火属性耐性。', 
        stats: { armor: 50 }, resists: ['fire'], price: 1000 
    },

    // --- 消費・素材 ---
    'potion_small': { 
        id: 'potion_small', type: 'consume', name: '小型ポーション', 
        rarity: 'Common', maxStack: 99, color: '#00ff00', desc: 'HPを30回復する。', restore: 30, price: 50 
    },
    'slime_jelly': { 
        id: 'slime_jelly', type: 'etc', name: 'スライムの粘液', 
        rarity: 'Common', maxStack: 99, color: '#00aaaa', desc: 'ベタベタする素材。', price: 10 
    },

    // ==========================================
    // ベースチップ（★修正: すべてCommon時の基礎ステータスに設定）
    // ==========================================
    'chip_enemy_single_str': { 
        id: 'chip_enemy_single_str', type: 'consume', name: '単体チップ(ちから)', 
        rarity: 'Common', maxStack: 99, color: '#aa5500', baseDesc: 'ちから依存/敵単体', 
        chipData: { capacity: 5, dependency: 'str', targetType: 'enemy', areaType: 'single' }, price: 40 
    },
    'chip_enemy_single_int': { 
        id: 'chip_enemy_single_int', type: 'consume', name: '単体チップ(まりょく)', 
        rarity: 'Common', maxStack: 99, color: '#5500aa', baseDesc: 'まりょく依存/敵単体', 
        chipData: { capacity: 5, dependency: 'int', targetType: 'enemy', areaType: 'single' }, price: 50 
    },
    'chip_enemy_circle_str': { 
        id: 'chip_enemy_circle_str', type: 'consume', name: '円範囲チップ(ちから)', 
        rarity: 'Common', maxStack: 99, color: '#cc6600', baseDesc: 'ちから依存/敵円範囲', 
        chipData: { capacity: 8, dependency: 'str', targetType: 'enemy', areaType: 'circle' }, price: 100 
    },
    'chip_enemy_circle_int': { 
        id: 'chip_enemy_circle_int', type: 'consume', name: '円範囲チップ(まりょく)', 
        rarity: 'Common', maxStack: 99, color: '#6600cc', baseDesc: 'まりょく依存/敵円範囲', 
        chipData: { capacity: 8, dependency: 'int', targetType: 'enemy', areaType: 'circle' }, price: 120 
    },
    'chip_self_str': { 
        id: 'chip_self_str', type: 'consume', name: '自身チップ(ちから)', 
        rarity: 'Common', maxStack: 99, color: '#aa8800', baseDesc: 'ちから依存/自身対象', 
        chipData: { capacity: 5, dependency: 'str', targetType: 'self', areaType: 'single' }, price: 40 
    },
    'chip_self_int': { 
        id: 'chip_self_int', type: 'consume', name: '自身チップ(まりょく)', 
        rarity: 'Common', maxStack: 99, color: '#00aa77', baseDesc: 'まりょく依存/自身対象', 
        chipData: { capacity: 5, dependency: 'int', targetType: 'self', areaType: 'single' }, price: 40 
    },
    'chip_ally_single_int': { 
        id: 'chip_ally_single_int', type: 'consume', name: '味方単体チップ(まりょく)', 
        rarity: 'Common', maxStack: 99, color: '#00aa55', baseDesc: 'まりょく依存/味方単体', 
        chipData: { capacity: 5, dependency: 'int', targetType: 'ally', areaType: 'single' }, price: 50 
    },
    'chip_ally_circle_int': { 
        id: 'chip_ally_circle_int', type: 'consume', name: '味方円範囲チップ(まりょく)', 
        rarity: 'Common', maxStack: 99, color: '#00cc66', baseDesc: 'まりょく依存/味方円範囲', 
        chipData: { capacity: 8, dependency: 'int', targetType: 'ally', areaType: 'circle' }, price: 100 
    },
    
    // ==========================================
    // ETC素材
    // ==========================================
    'etc_atk_up': { 
        id: 'etc_atk_up', type: 'etc', name: '素材:攻撃倍率+10%', rarity: 'Common', maxStack: 99, color: '#ffaaaa', 
        materialData: { cost: 2, effects: [{type: 'atk_up', value: 10}] }, price: 200 
    },
    'etc_range_up': { 
        id: 'etc_range_up', type: 'etc', name: '素材:スキル射程延長', rarity: 'Common', maxStack: 99, color: '#aaffaa', 
        materialData: { cost: 2, effects: [{type: 'range_up', value: 5}] }, price: 200 
    },
    'etc_area_up': { 
        id: 'etc_area_up', type: 'etc', name: '素材:スキル範囲拡張', rarity: 'Uncommon', maxStack: 99, color: '#ffaaff', 
        materialData: { cost: 4, effects: [{type: 'area_up', value: 5}] }, price: 400 
    },
    'etc_heal': { 
        id: 'etc_heal', type: 'etc', name: '素材:回復30%', rarity: 'Rare', maxStack: 99, color: '#aaffff', 
        materialData: { cost: 6, dependency: 'int', effects: [{type: 'heal', value: 30}] }, price: 600 
    },
    'etc_ice': { 
        id: 'etc_ice', type: 'etc', name: '素材:氷属性', rarity: 'Rare', maxStack: 99, color: '#aaaaff', 
        materialData: { cost: 4, effects: [{type: 'ice', value: 1}] }, price: 500 
    },
    'grime_jelly': { 
        id: 'grime_jelly', type: 'etc', name: 'グライムゼリー', rarity: 'Common', maxStack: 99, color: '#33ccff', 
        materialData: { cost: 1, dependency: 'int', effects: [{type: 'heal', value: 5}] }, price: 30 
    }
};

// ==========================================
// ★新機能: レアリティを指定して動的アイテムを生成する関数
// ==========================================
window.createItemWithRarity = function(itemId, targetRarity) {
    const baseItem = window.ITEM_DB[itemId];
    if (!baseItem) return null;
    
    // ベースをディープコピー
    let newItem = JSON.parse(JSON.stringify(baseItem));
    
    // 対象外のアイテムか、レアリティ指定がない場合は説明文を構築してそのまま返す
    if (!targetRarity || (newItem.type !== 'equip' && !(newItem.type === 'consume' && newItem.chipData))) {
        if (newItem.type === 'consume' && newItem.chipData) {
            newItem.desc = `${newItem.baseDesc || ''}\n(最大容量: ${newItem.chipData.capacity})`;
        }
        return newItem;
    }
    
    const rate = window.RARITY_RATES[targetRarity];
    if (rate) {
        newItem.rarity = targetRarity;
        
        // 価格変動
        if (newItem.price) {
            newItem.price = Math.floor(newItem.price * rate.price);
        }
        
        // スキルチップの容量変動
        if (newItem.type === 'consume' && newItem.chipData) {
            newItem.chipData.capacity = Math.floor(newItem.chipData.capacity * rate.capacity);
        }
    }
    
    // スキルチップの場合は説明文を再構築
    if (newItem.type === 'consume' && newItem.chipData) {
        newItem.desc = `${newItem.baseDesc || ''}\n(最大容量: ${newItem.chipData.capacity})`;
    }
    
    return newItem;
};

// ==========================================
// 初期化時にETCとチップアイテムのdescを自動生成
// ==========================================
for (const id in window.ITEM_DB) {
    const item = window.ITEM_DB[id];
    if (item.type === 'etc' && item.materialData && item.materialData.effects) {
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
    // チップアイテムの初期desc生成
    if (item.type === 'consume' && item.chipData) {
        item.desc = `${item.baseDesc || ''}\n(最大容量: ${item.chipData.capacity})`;
    }
}
