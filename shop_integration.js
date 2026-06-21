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
    // 2. NPCへのタップ判定
    // ----------------------------------------------------------------------
    window.addEventListener('pointerup', (e) => {
        if (e.target.closest('#invWindow, #itemDetail, #statusWindow, #shopWindow, #shopSellCountModal, button, input')) return;
        
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
        }
    });

    // ----------------------------------------------------------------------
    // 3. NPCへの接近と会話
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
    // 4. インベントリ描画時の「半透明化」をフック
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
    // 5. インベントリからのD&D売却判定
    // ----------------------------------------------------------------------
    // ★修正4: shortcut.jsのロード後に確実にドロップ判定を上書きし、消滅を防ぐ
    setTimeout(() => {
        const originalOnItemDragEnd = window.onItemDragEnd;
        
        window.onItemDragEnd = function(dropTarget) {
            const shopWin = dropTarget.closest('#shopWindow');
            
            if (shopWin && window.shopState && window.shopState.isOpen && window.shopState.mode === 'sell') {
                let targetSlotIdx = -1;
                const shopSlot = dropTarget.closest('.shop-sell-slot');
                
                if (shopSlot) {
                    targetSlotIdx = parseInt(shopSlot.dataset.slotIdx);
                } else {
                    // スロット外でもウィンドウ内なら適当な空き枠を探す
                    for (let i = 0; i < window.shopState.cart.length; i++) {
                        if (!window.shopState.cart[i]) { targetSlotIdx = i; break; }
                    }
                }

                if (targetSlotIdx !== -1) {
                    if (typeof window.promptShopSellCount === 'function') {
                        window.promptShopSellCount(window.dragState.item, targetSlotIdx);
                    }
                } else {
                    if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>売却カートがいっぱいです。</span>", "sys");
                }
                return true; 
            }
            
            // 元の（ショートカット用の）D&D処理を呼び出す
            if (typeof originalOnItemDragEnd === 'function') {
                return originalOnItemDragEnd(dropTarget);
            }
            return false;
        };
    }, 2000); // 2秒遅らせて確実に最後に適用する

    // ----------------------------------------------------------------------
    // 6. ショップウィンドウのスクロール操作の許可
    // ----------------------------------------------------------------------
    document.addEventListener('touchmove', function(e) {
        if (window.isDraggingItem) return;
        const isShopArea = e.target.closest('#shopWindow, #shopSellCountModal');
        if (isShopArea) {
            e.stopPropagation(); 
        }
    }, { passive: false });

})();
