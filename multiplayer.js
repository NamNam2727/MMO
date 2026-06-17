// =========================================================
// multiplayer.js
// ゲーム内のデータ送受信、他プレイヤーの座標・状態管理、
// パーティ機能のベース、および通信結果を表示するUIの生成
// =========================================================

window.MultiplayerManager = {
    // --- グローバル状態 ---
    myPartyId: null, 
    otherPlayers: {}, 
    
    // --- 通信量削減（エコ）のための変数 ---
    lastSentPos: { x: 0, y: 0 },
    lastSendTime: 0,
    sendInterval: 100, 

    // ==========================================
    // 1. データ送信処理
    // ==========================================
    sendData: function(data) {
        if (window.GameState && window.GameState.isLocalMode) return;
        if (!window.AgentSDK) return;

        data.mapId = window.MapManager ? window.MapManager.currentMapId : 'town';
        data.partyId = this.myPartyId;
        
        window.AgentSDK.room.sendMessage({ message: JSON.stringify(data) });
    },
    
    forceSendPos: function() {
        if (!window.player) return;
        this.sendData({
            dataType: 'move',
            x: Math.floor(window.player.x),
            y: Math.floor(window.player.y),
            isAttacking: window.player.isAutoAttacking
        });
        this.lastSentPos.x = window.player.x;
        this.lastSentPos.y = window.player.y;
        this.lastSendTime = performance.now();
    },

    requestPositions: function() {
        this.sendData({ dataType: 'pos_req' });
    },

    requestStatus: function(targetUserId) {
        this.sendData({ dataType: 'status_req', targetId: targetUserId });
    },
    
    update: function(dt, timestamp) {
        if (!window.player) return;
        
        const dist = Math.hypot(window.player.x - this.lastSentPos.x, window.player.y - this.lastSentPos.y);
        
        if (dist > 5 || window.player.isAutoAttacking) {
            if (timestamp - this.lastSendTime > this.sendInterval) {
                this.sendData({
                    dataType: 'move',
                    x: Math.floor(window.player.x),
                    y: Math.floor(window.player.y),
                    isAttacking: window.player.isAutoAttacking
                });
                
                this.lastSentPos.x = window.player.x;
                this.lastSentPos.y = window.player.y;
                this.lastSendTime = timestamp;
            }
        }

        for (const id in this.otherPlayers) {
            const p = this.otherPlayers[id];
            if (p.x !== undefined && p.targetX !== undefined) {
                p.x += (p.targetX - p.x) * 10 * dt;
                p.y += (p.targetY - p.y) * 10 * dt;
            }
            if (p.chatTimer > 0) p.chatTimer -= dt;
        }
    },
    
    // ==========================================
    // 2. データ受信処理
    // ==========================================
    handleReceive: function(data, senderId) {
        if (data.dataType === 'chat') {
            if (typeof window.addLog === 'function') {
                window.addLog(`<span style="color: #aaffaa;">${data.senderName}:</span> ${data.text}`, 'chat');
            }
            if (this.otherPlayers[senderId]) {
                this.otherPlayers[senderId].chatMessage = data.text;
                this.otherPlayers[senderId].chatTimer = 5.0; 
            }
            return;
        }

        if (data.dataType === 'pos_req') {
            this.forceSendPos();
            return;
        }

        if (data.dataType === 'status_req') {
            if (window.GameState && window.GameState.userInfo && data.targetId === window.GameState.userInfo.user_id) {
                if (!window.player) return;
                const mitigation = (window.player.armor / (100 + window.player.armor)) * 100;
                
                const resData = {
                    dataType: 'status_res',
                    targetId: senderId, 
                    userId: window.GameState.userInfo.user_id,
                    level: window.player.level,
                    exp: window.player.exp,
                    str: window.player.stats.str,
                    int: window.player.stats.int,
                    vit: window.player.stats.vit,
                    hp: Math.floor(window.player.hp),
                    maxHp: window.player.maxHp,
                    mp: Math.floor(window.player.mp),
                    maxMp: window.player.maxMp,
                    atk: window.player.atk,
                    matk: window.player.matk,
                    armor: window.player.armor,
                    mitigation: mitigation.toFixed(1),
                    weapon: window.player.equipped.weapon ? window.player.equipped.weapon.name : 'なし',
                    armorName: window.player.equipped.armor ? window.player.equipped.armor.name : 'なし'
                };
                this.sendData(resData);
            }
            return;
        }

        if (data.dataType === 'status_res') {
            if (window.GameState && window.GameState.userInfo && data.targetId === window.GameState.userInfo.user_id) {
                if (typeof window.updateOtherPlayerStatusUI === 'function') {
                    window.updateOtherPlayerStatusUI(data);
                }
            }
            return;
        }
        
        const currentMap = window.MapManager ? window.MapManager.currentMapId : 'town';
        const isSameMap = (data.mapId === currentMap);
        const isSameParty = (this.myPartyId !== null && data.partyId === this.myPartyId);
        
        if (!isSameMap && !isSameParty) return; 
        
        if (data.dataType === 'move') {
            if (!this.otherPlayers[senderId]) {
                this.otherPlayers[senderId] = { 
                    id: senderId, name: 'Player', avatar: '',
                    x: data.x, y: data.y, targetX: data.x, targetY: data.y,
                    mapId: data.mapId, isAttacking: data.isAttacking,
                    image: null, imageLoaded: false,
                    chatMessage: '', chatTimer: 0 
                };
            }
            const p = this.otherPlayers[senderId];
            
            if (p.x === 0 && p.y === 0) {
                p.x = data.x;
                p.y = data.y;
            }
            
            p.targetX = data.x;
            p.targetY = data.y;
            p.isAttacking = data.isAttacking;
            p.mapId = data.mapId;
            p.lastUpdateTime = performance.now();
        }
    },

    // ==========================================
    // 3. 入退室の管理
    // ==========================================
    handleJoin: function(user, silent = false) {
        if (window.GameState && window.GameState.userInfo && user.user_id === window.GameState.userInfo.user_id) return;

        const avatarUrl = user.portrait || user.portait || '';
        const p = {
            id: user.user_id,
            name: user.user_name || user.name || 'Player',
            avatar: avatarUrl,
            x: 0, y: 0, targetX: 0, targetY: 0,
            mapId: 'unknown',
            isAttacking: false,
            image: null,
            imageLoaded: false,
            chatMessage: '', 
            chatTimer: 0     
        };

        if (avatarUrl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = avatarUrl;
            p.image = img;
            p.imageLoaded = true;
        }

        if (this.otherPlayers[user.user_id]) {
            p.x = this.otherPlayers[user.user_id].x;
            p.y = this.otherPlayers[user.user_id].y;
            p.targetX = this.otherPlayers[user.user_id].targetX;
            p.targetY = this.otherPlayers[user.user_id].targetY;
        }

        this.otherPlayers[user.user_id] = p;
        
        if (!silent) {
            const userName = user.user_name || user.name || '誰か';
            if (typeof window.addLog === 'function') {
                window.addLog(`<span class='color-sys'>[入室] ${userName} が部屋に参加しました。</span>`, 'sys');
            }
            if (typeof window.updatePartyUI === 'function') window.updatePartyUI();
        }
    },

    handleLeave: function(user) {
        delete this.otherPlayers[user.user_id];
        
        const userName = user.user_name || user.name || '誰か';
        if (typeof window.addLog === 'function') {
            window.addLog(`<span class='color-sys'>[退室] ${userName} が部屋を退出しました。</span>`, 'sys');
        }
        if (typeof window.updatePartyUI === 'function') window.updatePartyUI();
    },

    initExistingPlayers: function() {
        if (window.GameState && window.GameState.roomUsers) {
            window.GameState.roomUsers.forEach(user => {
                this.handleJoin(user, true);
            });
        }
    }
};

