// =========================================================
// ui.js
// 画面全体のUI制御、および各UIモジュールの初期化ハブ
// =========================================================

// =========================================================
// ★ ブラウザの音量制限解除（初回タップ検知）
// =========================================================
window.hasUserInteracted = false;
document.addEventListener('pointerdown', () => {
    if (!window.hasUserInteracted) {
        window.hasUserInteracted = true;
        if (window.AudioManager && window.MapManager) {
            window.AudioManager.init();
            const currentMap = window.MapManager.mapList[window.MapManager.currentMapId];
            if (currentMap && currentMap.bgmGlobal && window[currentMap.bgmGlobal]) {
                window.AudioManager.playBGM(window[currentMap.bgmGlobal]);
            }
        }
    }
}, { capture: true, once: true });

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
// ★ 動的DOM生成（設定画面・ミュート機能付き・ドラッグ専用スライダー）
// =========================================================
function createSettingUI() {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    // ★修正: プレイヤーウィジェットの実際の高さを動的に取得し、それに合わせる（復元）
    let widgetTop = '84px';
    const pWidget = document.getElementById('playerWidget');
    if (pWidget) {
        const computedStyle = window.getComputedStyle(pWidget);
        widgetTop = computedStyle.top || pWidget.style.top || '84px';
    }

    // 設定ボタン (画面右上)
    const settingBtn = document.createElement('button');
    settingBtn.id = 'settingBtn';
    settingBtn.innerHTML = '⚙️';
    settingBtn.style.cssText = `position: absolute; right: 15px; top: ${widgetTop}; width: 44px; height: 44px; border-radius: 50%; background-color: rgba(40, 50, 60, 0.8); color: white; font-size: 20px; border: 2px solid rgba(255, 255, 255, 0.8); pointer-events: auto; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 60;`;
    
    settingBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const win = document.getElementById('settingWindow');
        if (win) {
            win.style.display = (win.style.display === 'flex') ? 'none' : 'flex';
        }
    });
    uiLayer.appendChild(settingBtn);

    // 設定ウィンドウ
    const settingWin = document.createElement('div');
    settingWin.id = 'settingWindow';
    settingWin.style.cssText = 'position: absolute; top: 20%; left: 50%; transform: translateX(-50%); width: 280px; background-color: rgba(20,20,30,0.95); border: 2px solid #777; border-radius: 8px; display: none; flex-direction: column; pointer-events: auto; color: white; padding: 15px; box-sizing: border-box; z-index: 85; box-shadow: 0 10px 20px rgba(0,0,0,0.8);';
    
    const header = document.createElement('div');
    header.innerHTML = '<span>設定</span><span id="closeSettingBtn" style="cursor:pointer; padding: 0 5px;">❌</span>';
    header.style.cssText = 'display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-bottom: 1px solid #555; padding-bottom: 10px; margin-bottom: 15px;';
    
    const content = document.createElement('div');
    content.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';
    
    // マスター音量設定コンテナ
    const volContainer = document.createElement('div');
    volContainer.style.cssText = 'display: flex; flex-direction: column; gap: 5px; font-size: 14px;';
    
    const volLabelContainer = document.createElement('div');
    volLabelContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;';
    
    const volLabel = document.createElement('div');
    volLabel.innerHTML = 'マスター音量: <span id="volValueDisplay">50%</span>';
    
    // ミュートボタン
    const muteBtn = document.createElement('div');
    muteBtn.innerHTML = '🔊';
    muteBtn.style.cssText = 'cursor: pointer; font-size: 20px; user-select: none; width: 40px; height: 30px; display: flex; justify-content: center; align-items: center; background: rgba(255,255,255,0.1); border: 1px solid #777; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); pointer-events: auto;';
    
    volLabelContainer.appendChild(volLabel);
    volLabelContainer.appendChild(muteBtn);
    
    // ★修正: タップで飛ばず、ドラッグ専用の「カスタムスライダー」をDIVで作成
    const sliderBg = document.createElement('div');
    sliderBg.style.cssText = 'position: relative; width: 100%; height: 12px; background: rgba(0,0,0,0.6); border-radius: 6px; border: 1px solid #555; touch-action: none; margin-top: 10px; pointer-events: auto;';
    
    const sliderFill = document.createElement('div');
    sliderFill.style.cssText = 'position: absolute; top: 0; left: 0; height: 100%; width: 50%; background: #00ffff; border-radius: 5px; pointer-events: none; transition: background-color 0.2s;';
    
    const sliderThumb = document.createElement('div');
    // つまみを少し大きくして掴みやすくする
    sliderThumb.style.cssText = 'position: absolute; top: -9px; left: 50%; width: 30px; height: 30px; background: #fff; border-radius: 50%; transform: translateX(-50%); box-shadow: 0 2px 6px rgba(0,0,0,0.8); cursor: grab; touch-action: none; pointer-events: auto;';
    
    sliderBg.appendChild(sliderFill);
    sliderBg.appendChild(sliderThumb);

    // カスタムスライダーのロジック
    let isMuted = false;
    let savedVol = 50;
    let currentVol = 50;
    let isDragging = false;

    function updateSliderVisuals(val) {
        sliderFill.style.width = val + '%';
        sliderThumb.style.left = val + '%';
        document.getElementById('volValueDisplay').innerText = Math.round(val) + '%';
    }

    function setVolumeVal(val) {
        currentVol = Math.max(0, Math.min(100, val));
        updateSliderVisuals(currentVol);
        if (window.AudioManager && !isMuted) {
            window.AudioManager.setVolume(currentVol / 100);
        }
    }

    // つまみをタップした時のみドラッグ開始
    sliderThumb.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        isDragging = true;
        sliderThumb.style.cursor = 'grabbing';
    });

    // 画面のどこを指が動いてもスライダーが追従する
    window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const rect = sliderBg.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let percentage = (x / rect.width) * 100;
        percentage = Math.max(0, Math.min(100, percentage));
        
        if (isMuted) {
            // ドラッグしたら自動でミュート解除
            isMuted = false;
            muteBtn.innerHTML = '🔊';
            muteBtn.style.background = 'rgba(255,255,255,0.1)';
            sliderFill.style.background = '#00ffff';
        }
        
        setVolumeVal(percentage);
    });

    window.addEventListener('pointerup', (e) => {
        if (isDragging) {
            isDragging = false;
            sliderThumb.style.cursor = 'grab';
        }
    });

    // ミュートボタンの処理
    muteBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        isMuted = !isMuted;
        if (isMuted) {
            savedVol = currentVol;
            muteBtn.innerHTML = '🔇';
            muteBtn.style.background = 'rgba(255,50,50,0.3)';
            sliderFill.style.background = '#555';
            document.getElementById('volValueDisplay').innerText = '0%';
            if (window.AudioManager) window.AudioManager.setVolume(0);
        } else {
            muteBtn.innerHTML = '🔊';
            muteBtn.style.background = 'rgba(255,255,255,0.1)';
            sliderFill.style.background = '#00ffff';
            setVolumeVal(savedVol);
        }
    });

    volContainer.appendChild(volLabelContainer);
    volContainer.appendChild(sliderBg);
    content.appendChild(volContainer);

    settingWin.appendChild(header);
    settingWin.appendChild(content);
    uiLayer.appendChild(settingWin);

    header.querySelector('#closeSettingBtn').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        settingWin.style.display = 'none';
    });
}

