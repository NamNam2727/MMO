// =========================================
// gravity_setup.js
// タイトル画面、マッチングUI、Gravity SDKの初期化ロジック
// =========================================

document.addEventListener('DOMContentLoaded', async () => {

    const topExclusionHeight = window.innerHeight >= 812 ? 98 : 74;
    const pWidget = document.getElementById('playerWidget');
    const ptWidget = document.getElementById('partyWidget');
    if (pWidget) pWidget.style.top = (topExclusionHeight + 10) + 'px';
    if (ptWidget) ptWidget.style.top = (topExclusionHeight + 70) + 'px';

    const State = { isLocalMode: false, userInfo: null, currentRoomId: null, roomUsers: [] };
    
    // JS(main.jsやui.js)から情報を引き出せるようにグローバル変数化
    window.GameState = State;

    const screens = { 
        loading: document.getElementById('screen-loading'), 
        title: document.getElementById('screen-title'), 
        room: document.getElementById('screen-room') 
    };
    const uiMsg = document.getElementById('sys-msg-title');
    const roomListContainer = document.getElementById('room-list');

    function showScreen(screenName) {
        Object.values(screens).forEach(s => { if(s) s.classList.remove('active'); });
        if(screens[screenName]) screens[screenName].classList.add('active');
    }

    async function initSDK() {
        if (!window.AgentSDK) {
            fallbackToLocalMode();
            return;
        }

        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 1500));
        try {
            const result = await Promise.race([ window.AgentSDK.user.getMyUserInfo(), timeoutPromise ]);
            if (result === 'TIMEOUT') {
                fallbackToLocalMode();
            } else if (result && result.errno === 0) {
                State.userInfo = result.data;
                
                const pIcon = document.getElementById('playerIcon');
                if (State.userInfo.portrait && pIcon) {
                    pIcon.style.backgroundImage = `url(${State.userInfo.portrait})`;
                    pIcon.style.backgroundSize = 'cover';
                }
                const pName = document.getElementById('uiPlayerName');
                if (pName) pName.innerText = State.userInfo.name;

                try {
                    const roomRes = await window.AgentSDK.room.getRoomId();
                    if (roomRes && roomRes.room_id) {
                        await joinExistingRoom(roomRes.room_id);
                        return;
                    }
                } catch(e) {}
            } else {
                fallbackToLocalMode();
            }
        } catch (e) {
            fallbackToLocalMode();
        }

        showScreen('title');
        if (uiMsg) {
            if (State.isLocalMode) uiMsg.innerText = "※ブラウザ環境のためシングルプレイモードです";
            else uiMsg.innerText = `ようこそ、${State.userInfo.name} さん`;
        }
    }

    function fallbackToLocalMode() {
        State.isLocalMode = true;
        const dummyUserId = Math.floor(Math.random() * 10000);
        State.userInfo = { name: 'Guest_' + dummyUserId, user_id: dummyUserId, portrait: '' };
        
        const pName = document.getElementById('uiPlayerName');
        if (pName) pName.innerText = State.userInfo.name;

        window.AgentSDK.room = {
            create: async () => ({ errno: 0, data: { room_id: 'local_room_' + dummyUserId } }),
            join: async (p) => ({ errno: 0, data: { room_id: p.room_id, max_players: 4, current_player: 1, user_list: [State.userInfo] } }),
            getPublicRoomList: async () => ({ errno: 0, data: { list: [] } }),
            sendMessage: async () => ({ errno: 0 }),
            receiveMessage: () => {},
            getRoomId: async () => ({ room_id: '' })
        };
    }

    // --- ボタンイベント ---
    const btnStart = document.getElementById('btn-start');
    if (btnStart) btnStart.addEventListener('click', async () => { showScreen('room'); await refreshRoomList(); });
    
    const btnBackTitle = document.getElementById('btn-back-title');
    if (btnBackTitle) btnBackTitle.addEventListener('click', () => { showScreen('title'); });
    
    const btnCreatePub = document.getElementById('btn-create-public');
    if (btnCreatePub) btnCreatePub.addEventListener('click', function() { handleCreateRoom(0, this); });
    
    const btnCreatePriv = document.getElementById('btn-create-private');
    if (btnCreatePriv) btnCreatePriv.addEventListener('click', function() { handleCreateRoom(1, this); });

    async function handleCreateRoom(permission, btnElement) {
        if(btnCreatePub) btnCreatePub.disabled = true; 
        if(btnCreatePriv) btnCreatePriv.disabled = true;
        btnElement.innerHTML = "作成中...";
        try {
            const res = await window.AgentSDK.room.create({ max_players: 4, room_permission: permission });
            if (res && res.errno === 0) {
                prepareGameRun(res.data.room_id, [State.userInfo]);
            } else {
                resetCreateButtons();
            }
        } catch(e) {
            resetCreateButtons();
        }
    }

    function resetCreateButtons() {
        if(btnCreatePub) { btnCreatePub.innerHTML = "公開<br>ルーム作成"; btnCreatePub.disabled = false; }
        if(btnCreatePriv) { btnCreatePriv.innerHTML = "プライベート<br>ルーム作成"; btnCreatePriv.disabled = false; }
    }

    async function refreshRoomList() {
        if (!roomListContainer) return;
        roomListContainer.innerHTML = '<div class="empty-text">検索中...</div>';
        try {
            const res = await window.AgentSDK.room.getPublicRoomList();
            if (res && res.errno === 0) {
                const list = res.data.list || [];
                if (list.length === 0) { roomListContainer.innerHTML = '<div class="empty-text">公開されている部屋がありません。</div>'; return; }
                roomListContainer.innerHTML = '';
                list.forEach(room => {
                    const item = document.createElement('div'); item.className = 'room-item';
                    item.innerHTML = `
                        <div class="room-info"><div class="room-id">Room: ${room.room_id.substring(0, 6)}...</div><div class="room-players">Players: ${room.gamer_num} / ${room.max_players}</div></div>
                        <button class="btn-join" data-roomid="${room.room_id}">参加</button>
                    `;
                    roomListContainer.appendChild(item);
                });
                document.querySelectorAll('.btn-join').forEach(btn => {
                    btn.addEventListener('click', (e) => { joinExistingRoom(e.target.getAttribute('data-roomid')); });
                });
            } else {
                roomListContainer.innerHTML = '<div class="empty-text">リストの取得に失敗しました。</div>';
            }
        } catch(e) {}
    }

    async function joinExistingRoom(roomId) {
        try {
            const res = await window.AgentSDK.room.join({ room_id: roomId });
            if (res && res.errno === 0) {
                prepareGameRun(roomId, res.data.user_list);
            }
        } catch(e) {}
    }

    // --- 部屋に入室後のゲーム起動処理 ---
    function prepareGameRun(roomId, userList) {
        State.currentRoomId = roomId; State.roomUsers = userList || [State.userInfo];
        
        // ui.js ロード前に呼ばれる可能性もあるため、念のため存在チェック
        if (typeof window.updatePartyUI === 'function') {
            window.updatePartyUI();
        }

        window.Multiplayer = {
            sendData: async (data) => {
                if(State.isLocalMode) return;
                await window.AgentSDK.room.sendMessage({ message: JSON.stringify(data) });
            },
            onReceiveData: null, onPlayerJoin: null, onPlayerLeave: null
        };

        window.AgentSDK.room.receiveMessage((payload) => {
            if (payload.type === 'aitools_game_joinroom') {
                State.roomUsers.push(payload.data);
                if (typeof window.updatePartyUI === 'function') window.updatePartyUI();
                if (window.Multiplayer && window.Multiplayer.onPlayerJoin) window.Multiplayer.onPlayerJoin(payload.data);
            } 
            else if (payload.type === 'aitools_game_exitroom') {
                State.roomUsers = State.roomUsers.filter(u => u.user_id !== payload.data.user_id);
                if (typeof window.updatePartyUI === 'function') window.updatePartyUI();
                if (window.Multiplayer && window.Multiplayer.onPlayerLeave) window.Multiplayer.onPlayerLeave(payload.data);
            } 
            else if (payload.type === 'aitools_game_sendmsg') {
                try {
                    const msgData = JSON.parse(payload.data.msg_data);
                    if (window.Multiplayer && window.Multiplayer.onReceiveData) window.Multiplayer.onReceiveData(msgData, payload.data.user_id);
                } catch(e) {}
            }
        });
        
        // マッチングUIを消し、ゲーム画面の覆いを取る
        const startupUI = document.getElementById('startup-ui');
        const uiLayer = document.getElementById('ui-layer');
        if (startupUI) startupUI.style.display = 'none';
        if (uiLayer) uiLayer.style.visibility = 'visible';
        
        // リサイズイベントを発火してCanvasサイズを画面に合わせる
        window.dispatchEvent(new Event('resize'));

        // ==============================================================
        // ここで loader.js を動的に読み込む（ゲームの開始）
        // ==============================================================
        const script = document.createElement('script');
        // ※キャッシュ回避のクエリパラメータ付きで読み込み
        script.src = "https://namnam2727.github.io/MMO/loader.js?v=" + new Date().getTime();
        script.crossOrigin = "anonymous";
        document.body.appendChild(script);
    }

    // 処理開始
    initSDK();
});
