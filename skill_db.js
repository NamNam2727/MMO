// =========================================================
// skill_db.js
// スキル効果のマスターデータ
// =========================================================

window.SKILL_EFFECT_DB = {
    'atk_up': {
        name: '攻撃倍率',
        showSign: true,       // 符号(+/-)を表示する
        suffix: '%',          // 数値の後ろにつける単位
        allowNegative: false  // 合計値がマイナスになることを許可するか（falseなら作成不可）
    },
    'range_up': {
        name: '射程',
        showSign: true,
        suffix: '',
        allowNegative: true   // 射程減を許可
    },
    'heal': {
        name: '回復',
        showSign: false,      // 回復には符号をつけない
        suffix: '%',
        allowNegative: false
    },
    'target_self': {
        name: '対象変更<自身>',
        showSign: false,
        suffix: '',
        allowNegative: false,
        isValueHidden: true   // テキスト表示時に数値を隠す特殊フラグ
    },
    'area_self': {
        name: '効果範囲<自身周囲>',
        showSign: true,
        suffix: '',
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
        sign = eff.value > 0 ? '+' : ''; // マイナス値の場合は自動で '-' がつくため '+' のみ判定
    }
    
    // 例: "攻撃倍率+10%" または "攻撃倍率-50%"
    return `${dbData.name}${sign}${eff.value}${dbData.suffix}`;
};
