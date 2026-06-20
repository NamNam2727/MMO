// =========================================================
// ui.js
// 画面全体のUI制御、および各UIモジュールの初期化ハブ
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

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = performance.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });

window.bringToFront = function(windowId) {
    const inv = document.getElementById('invWindow');
    const stat = document.getElementById('statusWindow');
    const skill = document.getElementById('skillCreateWindow');
    const shop = document.getElementById('shopWindow'); // ★追加: ショップウィンドウ
    
    let z = 10;
    if (inv) inv.style.zIndex = z;
    if (stat) stat.style.zIndex = z;
    if (skill) skill.style.zIndex = z;
    if (shop) shop.style.zIndex = z;
    
    const target = document.getElementById(windowId);
    if (target) target.style.zIndex = 20; 
};

// =========================================================
// ★ 画面全体のスクロール・移動操作キャンセル処理
// =========================================================
document.addEventListener('touchmove', function(e) {
    if (window.isDraggingItem) {
        e.preventDefault();
        return;
    }
    // ★追加: ショップウィンドウと個数選択モーダルをスクロール許可リストに追加
    const isScrollable = e.target.closest('#invContent, #statusWindow, #fullLogContent, #chatLogContent, #debug-console, #partyListWindow, #otherPlayerStatusWindow, #settingWindow, #shopWindow, #shopSellCountModal');
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
        e.target.closest('#shopWindow') ||          // ★追加: ショップウィンドウ
        e.target.closest('#shopSellCountModal') ||  // ★追加: 個数選択モーダル
        e.target.closest('#settingBtn') ||    
        e.target.tagName === 'BUTTON' || 
        e.target.tagName === 'SELECT' || 
        e.target.tagName === 'INPUT') return;
});

window.initUI = function() {
    window.resizeCanvas();
    window.addEventListener('resize', window.resizeCanvas);
    if (typeof window.initStatusUI === 'function') window.initStatusUI();
    if (typeof window.initChatSystem === 'function') window.initChatSystem();
    if (typeof window.initShortcutUI === 'function') window.initShortcutUI();
    if (typeof window.initSkillUI === 'function') window.initSkillUI();
    if (typeof window.initMultiplayerUI === 'function') window.initMultiplayerUI();
};
