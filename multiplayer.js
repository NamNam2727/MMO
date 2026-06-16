// =========================================================
// multiplayer.js
// ゲーム内のデータ送受信、他プレイヤーの座標・状態管理、
// パーティ機能のベース、および通信量の最適化を行う
// =========================================================

window.MultiplayerManager = {
    // --- グローバル状態 ---
    myPartyId: null, // 将来用: パーティ結成時にIDを入れる
    
    // 他プレイヤーのデータを格納する箱
    otherPlayers: {}, 
    
    // --- 通信量削減（エコ）のための変数 ---
    lastSentPos: { x: 0, y: 0 },
    lastSendTime: 0,
    sendInterval: 100, // 0.1秒に1回しか送信しない

    // ==========================================
    // 1. データ送信処理 (エコ仕様)
    // ==========================================
    sendData: function(data) {
        if (window.GameState && window.GameState.isLocalMode) return;
        if (!window.AgentSDK) return;

        // 全ての通信に「自分が今いるマップ」と「パーティID」を必ず付与する
        data.mapId = window.MapManager ? window.MapManager.currentMapId : 'town';
        data.partyId = this.myPartyId;
        
        window.AgentSDK.room.sendMessage({ message: JSON.stringify(data) });
    },
    
    // 自分の現在位置を強制的に発信する
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

    // ★追加: 他プレイヤー全員に位置情報を要求する
    requestPositions: function() {
        this.sendData({
            dataType: 'pos_req'
        });
    },

    // 他プレイヤーのステータスを要求する
    requestStatus: function(targetUserId) {
        this.sendData({
            dataType: 'status_req',
            targetId: targetUserId
        });
    },
    
    // main.js の update() から毎フレーム呼ばれる
    update: function(dt, timestamp) {
        if (!window.player) return;
        
        // --- 自分の位置情報の送信（動いた時だけ送る） ---
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

        // --- 他プレイヤーの滑らかな移動（補間処理） ---
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
    // 2. データ受信処理 (足切りフィルター搭載)
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

        // ★追加: 位置情報の要求を受信した場合、自分の位置を送信してあげる
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
        
        // 足切りフィルター
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
            
            // ★廃止: 入室時の無条件な位置送信処理を削除しました
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
            // ★廃止: 入室時の無条件な位置送信処理を削除しました
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