if (window.Multiplayer) {
    window.Multiplayer.sendData = function(data) { window.MultiplayerManager.sendData(data); };
    window.Multiplayer.onReceiveData = function(data, userId) { window.MultiplayerManager.handleReceive(data, userId); };
    window.Multiplayer.onPlayerJoin = function(user) { window.MultiplayerManager.handleJoin(user); };
    window.Multiplayer.onPlayerLeave = function(user) { window.MultiplayerManager.handleLeave(user); };
    
    window.MultiplayerManager.initExistingPlayers();
}

// =========================================================
// ★ マルチプレイ関連のUI動的生成・更新ロジック
// =========================================================

window.initMultiplayerUI = function() {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    // 1. メンバー表示ボタンの作成
    const memberBtn = document.createElement('button');
    memberBtn.id = 'memberBtn';
    memberBtn.innerText = 'メンバー';
    memberBtn.style.cssText = 'position: absolute; right: 75px; bottom: 90px; width: 50px; height: 50px; border-radius: 10px; background-color: rgba(255, 140, 0, 0.7); color: white; font-size: 11px; font-weight: bold; border: 3px solid rgba(255, 255, 255, 0.8); pointer-events: auto; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3); -webkit-tap-highlight-color: transparent; display: flex; justify-content: center; align-items: center; z-index: 50;';
    
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

    // 初回のUI更新
    window.updatePartyUI();
};

