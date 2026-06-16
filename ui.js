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
// ★ UI前面化（Z-index）管理とグローバルタップ処理
// =========================================================
window.bringToFront = function(windowId) {
    const inv = document.getElementById('invWindow');
    const skill = document.getElementById('skillCreateWindow');
    const conf = document.getElementById('skillConfirmDialog');
    
    if (inv) inv.style.zIndex = (windowId === 'invWindow') ? '60' : '50';
    if (skill) skill.style.zIndex = (windowId === 'skillCreateWindow') ? '60' : '50';
    if (conf && conf.style.display !== 'none') conf.style.zIndex = '80';
};

// アイテム詳細ウィンドウ外（空スロットなど）をタップした際に確実に閉じる処理
document.addEventListener('pointerdown', (e) => {
    const detail = document.getElementById('itemDetail');
    if (detail && detail.style.display !== 'none') {
        if (!e.target.closest('#itemDetail')) {
            const slot = e.target.closest('.inv-slot');
            if (!slot || !slot.querySelector('.item-icon')) {
                detail.style.display = 'none';
            }
        }
    }
}, { capture: true });

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

// =========================================================
// ★ HTMLを触らずに動的にDOMを生成する処理（パーティUI関連）
// =========================================================
function createDynamicPartyUI() {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    // 1. メンバー表示ボタンの作成 (バッグボタンの上)
    const memberBtn = document.createElement('button');
    memberBtn.id = 'memberBtn';
    memberBtn.innerText = 'メンバー';
    memberBtn.style.cssText = 'position: absolute; right: 15px; bottom: 150px; width: 50px; height: 50px; border-radius: 10px; background-color: rgba(255, 140, 0, 0.7); color: white; font-size: 11px; font-weight: bold; border: 3px solid rgba(255, 255, 255, 0.8); pointer-events: auto; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3); -webkit-tap-highlight-color: transparent; display: flex; justify-content: center; align-items: center; z-index: 50;';
    
    memberBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const win = document.getElementById('partyListWindow');
        if (win) {
            win.style.display = (win.style.display === 'flex') ? 'none' : 'flex';
        }
    });
    uiLayer.appendChild(memberBtn);

    // 2. パーティ一覧ウィンドウの作成
    const partyWin = document.createElement('div');
    partyWin.id = 'partyListWindow';
    partyWin.style.cssText = 'position: absolute; top: 15%; left: 10%; width: 80%; max-height: 70%; background-color: rgba(20,20,20,0.95); border: 2px solid #777; border-radius: 8px; display: none; flex-direction: column; pointer-events: auto; color: white; padding: 15px; box-sizing: border-box; overflow-y: auto; z-index: 75; box-shadow: 0 10px 20px rgba(0,0,0,0.7);';
    
    const pHeader = document.createElement('div');
    pHeader.innerHTML = '<span>ルームメンバー</span><span id="closePartyBtn" style="cursor:pointer;">❌</span>';
    pHeader.style.cssText = 'display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-bottom: 1px solid #555; padding-bottom: 10px; margin-bottom: 10px;';
    
    const pList = document.createElement('div');
    pList.id = 'partyDynamicList';
    pList.style.cssText = 'display: flex; flex-direction: column; gap: 8px; overflow-y: auto;';

    partyWin.appendChild(pHeader);
    partyWin.appendChild(pList);
    uiLayer.appendChild(partyWin);

    pHeader.querySelector('#closePartyBtn').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        partyWin.style.display = 'none';
    });

    // 3. 他プレイヤーステータスウィンドウの作成
    const otherStatWin = document.createElement('div');
    otherStatWin.id = 'otherPlayerStatusWindow';
    otherStatWin.style.cssText = 'position: absolute; top: 20%; left: 5%; width: 90%; max-height: 60%; background-color: rgba(30,40,50,0.95); border: 2px solid #55a; border-radius: 8px; display: none; flex-direction: column; pointer-events: auto; color: white; padding: 15px; box-sizing: border-box; overflow-y: auto; z-index: 80; box-shadow: 0 10px 20px rgba(0,0,0,0.8);';
    
    const oHeader = document.createElement('div');
    oHeader.innerHTML = '<span id="oStatName">プレイヤー名</span><span id="closeOtherStatBtn" style="cursor:pointer;">❌</span>';
    oHeader.style.cssText = 'display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-bottom: 1px solid #55a; padding-bottom: 10px; margin-bottom: 10px;';
    
    const oContent = document.createElement('div');
    oContent.id = 'oStatContent';
    oContent.style.cssText = 'font-size: 13px; line-height: 1.5; color: #ddd;';
    
    otherStatWin.appendChild(oHeader);
    otherStatWin.appendChild(oContent);
    uiLayer.appendChild(otherStatWin);

    oHeader.querySelector('#closeOtherStatBtn').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        otherStatWin.style.display = 'none';
    });

    // 古いパーティUIを非表示にする
    const oldPartyWidget = document.getElementById('partyWidget');
    if (oldPartyWidget) oldPartyWidget.style.display = 'none';
}

