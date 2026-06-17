// =========================================================
// status_ui.js
// ステータス画面のUI更新、仮振り計算、確定処理を管理
// =========================================================

window.tempStats = { str: 0, int: 0, vit: 0 }; // 仮振り用のステータス保持

window.getRemainingPoints = function() { 
    if (!window.player) return 0;
    return window.player.statPoints - (window.tempStats.str + window.tempStats.int + window.tempStats.vit); 
};

window.updateStatusUI = function() {
    if (!window.player) return;
    const player = window.player;
    const tempStats = window.tempStats;

    document.getElementById('statLvNum').innerText = player.level;
    document.getElementById('statExp').innerText = player.exp;
    document.getElementById('statNextExp').innerText = player.nextExp;
    document.getElementById('statPoints').innerText = player.statPoints;
    
    const remainingPoints = window.getRemainingPoints();
    document.getElementById('statPointsPreview').innerText = remainingPoints;

    document.getElementById('statStr').innerText = player.stats.str;
    document.getElementById('tempStr').innerText = tempStats.str > 0 ? `+${tempStats.str}` : '';
    document.getElementById('statInt').innerText = player.stats.int;
    document.getElementById('tempInt').innerText = tempStats.int > 0 ? `+${tempStats.int}` : '';
    document.getElementById('statVit').innerText = player.stats.vit;
    document.getElementById('tempVit').innerText = tempStats.vit > 0 ? `+${tempStats.vit}` : '';

    const previewStr = player.stats.str + tempStats.str;
    const previewInt = player.stats.int + tempStats.int;
    const previewVit = player.stats.vit + tempStats.vit;

    // HP・MP・攻撃力の予測計算
    let previewMaxHp = player.baseHp + (previewVit * 10);
    if (player.equipped.armor && player.equipped.armor.stats && player.equipped.armor.stats.hp) previewMaxHp += player.equipped.armor.stats.hp;
    
    let previewMaxMp = player.baseMp + (previewInt * 5);
    
    let previewAtk = player.baseAtk + (previewStr * 2);
    if (player.equipped.weapon && player.equipped.weapon.stats && player.equipped.weapon.stats.atk) previewAtk += player.equipped.weapon.stats.atk;
    
    let previewMatk = player.baseMatk + (previewInt * 2);

    // テキスト反映
    document.getElementById('valHp').innerText = `${Math.floor(player.hp)} / ${player.maxHp}`;
    document.getElementById('previewHp').innerText = tempStats.vit > 0 ? `(-> ${previewMaxHp})` : '';
    
    document.getElementById('valMp').innerText = `${Math.floor(player.mp)} / ${player.maxMp}`;
    document.getElementById('previewMp').innerText = tempStats.int > 0 ? `(-> ${previewMaxMp})` : '';
    
    document.getElementById('valAtk').innerText = player.atk;
    document.getElementById('previewAtk').innerText = tempStats.str > 0 ? `(-> ${previewAtk})` : '';
    
    document.getElementById('valMatk').innerText = player.matk;
    document.getElementById('previewMatk').innerText = tempStats.int > 0 ? `(-> ${previewMatk})` : '';
    
    document.getElementById('valArmor').innerText = player.armor;
    
    const mitigation = (player.armor / (100 + player.armor)) * 100;
    document.getElementById('valMitigation').innerText = mitigation.toFixed(1);

    // 装備属性と耐性
    let elementText = "なし";
    if (player.equipped.weapon && player.equipped.weapon.element) {
        const trans = { 'fire':'火', 'ice':'氷', 'lightning':'雷', 'wind':'風', 'earth':'地' };
        elementText = trans[player.equipped.weapon.element] || player.equipped.weapon.element;
    }
    
    let resistsText = "なし";
    if (player.equipped.armor && player.equipped.armor.resists) {
        const trans = { 'fire':'火', 'ice':'氷', 'lightning':'雷', 'wind':'風', 'earth':'地' };
        resistsText = player.equipped.armor.resists.map(r => trans[r] || r).join(', ');
    }
    
    const valElementsNode = document.getElementById('valElements');
    if(valElementsNode) {
        valElementsNode.innerHTML = `武器属性: ${elementText}<br>耐性: ${resistsText}`;
    }

    // ボタンの有効・無効切り替え
    const hasPoints = remainingPoints > 0;
    document.getElementById('btnAddStr').disabled = !hasPoints;
    document.getElementById('btnAddInt').disabled = !hasPoints;
    document.getElementById('btnAddVit').disabled = !hasPoints;
    
    document.getElementById('btnSubStr').disabled = tempStats.str <= 0;
    document.getElementById('btnSubInt').disabled = tempStats.int <= 0;
    document.getElementById('btnSubVit').disabled = tempStats.vit <= 0;

    const isDirty = tempStats.str > 0 || tempStats.int > 0 || tempStats.vit > 0;
    document.getElementById('btnConfirmStats').disabled = !isDirty;
    document.getElementById('btnResetStats').disabled = !isDirty;
};

