// =========================================================
// ui.js
// ステータス画面、統合ログなどの基本UI制御
// (インベントリ・ショートカット関連は inventory.js に分離済み)
// =========================================================

window.tempStats = { str: 0, int: 0, vit: 0 }; // 仮振り用のステータス保持

// =========================================================
// ★ ダブルタップによる画面拡大(ズーム)防止処理 (iOS対策)
// =========================================================
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = performance.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });

// =========================================================
// ★ ログシステム制御
// =========================================================
window.getEntityName = function(entity) {
    if (!entity) return "";
    return entity.id === 'p1' ? "<span class='color-player'>プレイヤー</span>" : "<span class='color-enemy'>モンスター</span>";
};

window.addLog = function(htmlText, type = 'sys') {
    const fullLogContent = document.getElementById('fullLogContent');
    if (!fullLogContent) return; 

    const fullLine = document.createElement('div');
    fullLine.className = `full-log-line log-type-${type}`;
    fullLine.innerHTML = htmlText;
    fullLogContent.appendChild(fullLine);
    fullLogContent.scrollTop = fullLogContent.scrollHeight; 

    if (type === 'chat') {
        const chatLogContent = document.getElementById('chatLogContent');
        if (chatLogContent) {
            const chatLine = document.createElement('div');
            chatLine.className = `full-log-line log-type-${type}`;
            chatLine.innerHTML = htmlText;
            chatLogContent.appendChild(chatLine);
            chatLogContent.scrollTop = chatLogContent.scrollHeight;
        }
    }

    const floatingLog = document.getElementById('floatingLog');
    if (!floatingLog) return;
    
    const floatLine = document.createElement('div');
    floatLine.className = `log-line log-type-${type}`;
    floatLine.innerHTML = htmlText;
    floatingLog.appendChild(floatLine);

    const removeFloatLine = () => {
        if(!floatLine.classList.contains('fade-out')) {
            floatLine.classList.add('fade-out');
            setTimeout(() => { if (floatLine.parentNode) floatLine.remove(); }, 500); 
        }
    };
    floatLine.timerId = setTimeout(removeFloatLine, 5000);

    const activeLines = Array.from(floatingLog.children).filter(child => !child.classList.contains('fade-out'));
    if (activeLines.length > 5) {
        const oldest = activeLines[0];
        clearTimeout(oldest.timerId); 
        if(!oldest.classList.contains('fade-out')) {
            oldest.classList.add('fade-out');
            setTimeout(() => { if (oldest.parentNode) oldest.remove(); }, 500);
        }
    }
};