// 他プレイヤーの行をタップした時の処理
window.showOtherPlayerStatus = function(user) {
    const win = document.getElementById('otherPlayerStatusWindow');
    if (!win) return;

    const nameEl = document.getElementById('oStatName');
    const contentEl = document.getElementById('oStatContent');
    
    const avatarUrl = user.portrait || user.portait || '';
    const userName = user.user_name || user.name || 'Player';

    nameEl.innerText = `${userName} のステータス`;

    // 現状は送受信の基盤がないため、ダミー表示または取得中表示にする
    contentEl.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 15px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background-color: #555; border: 2px solid #fff; background-image: url(${avatarUrl}); background-size: cover; background-position: center; margin-right: 15px;"></div>
            <div>
                <div style="font-weight: bold; color: white;">LV: ???</div>
                <div style="color: #aaa; font-size: 11px;">ID: ${user.user_id}</div>
            </div>
        </div>
        <div style="text-align: center; color: #aaa; padding: 20px; border: 1px dashed #555; border-radius: 8px;">
            詳細なステータスデータを<br>取得しています...<br>
            <span style="font-size:10px;">(※今後通信ロジックを実装後に表示されます)</span>
        </div>
    `;

    win.style.display = 'flex';
};

// パーティ一覧UIの更新（別窓用）
window.updatePartyUI = function() {
    const pList = document.getElementById('partyDynamicList');
    if (!pList) return;
    pList.innerHTML = '';
    
    if (!window.GameState || !window.GameState.roomUsers || !window.GameState.userInfo) return;

    // 自分自身も一覧に表示するかはお好みですが、今回は他人のみとします
    const others = window.GameState.roomUsers.filter(u => u.user_id !== window.GameState.userInfo.user_id);

    if (others.length === 0) {
        pList.innerHTML = '<div style="color:#777; text-align:center; padding: 20px 0; font-size: 12px;">ルームに他のメンバーはいません。</div>';
        return;
    }

    others.forEach(user => {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; align-items: center; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s;';
        
        const avatarUrl = user.portrait || user.portait || ''; 
        
        div.innerHTML = `
            <div style="width: 36px; height: 36px; border-radius: 50%; background-color: #555; border: 1px solid #fff; background-image: url(${avatarUrl}); background-size: cover; background-position: center;"></div>
            <div style="margin-left: 12px; font-weight: bold; font-size: 14px; flex: 1;">${user.user_name || user.name || 'Player'}</div>
            <div style="color: #aaa; font-size: 12px;">🔍詳細</div>
        `;
        
        div.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            window.showOtherPlayerStatus(user);
        });

        pList.appendChild(div);
    });
};


window.initUI = function() {
    // ★ HTMLを触らずに動的UIを生成する
    createDynamicPartyUI();

    // ステータス画面を他のウィンドウより確実に前面に出すためのCSS強制適用
    const pWidget = document.getElementById('playerWidget');
    if (pWidget) pWidget.style.setProperty('z-index', '60', 'important');
    const sWindow = document.getElementById('statusWindow');
    if (sWindow) sWindow.style.setProperty('z-index', '70', 'important');

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

    // 初回パーティリストの描画
    if (typeof window.updatePartyUI === 'function') window.updatePartyUI();

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
        
        const valElementsNode = document.getElementById('valElements');
        if(valElementsNode) {
            valElementsNode.innerHTML = `武器属性: ${elementText}<br>耐性: ${resistsText}`;
        }

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

    // =========================================================
    // ★ マルチプレイチャット送信機能
    // =========================================================
    const chatSendBtn = document.getElementById('chatSendBtn');
    if (chatSendBtn) {
        chatSendBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const input = document.getElementById('chatInput');
            const text = input.value.trim();
            if (text) {
                let myName = 'プレイヤー';
                const nameElem = document.getElementById('uiPlayerName');
                if (nameElem && nameElem.innerText && nameElem.innerText !== 'Player Name') {
                    myName = nameElem.innerText;
                }

                // 自分の画面に表示
                window.addLog(`<span class='color-player'>${myName}:</span> ${text}`, 'chat');
                
                // 通信送信
                if (window.Multiplayer && typeof window.Multiplayer.sendData === 'function') {
                    window.Multiplayer.sendData({
                        dataType: 'chat',
                        senderName: myName,
                        text: text
                    });
                }

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

    document.getElementById('closeStatusBtn').addEventListener('pointerdown', (e) => { 
        const w = document.getElementById('statusWindow');
        if (w) w.style.display = 'none'; 
        window.tempStats = {str:0, int:0, vit:0};
    }, { passive: true });

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

    if(typeof window.initInventoryUI === 'function') {
        window.initInventoryUI();
    }

    // =========================================================
    // ★ マルチプレイ通信イベントの受取とログ・UI反映
    // =========================================================
    if (window.Multiplayer) {
        // --- 1. メッセージ（チャットやデータ）を受信した時 ---
        const prevOnReceive = window.Multiplayer.onReceiveData;
        window.Multiplayer.onReceiveData = (data, userId) => {
            if (prevOnReceive) prevOnReceive(data, userId); 
            
            if (data && data.dataType === 'chat') {
                const senderName = data.senderName || 'プレイヤー';
                window.addLog(`<span style="color: #aaffaa;">${senderName}:</span> ${data.text}`, 'chat');
            }
        };

        // --- 2. 誰かが入室した時 ---
        const prevOnJoin = window.Multiplayer.onPlayerJoin;
        window.Multiplayer.onPlayerJoin = (userData) => {
            if (prevOnJoin) prevOnJoin(userData);
            
            const userName = userData.user_name || userData.name || '誰か';
            window.addLog(`<span class='color-sys'>[入室] ${userName} が部屋に参加しました。</span>`, 'sys');
            
            if (typeof window.updatePartyUI === 'function') window.updatePartyUI();
        };

        // --- 3. 誰かが退室した時 ---
        const prevOnLeave = window.Multiplayer.onPlayerLeave;
        window.Multiplayer.onPlayerLeave = (userData) => {
            if (prevOnLeave) prevOnLeave(userData);
            
            const userName = userData.user_name || userData.name || '誰か';
            window.addLog(`<span class='color-sys'>[退室] ${userName} が部屋を退出しました。</span>`, 'sys');
            
            if (typeof window.updatePartyUI === 'function') window.updatePartyUI();
        };
    }
};
