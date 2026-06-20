// =========================================================
// shop_integration.js
// 既存のインベントリシステムを書き換えることなく、
// 外部からショップとの連携機能（半透明化・D&D判定）をパッチ適用するモジュール
// =========================================================

(function() {
    // ----------------------------------------------------------------------
    // 1. インベントリ描画時の「半透明化ロック」処理のパッチ適用
    // ----------------------------------------------------------------------
    if (typeof window.renderInventory === 'function') {
        const originalRenderInventory = window.renderInventory;
        
        window.renderInventory = function() {
            // カートの整合性チェックを先に行う
            if (typeof window.validateShopCart === 'function') {
                window.validateShopCart();
            }

            // 元のインベントリ描画処理を実行
            originalRenderInventory();

            // 描画後、生成されたDOM(アイテムスロット)に対して事後的に処理を加える
            const invContent = document.getElementById('invContent');
            if (!invContent) return;
            
            const tabId = window.tabsList[window.currentTabIndex];
            if (!window.player || !window.player.inventory || !window.player.inventory[tabId]) return;

            const slots = invContent.querySelectorAll('.inv-slot:not(.empty)');
            
            slots.forEach((slot, index) => {
                const item = window.player.inventory[tabId].items[index];
                if (!item) return;

                // ショップカートに入っているアイテムか判定
                let isLockedByShop = false;
                if (window.shopState && window.shopState.isOpen && window.shopState.mode === 'sell') {
                    isLockedByShop = window.shopState.cart.some(c => c && c.item && c.item.uid === item.uid);
                }

                // カートに入っているなら半透明にしてタップを無効化
                if (isLockedByShop) {
                    slot.style.opacity = '0.3';
                    slot.style.pointerEvents = 'none';
                }
            });
        };
    }

    // ----------------------------------------------------------------------
    // 2. ドラッグ＆ドロップ時の「ショップ売却枠」判定のパッチ適用
    // ----------------------------------------------------------------------
    // ※ inventory_action.js で定義されている pointerup イベントの中で、
    // 外部からのフック関数 onItemDragEnd が呼ばれる仕組みを利用します。
    
    // 元々 onItemDragEnd が定義されていれば保持しておく（ショートカット用など）
    const originalOnItemDragEnd = window.onItemDragEnd;

    window.onItemDragEnd = function(dropTarget) {
        // ショップウィンドウ内に落とされたかのファジー判定
        const shopWin = dropTarget.closest('#shopWindow');
        
        if (shopWin && window.shopState && window.shopState.isOpen && window.shopState.mode === 'sell') {
            let targetSlotIdx = -1;
            const shopSlot = dropTarget.closest('.shop-sell-slot');
            
            if (shopSlot) {
                // 特定の枠に落とした場合
                targetSlotIdx = parseInt(shopSlot.dataset.slotIdx);
            } else {
                // ウィンドウ内の適当な場所に落とした場合、最初の空き枠を探す
                for (let i = 0; i < window.shopState.cart.length; i++) {
                    if (!window.shopState.cart[i]) { 
                        targetSlotIdx = i; 
                        break; 
                    }
                }
            }

            if (targetSlotIdx !== -1) {
                // 個数選択ポップアップを呼び出す
                if (typeof window.promptShopSellCount === 'function') {
                    window.promptShopSellCount(window.dragState.item, targetSlotIdx);
                }
            } else {
                if (typeof window.addLog === 'function') {
                    window.addLog("<span class='color-sys'>売却カートがいっぱいです。</span>", "sys");
                }
            }
            
            // 処理を横取りしたため true を返す（元のインベントリ移動処理をキャンセル）
            return true;
        }

        // ショップ判定に引っかからなかった場合、元のショートカット等のドロップ判定を実行
        if (typeof originalOnItemDragEnd === 'function') {
            return originalOnItemDragEnd(dropTarget);
        }

        // どこにも引っかからなかった場合は通常のインベントリ内移動となるよう false を返す
        return false;
    };
})();