window.showOtherPlayerStatus = function(user) {
    const win = document.getElementById('otherPlayerStatusWindow');
    if (!win) return;

    const nameEl = document.getElementById('oStatName');
    const contentEl = document.getElementById('oStatContent');
    
    const avatarUrl = user.portrait || user.portait || '';
    const userName = user.user_name || user.name || 'Player';

    nameEl.innerText = `${userName} のステータス`;

    contentEl.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 15px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background-color: #555; border: 2px solid #fff; background-image: url(${avatarUrl}); background-size: cover; background-position: center; margin-right: 15px;"></div>
            <div>
                <div style="font-weight: bold; color: white; font-size: 16px;">LV: ???</div>
            </div>
        </div>
        <div style="text-align: center; color: #aaa; padding: 20px; border: 1px dashed #555; border-radius: 8px;">
            ステータスデータを取得しています...
        </div>
    `;

    win.style.display = 'flex';
    
    if (window.MultiplayerManager && typeof window.MultiplayerManager.requestStatus === 'function') {
        window.MultiplayerManager.requestStatus(user.user_id);
    }
};

window.updateOtherPlayerStatusUI = function(data) {
    const win = document.getElementById('otherPlayerStatusWindow');
    const contentEl = document.getElementById('oStatContent');
    if (!win || win.style.display === 'none' || !contentEl) return;
    
    let avatarUrl = '';
    if (window.MultiplayerManager && window.MultiplayerManager.otherPlayers[data.userId]) {
        avatarUrl = window.MultiplayerManager.otherPlayers[data.userId].avatar || '';
    }

    contentEl.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 10px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background-color: #555; border: 2px solid #fff; background-image: url(${avatarUrl}); background-size: cover; background-position: center; margin-right: 15px;"></div>
            <div>
                <div style="font-weight: bold; color: white; font-size: 16px;">LV: ${data.level}</div>
                <div style="color: #aaa; font-size: 11px;">EXP: ${data.exp}</div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
            <div>ちから: <span style="color:#ff0">${data.str}</span></div>
            <div>まりょく: <span style="color:#ff0">${data.int}</span></div>
            <div>たいりょく: <span style="color:#ff0">${data.vit}</span></div>
            <div></div>
            <div>HP: ${data.hp} / ${data.maxHp}</div>
            <div>MP: ${data.mp} / ${data.maxMp}</div>
            <div>ATK: ${data.atk}</div>
            <div>MATK: ${data.matk}</div>
            <div>防御: ${data.armor}</div>
            <div>軽減率: ${data.mitigation}%</div>
        </div>
        
        <div style="font-size: 13px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px;">
            <div style="margin-bottom: 5px;"><span style="color:#aaa;">武器:</span> ${data.weapon}</div>
            <div><span style="color:#aaa;">防具:</span> ${data.armorName}</div>
        </div>
    `;
};

window.updatePartyUI = function() {
    const pList = document.getElementById('partyDynamicList');
    if (!pList) return;
    pList.innerHTML = '';
    
    if (!window.GameState || !window.GameState.roomUsers || !window.GameState.userInfo) return;

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
