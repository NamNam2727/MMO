// =========================================================
// multiplayer.js
// ゲーム内のデータ送受信、他プレイヤーの座標・状態管理、
// パーティ機能のベース、および通信量の最適化を行う
// =========================================================

window.MultiplayerManager = {
    // --- グローバル状態 ---
    myPartyId: null, // 将来用: パーティ結成時にIDを入れる
    
    // 他プレイヤーのデータを格納する箱
    // 形式: { id, name, avatar, x, y, targetX, targetY, mapId, isAttacking, lastUpdateTime, image, imageLoaded, chatMessage, chatTimer }
    otherPlayers: {}, 
    
    // --- 通信量削減（エコ）のための変数 ---
    lastSentPos: { x: 0, y: 0 },
    lastSendTime: 0,
    sendInterval: 100, // 0.1秒に1回しか送信しない（秒間10回）これで通信量を劇的に削減

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
    
    // 誰かが入室した時などに、自分の現在位置を強制的に発信する
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
        
        // 5ピクセル以上動いた、または攻撃中であれば送信候補
        if (dist > 5 || window.player.isAutoAttacking) {
            // 前回の送信から 0.1秒 (sendInterval) 以上経過しているかチェック
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

        // --- 他プレイヤーの滑らかな移動（補間処理）とタイマー管理 ---
        for (const id in this.otherPlayers) {
            const p = this.otherPlayers[id];
            // ターゲット座標に向かって少しずつ近づける（カクつき防止）
            if (p.x !== undefined && p.targetX !== undefined) {
                p.x += (p.targetX - p.x) * 10 * dt;
                p.y += (p.targetY - p.y) * 10 * dt;
            }
            
            // ★追加: 他プレイヤーの吹き出し表示時間を減算する
            if (p.chatTimer > 0) {
                p.chatTimer -= dt;
            }
        }
    },
    
    // ==========================================
    // 2. データ受信処理 (足切りフィルター搭載)
    // ==========================================
    handleReceive: function(data, senderId) {
        // [A] チャットはマップ関係なく全員で共有
        if (data.dataType === 'chat') {
            if (typeof window.addLog === 'function') {
                window.addLog(`<span style="color: #aaffaa;">${data.senderName}:</span> ${data.text}`, 'chat');
            }
            // ★追加: 受信したチャットを他プレイヤーの吹き出しとしてセット
            if (this.otherPlayers[senderId]) {
                this.otherPlayers[senderId].chatMessage = data.text;
                this.otherPlayers[senderId].chatTimer = 5.0; // 5秒間表示
            }
            return;
        }

        // [B] ステータス要求の受信（自分が要求された場合、返信する）
        if (data.dataType === 'status_req') {
            if (window.GameState && window.GameState.userInfo && data.targetId === window.GameState.userInfo.user_id) {
                if (!window.player) return;
                const mitigation = (window.player.armor / (100 + window.player.armor)) * 100;
                
                const resData = {
                    dataType: 'status_res',
                    targetId: senderId, // 要求元に送り返す
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

        // [C] ステータス返信の受信（自分が要求した相手からのデータ表示）
        if (data.dataType === 'status_res') {
            if (window.GameState && window.GameState.userInfo && data.targetId === window.GameState.userInfo.user_id) {
                if (typeof window.updateOtherPlayerStatusUI === 'function') {
                    window.updateOtherPlayerStatusUI(data);
                }
            }
            return;
        }
        
        // [D] 足切りフィルター (自分と関係ないマップ・パーティのデータはここで捨てる)
        const currentMap = window.MapManager ? window.MapManager.currentMapId : 'town';
        const isSameMap = (data.mapId === currentMap);
        const isSameParty = (this.myPartyId !== null && data.partyId === this.myPartyId);
        
        // 「違うマップ」かつ「同じパーティでもない」なら、描画も計算も不要なので即終了
        if (!isSameMap && !isSameParty) {
            return; 
        }
        
        // [E] 同じマップ、または同じパーティの移動データ処理
        if (data.dataType === 'move') {
            if (!this.otherPlayers[senderId]) {
                // 未知のプレイヤーからのデータの場合
                this.otherPlayers[senderId] = { 
                    id: senderId, name: 'Player', avatar: '',
                    x: data.x, y: data.y, targetX: data.x, targetY: data.y,
                    mapId: data.mapId, isAttacking: data.isAttacking,
                    image: null, imageLoaded: false,
                    chatMessage: '', chatTimer: 0 // ★追加
                };
            }
            const p = this.otherPlayers[senderId];
            
            // 相手が最初からこのマップにいた場合、ワープを防ぐための初期座標セット
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
        // 自分自身は追加しない
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
            chatMessage: '', // ★追加
            chatTimer: 0     // ★追加
        };

        // 画像の非同期ロード
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
            
            // 新しい人が入ってきたら、即座に自分の位置を知らせる
            this.forceSendPos();
        }
    },

    // 退室時はメモリから完全に消去して軽くする
    handleLeave: function(user) {
        delete this.otherPlayers[user.user_id];
        
        const userName = user.user_name || user.name || '誰か';
        if (typeof window.addLog === 'function') {
            window.addLog(`<span class='color-sys'>[退室] ${userName} が部屋を退出しました。</span>`, 'sys');
        }
        if (typeof window.updatePartyUI === 'function') window.updatePartyUI();
    },

    // ゲーム開始時、すでに部屋にいるユーザーを一括登録
    initExistingPlayers: function() {
        if (window.GameState && window.GameState.roomUsers) {
            window.GameState.roomUsers.forEach(user => {
                this.handleJoin(user, true);
            });
            // 初期メンバー登録後、自分の位置を発信
            this.forceSendPos();
        }
    }
};

// ==========================================
// ★ SDK側のインターフェース (window.Multiplayer) を上書き接続
// ==========================================
if (window.Multiplayer) {
    window.Multiplayer.sendData = function(data) { window.MultiplayerManager.sendData(data); };
    window.Multiplayer.onReceiveData = function(data, userId) { window.MultiplayerManager.handleReceive(data, userId); };
    window.Multiplayer.onPlayerJoin = function(user) { window.MultiplayerManager.handleJoin(user); };
    window.Multiplayer.onPlayerLeave = function(user) { window.MultiplayerManager.handleLeave(user); };
    
    // ロード完了と同時に、既存プレイヤーのアイコン等をセットアップ
    window.MultiplayerManager.initExistingPlayers();
}
