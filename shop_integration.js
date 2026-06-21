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
    // 2. 枠外タップ時の閉じる処理とNPCへのタップ判定を統合
    // ★修正: 閉じた直後に会話が再起動してしまうバグをここで防ぎます
    // ----------------------------------------------------------------------
    window.addEventListener('pointerup', (e) => {
        // UI操作のタップ時は無視
        if (e.target.closest('#invWindow, #itemDetail, #statusWindow, #shopSellCountModal, button, input, .shop-tab')) return;
        
        // --- ショップが開いている時の枠外タップ判定 ---
        if (window.shopState && window.shopState.isOpen) {
            const isShopWin = e.target.closest('#shopWindow');
            if (!isShopWin) {
                // ショップウィンドウ外ならショップを閉じ、ターゲットを強制解除
                if (typeof window.closeShopWindow === 'function') window.closeShopWindow();
                if (window.player) {
                    window.player.targetNpc = null;
                    window.player.targetEnemy = null;
                    window.player.targetItem = null;
                    window.playerPath = [];
                }
                return; // ここで終了し、下のNPC判定には進ませない
            }
            return; // ショップ内タップなら通常通り終了
        }

        // --- 以下は通常のNPCタップ判定 ---
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
                        window.player.targetNpc = null; // 会話したらターゲット解除
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
    // ★修正: z-index（背面化）に影響されないよう、座標計算による完全な判定に変更
    // ----------------------------------------------------------------------
    setTimeout(() => {
        const originalOnItemDragEnd = window.onItemDragEnd;
        
        window.onItemDragEnd = function(dropTarget) {
            if (window.shopState && window.shopState.isOpen && window.shopState.mode === 'sell') {
                const shopWin = document.getElementById('shopWindow');
                
                if (shopWin) {
                    // 指を離した座標が、ショップウィンドウの領域内にあるか計算で判定
                    const rect = shopWin.getBoundingClientRect();
                    const dropX = window.lastDragX;
                    const dropY = window.lastDragY;
                    
                    if (dropX >= rect.left && dropX <= rect.right && dropY >= rect.top && dropY <= rect.bottom) {
                        let targetSlotIdx = -1;
                        const slots = shopWin.querySelectorAll('.shop-sell-slot');
                        
                        // 具体的にどの枠に落としたか座標でチェック
                        for (let i = 0; i < slots.length; i++) {
                            const sRect = slots[i].getBoundingClientRect();
                            if (dropX >= sRect.left && dropX <= sRect.right && dropY >= sRect.top && dropY <= sRect.bottom) {
                                targetSlotIdx = parseInt(slots[i].dataset.slotIdx);
                                break;
                            }
                        }

                        // スロット外だがウィンドウ内の場合は、最初の空き枠を探す
                        if (targetSlotIdx === -1) {
                            for (let i = 0; i < window.shopState.cart.length; i++) {
                                if (!window.shopState.cart[i]) { targetSlotIdx = i; break; }
                            }
                        }

                        // 枠が見つかったら個数選択ポップアップを出す
                        if (targetSlotIdx !== -1) {
                            if (typeof window.promptShopSellCount === 'function') {
                                window.promptShopSellCount(window.dragState.item, targetSlotIdx);
                            }
                        } else {
                            if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>売却カートがいっぱいです。</span>", "sys");
                        }
                        
                        return true; // 処理を横取りしたのでtrue
                    }
                }
            }
            
            // 座標計算でショップ外だった場合は、元のドロップ処理（床に置く等）を実行
            if (typeof originalOnItemDragEnd === 'function') {
                return originalOnItemDragEnd(dropTarget);
            }
            return false;
        };
    }, 2000); 

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
