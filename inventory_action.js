// =========================================================
// inventory_action.js
// インベントリの初期化、イベントリスナー(D&D含む)、アイテム操作ロジック
// =========================================================

window.initInventoryUI = function() {
    window.invWindow = document.getElementById('invWindow');
    const invTitleBar = document.getElementById('invTitleBar');
    const invTabs = document.getElementById('invTabs');
    const invContent = document.getElementById('invContent');
    const itemDetail = document.getElementById('itemDetail');

    // =========================================================
    // ★変更: プレイヤーの有無に関わらず、DOMへのイベント登録は最初に行う
    // (二重登録を防ぐためフラグで管理)
    // =========================================================
    if (!window.__invDOMEventsRegistered) {
        window.__invDOMEventsRegistered = true;

        // --- バッグ開閉ボタン ---
        document.getElementById('bagBtn').addEventListener('pointerdown', (e) => { 
            e.stopPropagation(); 
            if(typeof window.toggleInventory === 'function') window.toggleInventory(); 
        });
        
        document.getElementById('invCloseBtn').addEventListener('pointerdown', (e) => { 
            e.stopPropagation(); 
            if(typeof window.toggleInventory === 'function') window.toggleInventory(); 
        });

        // --- ウィンドウのドラッグ移動 ---
        let isDraggingInv = false; 
        let dragOffsetX = 0; 
        let dragOffsetY = 0;
        
        invTitleBar.addEventListener('pointerdown', (e) => {
            isDraggingInv = true;
            const rect = window.invWindow.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            
            window.invWindow.style.transform = 'none'; 
            window.invWindow.style.left = rect.left + 'px';
            window.invWindow.style.top = rect.top + 'px';
            
            e.stopPropagation();
        });

        window.addEventListener('pointermove', (e) => {
            if (isDraggingInv) {
                window.invWindow.style.left = (e.clientX - dragOffsetX) + 'px';
                window.invWindow.style.top = (e.clientY - dragOffsetY) + 'px';
                return;
            }

            if (window.isDraggingItem) {
                window.lastDragX = e.clientX; 
                window.lastDragY = e.clientY;
                const dragGhost = document.getElementById('dragGhost');
                if (dragGhost) {
                    dragGhost.style.left = (e.clientX - 22) + 'px';
                    dragGhost.style.top = (e.clientY - 22) + 'px';
                }
                
                // ドラッグ中の自動スクロール判定
                if (window.invWindow && window.invWindow.style.display === 'flex') {
                    window.checkAutoScroll(e.clientY);
                }
            }
        });

        window.addEventListener('pointerup', (e) => {
            if (isDraggingInv) {
                isDraggingInv = false;
                return;
            }
            
            if (window.dragState.active) {
                window.dragState.active = false;
                
                if (window.lpTimer) {
                    clearTimeout(window.lpTimer);
                    window.lpTimer = null;
                }

                window.stopAutoScroll();

                const dragGhost = document.getElementById('dragGhost');
                if (dragGhost) dragGhost.style.display = 'none';

                document.body.style.touchAction = '';

                const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
                window.isDraggingItem = false;

                if (dropTarget) {
                    // =========================================================
                    // ★追加: ショップ売却スロットへのドロップ判定
                    // =========================================================
                    const shopSlot = dropTarget.closest('.shop-sell-slot');
                    if (shopSlot && window.shopState && window.shopState.isOpen && window.shopState.mode === 'sell') {
                        const slotIdx = parseInt(shopSlot.dataset.slotIdx);
                        if (typeof window.promptShopSellCount === 'function') {
                            window.promptShopSellCount(window.dragState.item, slotIdx);
                        }
                        if (typeof window.renderInventory === 'function') window.renderInventory();
                        window.justDropped = true;
                        if(typeof window.onItemDragEnd === 'function') window.onItemDragEnd(dropTarget);
                        return;
                    }

                    // --- 既存の処理 ---
                    // 先に外部モジュール（ショートカット等）のドロップ判定を呼ぶ
                    if (typeof window.onItemDragEnd === 'function') {
                        const handledByOuter = window.onItemDragEnd(dropTarget);
                        if (handledByOuter) {
                            window.justDropped = true;
                            if (typeof window.renderInventory === 'function') window.renderInventory();
                            return;
                        }
                    }

                    // インベントリ内の並び替え処理
                    const targetSlot = dropTarget.closest('.inv-slot');
                    if (targetSlot) {
                        const targetIdx = parseInt(targetSlot.dataset.index);
                        const tabItems = window.player.inventory[window.dragState.sourceTab].items;
                        
                        if (targetIdx !== window.dragState.sourceIdx) {
                            if (targetIdx < tabItems.length) {
                                const temp = tabItems[window.dragState.sourceIdx];
                                tabItems[window.dragState.sourceIdx] = tabItems[targetIdx];
                                tabItems[targetIdx] = temp;
                            } else {
                                const item = tabItems.splice(window.dragState.sourceIdx, 1)[0];
                                tabItems.push(item);
                            }
                        }
                        window.justDropped = true;
                    }
                }
                
                if (typeof window.renderInventory === 'function') window.renderInventory();
            }
        });

        // インベントリ内タップ時の前面化と詳細閉じ
        window.invWindow.addEventListener('pointerdown', (e) => {
            if(window.bringToFront) window.bringToFront('invWindow');
            e.stopPropagation();
            if (itemDetail && itemDetail.style.display !== 'none' && !itemDetail.contains(e.target) && !e.target.closest('.inv-slot')) {
                itemDetail.style.display = 'none';
            }
        });

        // --- 「使う/装備/はずす」ボタンの処理 ---
        document.getElementById('btnUseEquip').addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const btn = e.target;
            const tabId = window.tabsList[window.currentTabIndex];
            const item = window.player.inventory[tabId].items[window.selectedItemIndex];

            if (!item) return;

            // スキルチップ素材の場合のフック
            if (btn.dataset.isChip === "true") {
                if(typeof window.openSkillCreateFromItem === 'function') {
                    window.openSkillCreateFromItem(item);
                    itemDetail.style.display = 'none';
                }
                return;
            }
            
            // スキルの場合のフック
            if (btn.dataset.isSkill === "true") {
                if(typeof window.executeSkill === 'function') {
                    window.executeSkill(item);
                    itemDetail.style.display = 'none';
                }
                return;
            }

            if (item.type === 'equip') {
                if (item.isEquipped) {
                    item.isEquipped = false;
                    window.player.equipped[item.equipSlot] = null;
                } else {
                    const currentEquip = window.player.equipped[item.equipSlot];
                    if (currentEquip) {
                        const prevItem = window.player.inventory[tabId].items.find(i => i.id === currentEquip.id && i.isEquipped);
                        if (prevItem) prevItem.isEquipped = false;
                    }
                    item.isEquipped = true;
                    window.player.equipped[item.equipSlot] = item;
                }
                if (typeof window.updatePlayerStats === 'function') window.updatePlayerStats();
            } else if (item.type === 'consume') {
                // クールタイム中なら使用不可
                if (window.itemCooldowns[item.id] > 0) return;

                if (item.restore) {
                    window.player.hp = Math.min(window.player.maxHp, window.player.hp + item.restore);
                    if(typeof window.addLog === 'function') window.addLog(`<span class='color-sys'><span class='color-item'>${item.name}</span> を使い、HPが <span class='color-heal'>${item.restore}</span> 回復した。</span>`, 'sys');
                    
                    if (typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
                    
                    const statusWindow = document.getElementById('statusWindow');
                    if (statusWindow && statusWindow.style.display === 'flex' && typeof window.updateStatusUI === 'function') {
                        window.updateStatusUI();
                    }
                }
                
                // アイテム固有のCTをセット (2秒)
                window.itemCooldowns[item.id] = 2.0;
                window.itemMaxCooldowns[item.id] = 2.0;

                item.count--;
                if (item.count <= 0) {
                    window.player.inventory[tabId].items.splice(window.selectedItemIndex, 1);
                    itemDetail.style.display = 'none';
                    window.selectedItemIndex = -1;
                } else {
                    if (typeof window.showItemDetail === 'function') {
                        const slots = document.querySelectorAll('.inv-slot');
                        if(slots[window.selectedItemIndex]) {
                            window.showItemDetail(item, slots[window.selectedItemIndex]);
                        }
                    }
                }
            }

            if (typeof window.renderInventory === 'function') window.renderInventory();
        });
    }
};