// =========================================================
// ★ UI初期化の統合ハブ
// =========================================================
window.initUI = function() {
    
    // 自身の動的UIを生成
    createSettingUI();

    // 各分離先モジュールの初期化を呼び出す
    if (typeof window.initStatusUI === 'function') window.initStatusUI();
    if (typeof window.initChatSystem === 'function') window.initChatSystem();
    if (typeof window.initMultiplayerUI === 'function') window.initMultiplayerUI();
    if (typeof window.initInventoryUI === 'function') window.initInventoryUI();

    // 既存UIのZ-index等レイアウト調整
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

    // ウィジェット（左上）の更新関数
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

    // 画面下部タブの制御
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

    // アクションボタン
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
};

// =========================================================
// ★ 画面全体のスクロール・移動操作キャンセル処理
// =========================================================
document.addEventListener('touchmove', function(e) {
    if (window.isDraggingItem) {
        e.preventDefault();
        return;
    }
    const isScrollable = e.target.closest('#invContent, #statusWindow, #fullLogContent, #chatLogContent, #debug-console, #partyListWindow, #otherPlayerStatusWindow, #settingWindow');
    if (!isScrollable) {
        e.preventDefault();
    }
}, { passive: false });

window.addEventListener('pointerdown', (e) => {
    const itemDetail = document.getElementById('itemDetail');
    const invWindow = document.getElementById('invWindow');
    const statWindow = document.getElementById('statusWindow');
    
    // UIタップ時には移動指示をキャンセルさせるための判定
    if ((invWindow && e.target.closest('#invWindow')) || 
        (itemDetail && e.target.closest('#itemDetail')) || 
        (statWindow && e.target.closest('#statusWindow')) || 
        e.target.closest('#playerWidget') || 
        e.target.closest('#bottomUIContainer') || 
        e.target.closest('#buffDetailWindow') ||
        e.target.closest('#partyListWindow') ||
        e.target.closest('#otherPlayerStatusWindow') ||
        e.target.closest('#settingWindow') || 
        e.target.closest('#settingBtn') ||    
        e.target.tagName === 'BUTTON' || 
        e.target.tagName === 'SELECT' || 
        e.target.tagName === 'INPUT') {
            return;
        }
});
