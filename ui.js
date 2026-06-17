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

    // ★追加: スライダーを「タップ無効・ドラッグ専用」にするための特殊CSSを動的に追加
    if (!document.getElementById('settingUiStyles')) {
        const style = document.createElement('style');
        style.id = 'settingUiStyles';
        style.innerHTML = `
            input[type="range"].drag-only-slider {
                pointer-events: none;
            }
            input[type="range"].drag-only-slider::-webkit-slider-thumb {
                pointer-events: auto;
            }
            input[type="range"].drag-only-slider::-moz-range-thumb {
                pointer-events: auto;
            }
        `;
        document.head.appendChild(style);
    }

    // ★修正: 設定ボタンの高さを playerWidget と同じ「84px」に固定
    const settingBtn = document.createElement('button');
    settingBtn.id = 'settingBtn';
    settingBtn.innerHTML = '⚙️';
    settingBtn.style.cssText = 'position: absolute; right: 15px; top: 84px; width: 44px; height: 44px; border-radius: 50%; background-color: rgba(40, 50, 60, 0.8); color: white; font-size: 20px; border: 2px solid rgba(255, 255, 255, 0.8); pointer-events: auto; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 60;';
    
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
    header.innerHTML = '<span>設定</span><span id="closeSettingBtn" style="cursor:pointer;">❌</span>';
    header.style.cssText = 'display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-bottom: 1px solid #555; padding-bottom: 10px; margin-bottom: 15px;';
    
    const content = document.createElement('div');
    content.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';
    
    // マスター音量設定コンテナ
    const volContainer = document.createElement('div');
    volContainer.style.cssText = 'display: flex; flex-direction: column; gap: 5px; font-size: 14px;';
    
    // ★修正: ミュートボタンを押しやすくボタン風にし、スライダーの上に配置
    const volLabelContainer = document.createElement('div');
    volLabelContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
    
    const volLabel = document.createElement('div');
    volLabel.innerHTML = 'マスター音量: <span id="volValueDisplay">50%</span>';
    
    const muteBtn = document.createElement('div');
    muteBtn.innerHTML = '🔊';
    muteBtn.style.cssText = 'cursor: pointer; font-size: 20px; user-select: none; width: 40px; height: 30px; display: flex; justify-content: center; align-items: center; background: rgba(255,255,255,0.1); border: 1px solid #777; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); pointer-events: auto;';
    
    volLabelContainer.appendChild(volLabel);
    volLabelContainer.appendChild(muteBtn);
    
    // ★修正: タップでは動かずドラッグ専用になるCSSクラス「drag-only-slider」を付与
    const volSlider = document.createElement('input');
    volSlider.type = 'range';
    volSlider.min = '0';
    volSlider.max = '100';
    volSlider.value = '50';
    volSlider.className = 'drag-only-slider';
    volSlider.style.cssText = 'width: 100%;';
    
    // ミュート状態の管理
    let isMuted = false;
    let savedVol = 50;

    muteBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        isMuted = !isMuted;
        if (isMuted) {
            savedVol = volSlider.value; // 現在の音量を保存
            muteBtn.innerHTML = '🔇';
            volSlider.value = 0;
            document.getElementById('volValueDisplay').innerText = '0%';
            if (window.AudioManager) window.AudioManager.setVolume(0);
            muteBtn.style.background = 'rgba(255,50,50,0.3)'; // ミュート時は少し赤く
        } else {
            muteBtn.innerHTML = '🔊';
            volSlider.value = savedVol;
            document.getElementById('volValueDisplay').innerText = savedVol + '%';
            if (window.AudioManager) window.AudioManager.setVolume(savedVol / 100);
            muteBtn.style.background = 'rgba(255,255,255,0.1)';
        }
    });

    volSlider.addEventListener('input', (e) => {
        // スライダーを手動で動かした場合はミュートを強制解除
        if (isMuted) {
            isMuted = false;
            muteBtn.innerHTML = '🔊';
            muteBtn.style.background = 'rgba(255,255,255,0.1)';
        }
        const val = e.target.value;
        document.getElementById('volValueDisplay').innerText = val + '%';
        if (window.AudioManager) {
            window.AudioManager.setVolume(val / 100);
        }
    });

    volContainer.appendChild(volLabelContainer);
    volContainer.appendChild(volSlider);
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