window.initUI = function() {
    const statHeader = document.querySelector('#statusWindow .stat-header');
    if (statHeader) {
        statHeader.style.position = 'sticky';
        statHeader.style.top = '-15px'; 
        statHeader.style.backgroundColor = 'rgba(20,20,20,0.95)'; 
        statHeader.style.zIndex = '10';
        statHeader.style.margin = '-15px -15px 10px -15px'; 
        statHeader.style.padding = '15px 15px 5px 15px'; 
        
        const statusWindowObj = document.getElementById('statusWindow');
        if (statusWindowObj) {
            statusWindowObj.style.overflowX = 'hidden';
        }
    }

    // ------------------------------------
    // 左上ウィジェット・ステータス画面の更新関数
    // ------------------------------------
    window.updateWidgetUI = function() {
        if (!window.player) return;
        const player = window.player;
        const lvNum = document.getElementById('uiLvNum');
        if (lvNum) lvNum.innerText = player.level;
        const hpBar = document.getElementById('uiHpBar');
        if (hpBar) hpBar.style.width = Math.max(0, (player.hp / player.maxHp) * 100) + '%';
        const mpBar = document.getElementById('uiMpBar');
        if (mpBar) mpBar.style.width = Math.max(0, (player.mp / player.maxMp) * 100) + '%';
        const expBar = document.getElementById('uiExpBar');
        if (expBar) expBar.style.width = Math.max(0, (player.exp / player.nextExp) * 100) + '%';
    };

    window.updateStatusUI = function() {
        if (!window.player) return;
        const player = window.player;
        const tempStats = window.tempStats;

        document.getElementById('statLvNum').innerText = player.level;
        document.getElementById('statExp').innerText = player.exp;
        document.getElementById('statNextExp').innerText = player.nextExp;
        document.getElementById('statPoints').innerText = player.statPoints;
        
        const remainingPoints = player.statPoints - (tempStats.str + tempStats.int + tempStats.vit);
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

        let previewMaxHp = player.baseHp + (previewVit * 10);
        if (player.equipped.armor && player.equipped.armor.stats && player.equipped.armor.stats.hp) previewMaxHp += player.equipped.armor.stats.hp;
        let previewMaxMp = player.baseMp + (previewInt * 5);
        
        let previewAtk = player.baseAtk + (previewStr * 2);
        if (player.equipped.weapon && player.equipped.weapon.stats && player.equipped.weapon.stats.atk) previewAtk += player.equipped.weapon.stats.atk;
        let previewMatk = player.baseMatk + (previewInt * 2);

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
        document.getElementById('valElements').innerHTML = `武器属性: ${elementText}<br>耐性: ${resistsText}`;

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

    window.getRemainingPoints = function() { 
        return window.player.statPoints - (window.tempStats.str + window.tempStats.int + window.tempStats.vit); 
    };

    // ------------------------------------
    // 左下統合UI（タブ開閉）の制御
    // ------------------------------------
    let isBottomUIOpen = false;
    let currentBottomTab = null;

    function toggleBottomTab(tabName) {
        const container = document.getElementById('bottomUIContainer');
        const floating = document.getElementById('floatingLog');
        if (!container || !floating) return;
        
        if (isBottomUIOpen && currentBottomTab === tabName) {
            isBottomUIOpen = false;
            container.classList.remove('open');
            currentBottomTab = null;
            document.querySelectorAll('.bottom-tab-btn').forEach(b => b.classList.remove('active'));
            floating.className = 'state-closed';
            return;
        }
        
        isBottomUIOpen = true;
        currentBottomTab = tabName;
        container.classList.add('open');
        
        document.querySelectorAll('.bottom-tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.target === tabName);
        });
        
        document.querySelectorAll('.bottom-content').forEach(c => {
            c.classList.toggle('active', c.id === `content-${tabName}`);
        });
        
        floating.className = `state-${tabName}`;
        
        if (tabName === 'log') {
            const lc = document.getElementById('fullLogContent');
            if(lc) lc.scrollTop = lc.scrollHeight;
        } else if (tabName === 'chat') {
            const cc = document.getElementById('chatLogContent');
            if(cc) cc.scrollTop = cc.scrollHeight;
        }
    }

    document.querySelectorAll('.bottom-tab-btn').forEach(btn => {
        btn.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); toggleBottomTab(btn.dataset.target);
        });
    });

    const chatSendBtn = document.getElementById('chatSendBtn');
    if (chatSendBtn) {
        chatSendBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const input = document.getElementById('chatInput');
            const text = input.value.trim();
            if (text) {
                window.addLog(`<span class='color-player'>プレイヤー:</span> ${text}`, 'chat');
                input.value = '';
            }
        });
    }

    // ------------------------------------
    // ステータス画面のイベントリスナー
    // ------------------------------------
    document.getElementById('btnAddStr').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.getRemainingPoints() > 0){ window.tempStats.str++; window.updateStatusUI(); } });
    document.getElementById('btnAddInt').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.getRemainingPoints() > 0){ window.tempStats.int++; window.updateStatusUI(); } });
    document.getElementById('btnAddVit').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.getRemainingPoints() > 0){ window.tempStats.vit++; window.updateStatusUI(); } });

    document.getElementById('btnSubStr').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.tempStats.str>0){window.tempStats.str--; window.updateStatusUI();} });
    document.getElementById('btnSubInt').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.tempStats.int>0){window.tempStats.int--; window.updateStatusUI();} });
    document.getElementById('btnSubVit').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.tempStats.vit>0){window.tempStats.vit--; window.updateStatusUI();} });

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

    document.getElementById('playerWidget').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const w = document.getElementById('statusWindow');
        if (w.style.display === 'flex') {
            w.style.display = 'none';
            window.tempStats = {str:0, int:0, vit:0};
        } else { 
            window.updateStatusUI(); w.style.display = 'flex'; 
        }
    });

    document.getElementById('closeStatusBtn').addEventListener('pointerdown', (e) => { 
        e.stopPropagation(); 
        document.getElementById('statusWindow').style.display = 'none'; 
        window.tempStats = {str:0, int:0, vit:0};
    });

    // ------------------------------------
    // メインアクションボタン
    // ------------------------------------
    document.getElementById('attackBtn').addEventListener('pointerdown', (e) => {
        e.stopPropagation(); window.player.targetItem = null; 
        if (window.player.targetEnemy && window.player.targetEnemy.state !== 'dead') {
            window.player.isAutoAttacking = true; 
            if(typeof window.findPath === 'function') window.playerPath = window.findPath(window.player.x, window.player.y, window.player.targetEnemy.x, window.player.targetEnemy.y);
        } else {
            let closest = null; let minDist = Infinity;
            for (const enemy of window.enemies) {
                if (enemy.state !== 'dead') {
                    const dist = Math.hypot(enemy.x - window.player.x, enemy.y - window.player.y);
                    if (dist < minDist) { minDist = dist; closest = enemy; }
                }
            }
            if (closest) { window.player.targetEnemy = closest; window.player.isAutoAttacking = false; }
        }
    });

    document.getElementById('lootBtn').addEventListener('pointerdown', (e) => {
        e.stopPropagation(); window.player.targetEnemy = null; window.player.isAutoAttacking = false;
        let closestItem = null; let minDist = Infinity;
        for (const item of window.droppedItems) {
            if (item.ownerId === null || item.ownerId === window.player.id) {
                const dist = Math.hypot(item.x - window.player.x, item.y - window.player.y);
                if (dist < minDist) { minDist = dist; closestItem = item; }
            }
        }
        if (closestItem && typeof window.findPath === 'function') { 
            window.player.targetItem = closestItem; 
            window.playerPath = window.findPath(window.player.x, window.player.y, closestItem.x, closestItem.y); 
        }
    });

    // インベントリUIの初期化を分離した外部JS(inventory.js)から呼び出す
    if(typeof window.initInventoryUI === 'function') {
        window.initInventoryUI();
    }
};
