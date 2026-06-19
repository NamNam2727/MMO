// =========================================================
// skill_db.js
// スキル効果のマスターデータおよび動的計算処理
// =========================================================

window.SKILL_EFFECT_DB = {
    'atk_up': {
        name: '攻撃倍率',
        showSign: true,       
        suffix: '%',          
        allowNegative: false  
    },
    'range_up': {
        name: 'スキル射程延長', // ターゲット指定できる距離の延長
        showSign: true,
        suffix: '',
        allowNegative: true   
    },
    'area_up': {
        name: 'スキル範囲拡張', // 円範囲スキルの巻き込み範囲(半径)の拡大
        showSign: true,
        suffix: '',
        allowNegative: true
    },
    'heal': {
        name: '回復',
        showSign: false,      
        suffix: '%',
        allowNegative: false
    },
    'ice': {
        name: '氷属性',
        showSign: false,
        suffix: '',
        allowNegative: false,
        isValueHidden: true
    }
};

// --- 共通のテキスト自動フォーマット関数 ---
window.getEffectText = function(eff) {
    const dbData = window.SKILL_EFFECT_DB[eff.type];
    if (!dbData) return `不明な効果(${eff.type})`;

    if (dbData.isValueHidden) {
        return dbData.name;
    }

    let sign = '';
    if (dbData.showSign) {
        sign = eff.value > 0 ? '+' : ''; 
    }
    
    return `${dbData.name}${sign}${eff.value}${dbData.suffix}`;
};

// =========================================================
// スキルの動的計算処理
// =========================================================

// スキルアイテムから、現在のITEM_DBを参照してパラメータの合計値を計算する
window.getCalculatedSkillData = function(skillItem) {
    if (!skillItem || !skillItem.skillData || !skillItem.skillData.baseChipId) {
        // 旧データ互換用 (targetTypeとareaTypeのデフォルト値を追加)
        const oldData = skillItem.skillData || { cost: 0, dependency: 'str', effects: [] };
        if (!oldData.targetType) oldData.targetType = 'enemy';
        if (!oldData.areaType) oldData.areaType = 'single';
        return oldData;
    }
    
    const baseChip = window.ITEM_DB[skillItem.skillData.baseChipId];
    let totalCost = 0;
    let dependency = 'str';
    let targetType = 'enemy';
    let areaType = 'single';
    let mergedEffects = {};
    
    if (baseChip && baseChip.chipData) {
        dependency = baseChip.chipData.dependency || 'str';
        targetType = baseChip.chipData.targetType || 'enemy';
        areaType = baseChip.chipData.areaType || 'single';
    }
    
    if (skillItem.skillData.materials) {
        skillItem.skillData.materials.forEach(matId => {
            const mat = window.ITEM_DB[matId];
            if (mat && mat.materialData) {
                totalCost += mat.materialData.cost;
                if (mat.materialData.effects) {
                    mat.materialData.effects.forEach(eff => {
                        if(!mergedEffects[eff.type]) mergedEffects[eff.type] = 0;
                        mergedEffects[eff.type] += eff.value;
                    });
                }
            }
        });
    }
    
    const finalEffects = Object.keys(mergedEffects).map(k => ({ type: k, value: mergedEffects[k] }));
    
    return {
        cost: totalCost,
        dependency: dependency,
        targetType: targetType,
        areaType: areaType,
        effects: finalEffects
    };
};

// スキルアイテムから、現在のITEM_DBを参照して説明文(desc)を動的に生成する
window.getCalculatedSkillDesc = function(skillItem) {
    if (!skillItem.skillData || !skillItem.skillData.baseChipId) {
        return skillItem.desc || "";
    }

    const calcData = window.getCalculatedSkillData(skillItem);
    const depText = calcData.dependency === 'str' ? 'ちから' : calcData.dependency === 'int' ? 'まりょく' : 'なし';
    
    // 対象と範囲のテキスト変換
    let targetText = '敵';
    if (calcData.targetType === 'self') targetText = '自身';
    if (calcData.targetType === 'ally') targetText = '味方';
    
    let areaText = calcData.areaType === 'circle' ? '円範囲' : '単体';

    const effectTexts = calcData.effects.map(e => window.getEffectText(e));
    
    return `対象:${targetText}(${areaText})\nコスト:${calcData.cost} 依存:${depText}\n【効果】\n${effectTexts.length > 0 ? effectTexts.map(t=>'・'+t).join('\n') : 'なし'}`;
};