window.toggleInventory = function() {
    window.ensureUIDs();
    window.compressStacks();
    const invWindow = document.getElementById('invWindow');
    if (invWindow.style.display === 'none' || invWindow.style.display === '') {
        invWindow.style.display = 'flex';
        if (typeof window.renderInventory === 'function') window.renderInventory();
        if(window.bringToFront) window.bringToFront('invWindow');
    } else {
        invWindow.style.display = 'none';
        document.getElementById('itemDetail').style.display = 'none';
    }
};

// ==========================================
// ドラッグ中の自動スクロール判定
// ==========================================
window.checkAutoScroll = function(y) {
    const invContent = document.getElementById('invContent');
    if (window.invWindow.style.display !== 'flex' || !invContent) return;
    
    const rect = invContent.getBoundingClientRect(); 
    const threshold = 35; 
    
    if (y > rect.top && y < rect.top + threshold) {
        window.startAutoScroll(-6); 
    } else if (y < rect.bottom && y > rect.bottom - threshold) {
        window.startAutoScroll(6);  
    } else {
        window.stopAutoScroll();
    }
};

window.startAutoScroll = function(dy) {
    if (!window.scrollInterval) {
        window.scrollInterval = setInterval(() => { 
            const invContent = document.getElementById('invContent'); 
            if (invContent) invContent.scrollTop += dy; 
        }, 20);
    }
};

window.stopAutoScroll = function() {
    if (window.scrollInterval) { 
        clearInterval(window.scrollInterval); 
        window.scrollInterval = null; 
    }
};

// --- アイテム取得のオーバーライド処理 (所持枠いっぱい時のログ追加) ---
const origAddItemToInventory = window.addItemToInventory;
window.addItemToInventory = function(item) {
    const added = origAddItemToInventory ? origAddItemToInventory(item) : false;
    if (!added) {
        if (typeof window.addLog === 'function') {
            window.addLog(`<span class='color-sys'>インベントリがいっぱいで ${item.name} を拾えなかった。</span>`, 'sys');
        }
        // スタック防止のためターゲットを解除
        if (window.player && window.player.targetItem && window.player.targetItem.uid === item.uid) {
            window.player.targetItem = null;
            window.playerPath = [];
        }
    }
    return added;
};
