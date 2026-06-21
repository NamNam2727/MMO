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
    // ★修正: ショップ(75) < インベントリ(80) < 個数選択(85) の順になるように調整
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
                
                // ベースのZ-index（ステータスの70より上に配置）
                if (shopWin) shopWin.style.zIndex = 75;
                if (shopModal) shopModal.style.zIndex = 85;
                
                // タップされたものを最前面にするが、ショップはインベントリを超えないようにする
                if (windowId === 'shopWindow' && shopWin) shopWin.style.zIndex = 76;
                if (windowId === 'shopSellCountModal' && shopModal) shopModal.style.zIndex = 86;
                
                // インベントリはショップより確実に手前に来るように補正
                if (windowId === 'invWindow' && invWin) {
                    invWin.style.zIndex = 80;
                }
                
                // 詳細ウィンドウは一番手前
                const detail = document.getElementById('itemDetail');
                if (detail && detail.style.display === 'flex') detail.style.zIndex = 90;
            };
        }
    }, 100);

    // ----------------------------------------------------------------------
    // 3. 枠外タップ時の【完全な】閉じる処理 ＆ キャラ移動防止
    // ★修正: イベントのキャプチャフェーズで横取りし、キャラが動くのを完全にブロックします
    // ----------------------------------------------------------------------
    document.addEventListener('pointerdown', (e) => {
        if (window.shopState && window.shopState.isOpen) {
            const isUI = e.target.closest('#shopWindow, #invWindow, #itemDetail, #statusWindow, #shopSellCountModal, .shop-tab, #playerWidget, #bottomUIContainer, #chatLogContent, #fullLogContent');
            
            // UI以外（背景のマップやNPCなど）をタップした場合
            if (!isUI) {
                e.stopPropagation(); // これで main.js へのタップ伝播を完全に遮断（キャラ移動防止）
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
        if (window.shopState && window.shopState.isOpen) return; // 開いている時は判定しない
        
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
    // 7. インベントリからのD&D売却判定
    // ★修正: pointerupのバグを取り除いたので、一番シンプルな本来の判定に戻しました
    // ----------------------------------------------------------------------
    setTimeout(() => {
        const originalOnItemDragEnd = window.onItemDragEnd;
        
        window.onItemDragEnd = function(dropTarget) {
            const shopWin = dropTarget ? dropTarget.closest('#shopWindow') : null;
            
            if (shopWin && window.shopState && window.shopState.isOpen && window.shopState.mode === 'sell') {
                let targetSlotIdx = -1;
                const shopSlot = dropTarget.closest('.shop-sell-slot');
                
                if (shopSlot) {
                    targetSlotIdx = parseInt(shopSlot.dataset.slotIdx);
                } else {
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
            
            // ショップじゃない場所に落としたら、通常のショートカット等（または床）の処理へ戻す
            if (typeof originalOnItemDragEnd === 'function') {
                return originalOnItemDragEnd(dropTarget);
            }
            return false;
        };
    }, 2000); 

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
