// =========================================================
// shop_integration.js
// 既存のファイルを一切変更せずに、外部からNPCとショップシステムを注入するモジュール
// =========================================================

(function() {
    // ----------------------------------------------------------------------
    // 1. NPCを誕生させる機能の追加
    // ----------------------------------------------------------------------
    window.npcs = window.npcs || [];

    window.spawnNPC = function(npcId, spawnX, spawnY) {
        if (!window.NPC_DB || !window.NPC_DB[npcId]) return null;
        
        const base = window.NPC_DB[npcId];
        const radius = base.radius || 15;

        let imgObj = null;
        if (base.imageUrl) {
            imgObj = new Image();
            const baseURL = (window.MapManager && window.MapManager.baseURL) ? window.MapManager.baseURL : 'https://namnam2727.github.io/MMO/';
            imgObj.src = baseURL + base.imageUrl;
        }

        return {
            uid: Date.now() + Math.random(),
            id: npcId,
            name: base.name || 'NPC',
            type: 'npc', 
            x: spawnX, y: spawnY, targetX: spawnX, targetY: spawnY,
            radius: radius,
            color: base.color || '#ffffff',
            image: imgObj,
            interact: base.interact || null,
            shopItems: base.shopItems || []
        };
    };

    // ----------------------------------------------------------------------
    // 2. UIの前面・背面管理（bringToFront）にショップを組み込むパッチ
    // ----------------------------------------------------------------------
    const initBringToFrontHook = setInterval(() => {
        if (typeof window.bringToFront === 'function') {
            clearInterval(initBringToFrontHook);
            const origBringToFront = window.bringToFront;
            
            window.bringToFront = function(windowId) {
                origBringToFront(windowId); 
                
                const shopWin = document.getElementById('shopWindow');
                const shopModal = document.getElementById('shopSellCountModal');
                const invWin = document.getElementById('invWindow');
                
                if (shopWin) shopWin.style.zIndex = 75;
                if (shopModal) shopModal.style.zIndex = 85;
                
                if (windowId === 'shopWindow' && shopWin) shopWin.style.zIndex = 76;
                if (windowId === 'shopSellCountModal' && shopModal) shopModal.style.zIndex = 86;
                
                if (windowId === 'invWindow' && invWin) invWin.style.zIndex = 80;
                
                const detail = document.getElementById('itemDetail');
                if (detail && detail.style.display === 'flex') detail.style.zIndex = 90;
            };
        }
    }, 100);

    // ----------------------------------------------------------------------
    // 3. 枠外タップ時の閉じる処理 ＆ キャラ移動防止
    // ----------------------------------------------------------------------
    document.addEventListener('pointerdown', (e) => {
        if (window.shopState && window.shopState.isOpen) {
            const isUI = e.target.closest('#shopWindow, #invWindow, #itemDetail, #statusWindow, #shopSellCountModal, .shop-tab, #playerWidget, #bottomUIContainer, #chatLogContent, #fullLogContent');
            
            if (!isUI) {
                e.stopPropagation(); 
                e.preventDefault();
                
                if (typeof window.closeShopWindow === 'function') window.closeShopWindow();
                
                if (window.player) {
                    window.player.targetNpc = null;
                    window.player.targetEnemy = null;
                    window.player.targetItem = null;
                    window.playerPath = [];
                }
                if (typeof input !== 'undefined') input.isDown = false;
            }
        }
    }, { capture: true }); 

    // ----------------------------------------------------------------------
    // 4. NPCへの通常のタップ判定
    // ----------------------------------------------------------------------
    window.addEventListener('pointerup', (e) => {
        if (e.target.closest('#invWindow, #itemDetail, #statusWindow, #shopWindow, #shopSellCountModal, button, input, .shop-tab')) return;
        if (window.shopState && window.shopState.isOpen) return; 
        
        if (!window.player || !window.camera || window.isMapLoading) return;
        
        const sx = (typeof input !== 'undefined') ? input.screenX : e.clientX;
        const sy = (typeof input !== 'undefined') ? input.screenY : e.clientY;
        const targetX = sx + window.camera.x;
        const targetY = sy + window.camera.y;
        
        let clickedNpc = null;
        if (window.npcs) {
            for (const npc of window.npcs) {
                const dist = Math.hypot(npc.x - targetX, npc.y - targetY);
                if (dist <= npc.radius + 15) { clickedNpc = npc; break; }
            }
        }
        
        if (clickedNpc) {
            window.player.targetNpc = clickedNpc;
            window.player.targetEnemy = null;
            window.player.targetItem = null;
            window.player.isAutoAttacking = false;
        } else {
            window.player.targetNpc = null;
        }
    });

    // ----------------------------------------------------------------------
    // 5. NPCへの接近と会話
    // ----------------------------------------------------------------------
    const initLoopHook = setInterval(() => {
        if (window.gameLoop) {
            clearInterval(initLoopHook);
            const origLoop = window.gameLoop;
            
            window.gameLoop = function(timestamp) {
                origLoop(timestamp); 
                
                if (window.player && window.player.targetNpc && !window.isMapLoading) {
                    const npc = window.player.targetNpc;
                    const dist = Math.hypot(npc.x - window.player.x, npc.y - window.player.y);
                    
                    if (dist <= window.player.attackRange + 20) {
                        window.playerPath = []; 
                        if (npc.interact) npc.interact(npc, window.player);
                        window.player.targetNpc = null;
                    }
                }
            };
        }
    }, 100);

    // ----------------------------------------------------------------------
    // 6. インベントリ描画時の「半透明化」をフック
    // ----------------------------------------------------------------------
    const initInvHook = setInterval(() => {
        if (typeof window.renderInventory === 'function') {
            clearInterval(initInvHook);
            const origRender = window.renderInventory;
            
            window.renderInventory = function() {
                if (typeof window.validateShopCart === 'function') window.validateShopCart();
                origRender(); 
                
                const invContent = document.getElementById('invContent');
                if (!invContent) return;
                const tabId = window.tabsList[window.currentTabIndex];
                if (!window.player || !window.player.inventory || !window.player.inventory[tabId]) return;

                const slots = invContent.querySelectorAll('.inv-slot:not(.empty)');
                slots.forEach((slot, index) => {
                    const item = window.player.inventory[tabId].items[index];
                    if (!item) return;

                    let isLockedByShop = false;
                    if (window.shopState && window.shopState.isOpen && window.shopState.mode === 'sell') {
                        isLockedByShop = window.shopState.cart.some(c => c && c.item && c.item.uid === item.uid);
                    }
                    if (isLockedByShop) {
                        slot.style.opacity = '0.3';
                        slot.style.pointerEvents = 'none';
                    }
                });
            };
        }
    }, 100);

    // ----------------------------------------------------------------------
    // 7. 【新機能】アイテムタップ時の詳細ウィンドウを「売却専用」にすり替える
    // ※ 致命的なバグの原因だったD&Dフック(onItemDragEnd)は全廃し、これで完全に置き換えます。
    // ----------------------------------------------------------------------
    const initShowDetailHook = setInterval(() => {
        if (typeof window.showItemDetail === 'function') {
            clearInterval(initShowDetailHook);
            const origShowDetail = window.showItemDetail;
            
            window.showItemDetail = function(item, slotElement) {
                // ショップの「うる」モードが開いている時だけフック
                if (window.shopState && window.shopState.isOpen && window.shopState.mode === 'sell') {
                    
                    // カートの空き枠を自動で探す
                    let targetSlotIdx = -1;
                    for (let i = 0; i < window.shopState.cart.length; i++) {
                        if (!window.shopState.cart[i]) { targetSlotIdx = i; break; }
                    }

                    if (targetSlotIdx !== -1) {
                        // 空きがあれば、売却専用のポップアップを呼び出す
                        if (typeof window.promptShopSellCount === 'function') {
                            window.promptShopSellCount(item, targetSlotIdx);
                        }
                    } else {
                        if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>売却カートがいっぱいです。</span>", "sys");
                    }
                    return; // 元の「使う」などの詳細ウィンドウは出さない
                }
                
                // ショップが開いていなければ、今まで通り普通の詳細ウィンドウを出す
                origShowDetail(item, slotElement);
            };
        }
    }, 100);

    // ----------------------------------------------------------------------
    // 8. ショップウィンドウのスクロール操作の許可
    // ----------------------------------------------------------------------
    document.addEventListener('touchmove', function(e) {
        if (window.isDraggingItem) return;
        const isShopArea = e.target.closest('#shopWindow, #shopSellCountModal');
        if (isShopArea) {
            e.stopPropagation(); 
        }
    }, { passive: false });

})();
