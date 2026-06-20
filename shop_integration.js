// =========================================================
// shop_integration.js
// 既存のファイルを一切変更せずに、外部からNPCとショップシステムを注入するモジュール
// =========================================================

(function() {
    // ----------------------------------------------------------------------
    // 1. NPCの姿を描画するフック（renderer.js を汚染せずに追加）
    // ----------------------------------------------------------------------
    const initDrawHook = setInterval(() => {
        if (window.GameRenderer && window.GameRenderer.draw) {
            clearInterval(initDrawHook);
            const origDraw = window.GameRenderer.draw;
            
            window.GameRenderer.draw = function() {
                origDraw(); // 元の完璧な描画処理をそのまま実行
                
                // その後、上に被せるようにNPCだけを追加描画する
                if (window.ctx && window.npcs && !window.isMapLoading) {
                    const ctx = window.ctx;
                    ctx.save();
                    ctx.translate(-window.camera.x, -window.camera.y);
                    
                    for (const npc of window.npcs) {
                        // タップ時のハイライト
                        if (window.player && window.player.targetNpc === npc) {
                            ctx.beginPath(); ctx.ellipse(npc.x, npc.y + npc.radius, npc.radius * 1.5, npc.radius * 0.5, 0, 0, Math.PI * 2);
                            ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 2; ctx.stroke();
                            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)'; ctx.fill();
                        }

                        // NPC本体
                        if (npc.image && npc.image.complete && npc.image.naturalWidth > 0) {
                            ctx.drawImage(npc.image, npc.x - npc.radius, npc.y - npc.radius, npc.radius * 2, npc.radius * 2);
                        } else {
                            ctx.beginPath(); ctx.arc(npc.x, npc.y, npc.radius, 0, Math.PI * 2);
                            ctx.fillStyle = npc.color; ctx.fill();
                            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                        }

                        // NPCの名前とアイコン
                        ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
                        ctx.lineWidth = 2; ctx.strokeStyle = '#000';
                        ctx.strokeText(npc.name, npc.x, npc.y + npc.radius + 4);
                        ctx.fillStyle = '#aaffaa'; ctx.fillText(npc.name, npc.x, npc.y + npc.radius + 4);
                        
                        const bounce = Math.sin(performance.now() / 200) * 3;
                        ctx.font = '16px sans-serif'; ctx.fillText('💬', npc.x, npc.y - npc.radius - 20 + bounce);
                    }
                    ctx.restore();
                }
            };
        }
    }, 100);

    // ----------------------------------------------------------------------
    // 2. NPCへのタップ判定（main.js のクリック処理に相乗りする）
    // ----------------------------------------------------------------------
    window.addEventListener('pointerup', (e) => {
        // UI操作のタップ時は無視
        if (e.target.closest('#invWindow, #itemDetail, #statusWindow, #shopWindow, #shopSellCountModal, button, input')) return;
        
        if (!window.player || !window.camera || window.isMapLoading) return;
        
        // main.js の input.screenX があれば使用し、なければ e.clientX を使用
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
    // 3. NPCへの接近と会話（gameLoop を汚染せずに追加）
    // ----------------------------------------------------------------------
    const initLoopHook = setInterval(() => {
        if (window.gameLoop) {
            clearInterval(initLoopHook);
            const origLoop = window.gameLoop;
            
            window.gameLoop = function(timestamp) {
                origLoop(timestamp); // 元のメインループを実行
                
                // その後、NPCへの接近判定を行う
                if (window.player && window.player.targetNpc && !window.isMapLoading) {
                    const npc = window.player.targetNpc;
                    const dist = Math.hypot(npc.x - window.player.x, npc.y - window.player.y);
                    
                    // 射程内に入ったら移動を止めてショップを開く
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
                
                origRender(); // お客様の完璧なインベントリ描画を実行
                
                // 描画された後に、カートに入っているアイテムを半透明に上書き
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
    // 5. インベントリからのD&D売却判定（inventory_action.js 連携）
    // ----------------------------------------------------------------------
    window.onItemDragEnd = function(dropTarget) {
        const shopWin = dropTarget.closest('#shopWindow');
        
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
            return true; // 処理を横取りしたのでtrue
        }
        return false;
    };

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