// ==========================================
// ボタン等のイベント登録 (ui.js の initUI() から呼ばれる)
// ==========================================
window.initStatusUI = function() {
    // ＋ボタン
    document.getElementById('btnAddStr').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.getRemainingPoints() > 0){ window.tempStats.str++; window.updateStatusUI(); } });
    document.getElementById('btnAddInt').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.getRemainingPoints() > 0){ window.tempStats.int++; window.updateStatusUI(); } });
    document.getElementById('btnAddVit').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.getRemainingPoints() > 0){ window.tempStats.vit++; window.updateStatusUI(); } });

    // ーボタン
    document.getElementById('btnSubStr').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.tempStats.str>0){window.tempStats.str--; window.updateStatusUI();} });
    document.getElementById('btnSubInt').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.tempStats.int>0){window.tempStats.int--; window.updateStatusUI();} });
    document.getElementById('btnSubVit').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.tempStats.vit>0){window.tempStats.vit--; window.updateStatusUI();} });

    // リセット・確定ボタン
    document.getElementById('btnResetStats').addEventListener('pointerdown', (e) => { e.stopPropagation(); window.tempStats = {str:0, int:0, vit:0}; window.updateStatusUI(); });
    document.getElementById('btnConfirmStats').addEventListener('pointerdown', (e) => { 
        e.stopPropagation(); 
        const totalSpent = window.tempStats.str + window.tempStats.int + window.tempStats.vit;
        if (totalSpent > 0 && window.player.statPoints >= totalSpent) {
            window.player.stats.str += window.tempStats.str; 
            window.player.stats.int += window.tempStats.int; 
            window.player.stats.vit += window.tempStats.vit;
            window.player.statPoints -= totalSpent; 
            window.tempStats = {str:0, int:0, vit:0};
            if(typeof window.updatePlayerStats === 'function') window.updatePlayerStats(); 
        }
    });

    // プレイヤーウィジェット(左上の顔アイコン)をタップでステータス画面開閉
    document.getElementById('playerWidget').addEventListener('pointerdown', (e) => {
        const w = document.getElementById('statusWindow');
        if (w && w.style.display === 'flex') {
            w.style.display = 'none';
            window.tempStats = {str:0, int:0, vit:0};
        } else if (w) { 
            window.updateStatusUI(); 
            const pWidget = document.getElementById('playerWidget');
            if (pWidget) {
                const rect = pWidget.getBoundingClientRect();
                w.style.top = rect.top + 'px';
            }
            w.style.display = 'flex'; 
        }
    }, { passive: true });

    // 閉じるボタン
    document.getElementById('closeStatusBtn').addEventListener('pointerdown', (e) => { 
        const w = document.getElementById('statusWindow');
        if (w) w.style.display = 'none'; 
        window.tempStats = {str:0, int:0, vit:0};
    }, { passive: true });
};
