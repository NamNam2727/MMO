// =========================================================
// shop_ui.js
// 街のショップNPC専用のUI（購入・売却カートシステム）の完全版
// スクロール修正・DB価格参照対応版
// =========================================================

(function() {
    window.shopState = {
        isOpen: false,
        npc: null,
        mode: 'buy', 
        cart: Array(24).fill(null), 
        selectedBuyItemIdx: -1,
        selectedSellSlot: -1,
        buyCount: 1
    };

    window.getItemIconHTML = function(item) {
        if (!item) return '';
        let borderRadius = '4px';
        if (item.type === 'consume' || (item.type === 'equip' && item.equipSlot !== 'weapon' && item.equipSlot !== 'armor')) {
            borderRadius = '50%';
        }
        if (item.chipData) borderRadius = '0';
        return `<div class="item-icon" style="background:${item.color}; border-radius:${borderRadius}; width:100%; height:100%;"></div>`;
    };

    window.initShopUI = function() {
        const shopWin = document.createElement('div');
        shopWin.id = 'shopWindow';
        shopWin.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); display:none; flex-direction:column; width:95vw; max-width:850px; height:85vh; max-height:600px; background:rgba(20,20,30,0.95); border:2px solid #aaa; border-radius:8px; z-index:75; color:#fff; pointer-events:auto; box-shadow:0 10px 30px rgba(0,0,0,0.9);';
        
        // ★修正: タッチ操作などのイベント伝播を停止し、ウィンドウ内のスクロールを機能させる
        shopWin.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if(window.bringToFront) window.bringToFront('shopWindow');
        });
        shopWin.addEventListener('pointermove', (e) => e.stopPropagation());
        shopWin.addEventListener('pointerup', (e) => e.stopPropagation());
        shopWin.addEventListener('wheel', (e) => e.stopPropagation(), {passive: true});
        shopWin.addEventListener('touchstart', (e) => e.stopPropagation(), {passive: true});
        shopWin.addEventListener('touchmove', (e) => e.stopPropagation(), {passive: true});

        shopWin.innerHTML = `
            <div id="shopTitleBar" style="padding:10px; background:linear-gradient(to right, #445, #223); border-bottom:1px solid #777; border-radius:6px 6px 0 0; display:flex; justify-content:space-between; align-items:center; touch-action:none;">
                <div style="font-weight:bold; font-size:16px;">ショップ - <span id="shopNpcName">商人</span></div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="color:#ffd700; font-weight:bold; font-size:16px;">所持金: <span id="shopPlayerGold">0</span> 星粒</div>
                    <div id="shopCloseBtn" style="cursor:pointer; font-size:20px; font-weight:bold; color:#ff5555; padding:0 10px;">×</div>
                </div>
            </div>

            <div style="display:flex; flex:1; overflow:hidden;">
                
                <div style="width:45px; background:rgba(0,0,0,0.3); border-right:1px solid #555; display:flex; flex-direction:column; align-items:center; padding-top:10px; gap:10px; touch-action:none;">
                    <div id="shopTabBuy" class="shop-tab" style="width:36px; height:36px; background:#4CAF50; border:2px solid #fff; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold; font-size:10px; cursor:pointer; box-shadow:0 0 10px rgba(76,175,80,0.5);">かう</div>
                    <div id="shopTabSell" class="shop-tab" style="width:36px; height:36px; background:#555; border:2px solid #777; border-radius:50%; display:flex; justify-content:center; align-items:center; font-weight:bold; font-size:10px; cursor:pointer;">うる</div>
                </div>

                <div style="flex:1; display:flex; flex-direction:column; background:rgba(0,0,0,0.5); position:relative;">
                    <div id="shopBuyArea" style="flex:1; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:5px; touch-action:pan-y;"></div>
                    
                    <div id="shopSellArea" style="flex:1; display:none; flex-direction:column;">
                        <div id="shopCartSlots" style="flex:1; overflow-y:auto; padding:10px; display:grid; grid-template-columns:repeat(4, 1fr); grid-auto-rows:max-content; gap:5px; align-content:start; touch-action:pan-y;"></div>
                        
                        <div style="padding:10px; border-top:1px solid #555; background:rgba(20,20,20,0.8); display:flex; justify-content:space-between; align-items:center; touch-action:none;">
                            <button id="shopOpenBagBtn" style="padding:8px 12px; background:#336699; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">バッグを開く</button>
                            
                            <div style="display:flex; flex-direction:column; align-items:center; font-weight:bold;">
                                <span style="font-size:12px; color:#fff;">売却額:</span>
                                <span id="shopTotalSellPrice" style="color:#ffd700; font-size:16px;">0 星粒</span>
                            </div>
                            
                            <button id="shopSellAllBtn" style="padding:8px 16px; background:#e94560; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">全て売る</button>
                        </div>
                    </div>
                </div>

                <div id="shopRightPanel" style="width:100px; background:rgba(30,30,40,0.9); border-left:1px solid #555; padding:10px; box-sizing:border-box; display:flex; flex-direction:column; gap:10px; overflow-y:auto; touch-action:pan-y;">
                    <div id="shopDetailEmpty" style="color:#888; text-align:center; margin-top:50px; font-size:12px;">アイテムを選択</div>
                    
                    <div id="shopDetailContent" style="display:none; flex-direction:column; gap:10px;">
                        <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
                            <div id="shopDetailIcon" style="width:44px; height:44px; background:#000; border:1px solid #777; border-radius:4px; display:flex; justify-content:center; align-items:center; font-size:20px;"></div>
                            <div id="shopDetailName" style="font-weight:bold; font-size:12px; text-align:center; word-break:break-all;"></div>
                        </div>
                        <div id="shopDetailDesc" style="font-size:10px; color:#ccc; line-height:1.4; min-height:30px;"></div>
                        
                        <div style="font-size:11px; color:#ffd700; text-align:center;">単価:<br><span id="shopDetailUnitPrice" style="font-size:13px; font-weight:bold;">0 星粒</span></div>
                        
                        <hr style="border:0; border-top:1px solid #555; width:100%; margin:2px 0;" />
                        
                        <div id="shopBuyActionArea" style="display:none; flex-direction:column; gap:8px;">
                            <div id="shopBuyAmountCtrl" style="display:flex; flex-direction:column; gap:5px; background:rgba(0,0,0,0.3); padding:5px; border-radius:4px;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <button id="shopBuyMinus" style="width:24px; height:24px; background:#555; color:#fff; border:none; border-radius:4px; font-size:14px;">-</button>
                                    <span id="shopBuyCountText" style="font-weight:bold; font-size:14px;">1</span>
                                    <button id="shopBuyPlus" style="width:24px; height:24px; background:#555; color:#fff; border:none; border-radius:4px; font-size:14px;">+</button>
                                </div>
                                <input type="range" id="shopBuySlider" min="1" max="99" value="1" style="width:100%;">
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:center; font-weight:bold;">
                                <span style="font-size:10px;">合計:</span>
                                <span id="shopBuyTotalPrice" style="color:#ffd700; font-size:13px;">0 星粒</span>
                            </div>
                            <button id="shopBuyBtn" style="padding:8px 5px; background:#4CAF50; color:#fff; border:none; border-radius:4px; font-weight:bold; font-size:12px; cursor:pointer;">購入する</button>
                        </div>

                        <div id="shopSellActionArea" style="display:none; flex-direction:column; gap:8px;">
                            <div style="display:flex; flex-direction:column; align-items:center; font-weight:bold; font-size:12px;">
                                <span style="font-size:10px;">売却数:</span>
                                <span id="shopSellDetailCount">0</span>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:center; font-weight:bold; font-size:12px;">
                                <span style="font-size:10px;">小計:</span>
                                <span id="shopSellDetailTotal" style="color:#ffd700; font-size:13px;">0 星粒</span>
                            </div>
                            <button id="shopSellReturnBtn" style="padding:8px 5px; background:#555; color:#fff; border:none; border-radius:4px; font-weight:bold; font-size:12px; cursor:pointer;">バッグに戻す</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('ui-layer').appendChild(shopWin);

        document.getElementById('shopTabBuy').addEventListener('pointerdown', (e) => { e.stopPropagation(); window.shopState.mode = 'buy'; window.renderShopUI(); });
        document.getElementById('shopTabSell').addEventListener('pointerdown', (e) => { e.stopPropagation(); window.shopState.mode = 'sell'; window.renderShopUI(); });
        document.getElementById('shopCloseBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); window.closeShopWindow(); });
        document.getElementById('shopOpenBagBtn').addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (window.invWindow && window.invWindow.style.display !== 'flex') { if(typeof window.toggleInventory === 'function') window.toggleInventory(); }
            if (window.bringToFront) window.bringToFront('invWindow');
        });

        const updateBuyCount = (val) => {
            if (window.shopState.selectedBuyItemIdx === -1) return;
            const shopItemDef = window.shopState.npc.shopItems[window.shopState.selectedBuyItemIdx];
            const itemId = typeof shopItemDef === 'string' ? shopItemDef : shopItemDef.id;
            const targetRarity = typeof shopItemDef === 'string' ? null : shopItemDef.rarity;
            
            const itemData = window.createItemWithRarity ? window.createItemWithRarity(itemId, targetRarity) : window.ITEM_DB[itemId];
            if (!itemData) return;
            
            const maxStack = itemData.maxStack || 1;
            const maxVal = maxStack === 1 ? 1 : 99;
            
            window.shopState.buyCount = Math.max(1, Math.min(maxVal, val));
            document.getElementById('shopBuySlider').value = window.shopState.buyCount;
            document.getElementById('shopBuyCountText').innerText = window.shopState.buyCount;
            document.getElementById('shopBuyTotalPrice').innerText = `${(itemData.price || 0) * window.shopState.buyCount} 星粒`;
        };
        
        document.getElementById('shopBuyMinus').onclick = () => updateBuyCount(window.shopState.buyCount - 1);
        document.getElementById('shopBuyPlus').onclick = () => updateBuyCount(window.shopState.buyCount + 1);
        
        const buySlider = document.getElementById('shopBuySlider');
        buySlider.oninput = (e) => updateBuyCount(parseInt(e.target.value));
        buySlider.addEventListener('pointerdown', (e) => e.stopPropagation());
        buySlider.addEventListener('pointermove', (e) => e.stopPropagation());
        buySlider.addEventListener('touchstart', (e) => e.stopPropagation(), {passive: true});
        buySlider.addEventListener('touchmove', (e) => e.stopPropagation(), {passive: true});
        
        document.getElementById('shopBuyBtn').onclick = () => { if (typeof window.executeShopBuy === 'function') window.executeShopBuy(); };
        document.getElementById('shopSellAllBtn').onclick = () => { if (typeof window.executeShopSellAll === 'function') window.executeShopSellAll(); };
        document.getElementById('shopSellReturnBtn').onclick = () => {
            if (window.shopState.selectedSellSlot !== -1) {
                window.shopState.cart[window.shopState.selectedSellSlot] = null;
                window.shopState.selectedSellSlot = -1;
                window.renderShopUI();
                if (typeof window.renderInventory === 'function') window.renderInventory();
            }
        };
    };

    window.validateShopCart = function() {
        let changed = false;
        for (let i = 0; i < window.shopState.cart.length; i++) {
            const cartItem = window.shopState.cart[i];
            if (cartItem) {
                let actualItem = null;
                for (const tab in window.player.inventory) {
                    actualItem = window.player.inventory[tab].items.find(it => it.uid === cartItem.item.uid);
                    if (actualItem) break;
                }
                if (!actualItem || actualItem.count < cartItem.count) {
                    window.shopState.cart[i] = null;
                    if (window.shopState.selectedSellSlot === i) window.shopState.selectedSellSlot = -1;
                    changed = true;
                }
            }
        }
        if (changed) window.renderShopUI();
    };

    window.openShopWindow = function(npc) {
        if (!npc || !npc.shopItems) return;
        window.shopState.isOpen = true; window.shopState.npc = npc; window.shopState.mode = 'buy';
        window.shopState.selectedBuyItemIdx = -1; window.shopState.selectedSellSlot = -1;
        document.getElementById('shopNpcName').innerText = npc.name;
        
        const shopWin = document.getElementById('shopWindow');
        shopWin.style.display = 'flex';
        
        if(window.bringToFront) window.bringToFront('shopWindow');
        window.renderShopUI();
    };

    window.closeShopWindow = function() {
        window.shopState.isOpen = false;
        document.getElementById('shopWindow').style.display = 'none';
        window.shopState.cart = Array(24).fill(null); 
        
        if (window.player) {
            window.player.targetNpc = null;
        }

        if (window.invWindow && window.invWindow.style.display === 'flex') { if(typeof window.toggleInventory === 'function') window.toggleInventory(); }
        if (typeof window.renderInventory === 'function') window.renderInventory();
    };

    window.executeShopBuy = function() {
        if (window.shopState.selectedBuyItemIdx === -1) return;
        const shopItemDef = window.shopState.npc.shopItems[window.shopState.selectedBuyItemIdx];
        const itemId = typeof shopItemDef === 'string' ? shopItemDef : shopItemDef.id;
        const targetRarity = typeof shopItemDef === 'string' ? null : shopItemDef.rarity;
        
        const itemData = window.createItemWithRarity ? window.createItemWithRarity(itemId, targetRarity) : window.ITEM_DB[itemId];
        if (!itemData) return;
        
        const totalCost = (itemData.price || 0) * window.shopState.buyCount;
        if (window.player.gold < totalCost) {
            if(typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>星粒が足りない！</span>`, 'sys');
            return;
        }
        
        let newItem = JSON.parse(JSON.stringify(itemData));
        newItem.count = window.shopState.buyCount;
        
        const added = window.addItemToInventory(newItem);
        if (added) {
            window.player.gold -= totalCost;
            if(typeof window.addLog === 'function') window.addLog(`<span class='color-sys'><span class='color-item'>${itemData.name}</span> x ${window.shopState.buyCount} を購入した。</span>`, 'sys');
            window.renderShopUI();
            if (typeof window.renderInventory === 'function') window.renderInventory();
            if (typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
        }
    };

    window.executeShopSellAll = function() {
        let totalGold = 0; let itemsSold = 0;
        for (let i = 0; i < window.shopState.cart.length; i++) {
            const cartItem = window.shopState.cart[i];
            if (cartItem) {
                let foundTab = null; let foundIdx = -1;
                for (const tab in window.player.inventory) {
                    const idx = window.player.inventory[tab].items.findIndex(it => it.uid === cartItem.item.uid);
                    if (idx !== -1) { foundTab = tab; foundIdx = idx; break; }
                }
                if (foundTab && foundIdx !== -1) {
                    const invItem = window.player.inventory[foundTab].items[foundIdx];
                    if (invItem.count > cartItem.count) invItem.count -= cartItem.count;
                    else window.player.inventory[foundTab].items.splice(foundIdx, 1);
                    
                    const dbItemData = window.createItemWithRarity ? window.createItemWithRarity(invItem.id, invItem.rarity) : (window.ITEM_DB[invItem.id] || invItem);
                    const basePrice = dbItemData.price || 0;
                    const unitPrice = Math.floor(basePrice / 10);
                    
                    totalGold += unitPrice * cartItem.count;
                    itemsSold++;
                }
                window.shopState.cart[i] = null;
            }
        }

        if (itemsSold > 0) {
            window.player.gold += totalGold;
            if (typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>アイテムを売却し、<span class='color-item'>${totalGold} 星粒</span> を得た。</span>`, 'sys');
            window.shopState.selectedSellSlot = -1;
            window.renderShopUI();
            if (typeof window.renderInventory === 'function') window.renderInventory();
            if (typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
        }
    };

    window.renderShopUI = function() {
        if (!window.shopState.isOpen) return;
        document.getElementById('shopPlayerGold').innerText = window.player.gold;

        const tabBuy = document.getElementById('shopTabBuy'); const tabSell = document.getElementById('shopTabSell');
        const areaBuy = document.getElementById('shopBuyArea'); const areaSell = document.getElementById('shopSellArea');

        if (window.shopState.mode === 'buy') {
            tabBuy.style.background = '#4CAF50'; tabBuy.style.borderColor = '#fff'; tabBuy.style.boxShadow = '0 0 10px rgba(76,175,80,0.5)';
            tabSell.style.background = '#555'; tabSell.style.borderColor = '#777'; tabSell.style.boxShadow = 'none';
            areaBuy.style.display = 'flex'; areaSell.style.display = 'none';
            
            if (window.invWindow && window.invWindow.style.display === 'flex') { if(typeof window.toggleInventory === 'function') window.toggleInventory(); }

            areaBuy.innerHTML = '';
            
            window.shopState.npc.shopItems.forEach((shopItemDef, idx) => {
                const itemId = typeof shopItemDef === 'string' ? shopItemDef : shopItemDef.id;
                const targetRarity = typeof shopItemDef === 'string' ? null : shopItemDef.rarity;
                
                const itemData = window.createItemWithRarity ? window.createItemWithRarity(itemId, targetRarity) : window.ITEM_DB[itemId];
                if (!itemData) return;
                
                const rarityColor = window.RARITY && window.RARITY[itemData.rarity] ? window.RARITY[itemData.rarity].color : '#fff';
                
                const row = document.createElement('div');
                row.style.cssText = `display:flex; align-items:center; gap:10px; padding:8px; background:rgba(255,255,255,0.1); border-radius:4px; cursor:pointer; border:2px solid ${window.shopState.selectedBuyItemIdx === idx ? '#4CAF50' : 'transparent'};`;
                
                row.innerHTML = `
                    <div style="width:36px; height:36px; background:#000; border:2px solid ${rarityColor}; border-radius:4px; display:flex; justify-content:center; align-items:center; font-size:18px;">${window.getItemIconHTML(itemData)}</div>
                    <div style="flex:1; font-weight:bold; font-size:14px; color:${rarityColor};">${itemData.name}</div>
                    <div style="color:#ffd700; font-weight:bold; font-size:14px;">${itemData.price || 0} 星粒</div>
                `;
                row.onclick = () => { window.shopState.selectedBuyItemIdx = idx; window.shopState.buyCount = 1; window.renderShopUI(); };
                areaBuy.appendChild(row);
            });
        } else {
            tabBuy.style.background = '#555'; tabBuy.style.borderColor = '#777'; tabBuy.style.boxShadow = 'none';
            tabSell.style.background = '#e94560'; tabSell.style.borderColor = '#fff'; tabSell.style.boxShadow = '0 0 10px rgba(233,69,96,0.5)';
            areaBuy.style.display = 'none'; areaSell.style.display = 'flex';
            
            if (window.invWindow && window.invWindow.style.display !== 'flex') { if(typeof window.toggleInventory === 'function') window.toggleInventory(); }
            if (window.bringToFront) window.bringToFront('invWindow');

            const slotsDiv = document.getElementById('shopCartSlots');
            slotsDiv.innerHTML = ''; let totalSellPrice = 0;

            for(let i=0; i<24; i++) {
                const cartItem = window.shopState.cart[i];
                const slotDiv = document.createElement('div');
                slotDiv.className = 'shop-sell-slot'; slotDiv.dataset.slotIdx = i;
                slotDiv.style.cssText = `width:100%; aspect-ratio:1; background:rgba(255,255,255,0.1); border:1px solid #777; border-radius:4px; position:relative; box-sizing:border-box; cursor:pointer;`;
                
                if (window.shopState.selectedSellSlot === i) { slotDiv.style.borderColor = '#e94560'; slotDiv.style.borderStyle = 'solid'; slotDiv.style.borderWidth = '2px'; }

                if (cartItem) {
                    slotDiv.style.borderStyle = 'solid'; slotDiv.style.borderWidth = '2px';
                    slotDiv.style.borderColor = window.shopState.selectedSellSlot === i ? '#e94560' : '#888';
                    
                    const rarityColor = window.RARITY && window.RARITY[cartItem.item.rarity] ? window.RARITY[cartItem.item.rarity].color : '#888';
                    slotDiv.style.borderColor = window.shopState.selectedSellSlot === i ? '#e94560' : rarityColor;

                    slotDiv.innerHTML = `
                        <div style="position:absolute; top:0; left:0; width:100%; height:100%;">${window.getItemIconHTML(cartItem.item)}</div>
                        <div style="position:absolute; bottom:2px; right:4px; font-size:12px; font-weight:bold; text-shadow:1px 1px 1px #000;">${cartItem.count}</div>
                        <div class="shop-slot-remove" style="position:absolute; top:-5px; right:-5px; width:20px; height:20px; background:#ff4444; color:#fff; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:12px; font-weight:bold; cursor:pointer; z-index:10; box-shadow:0 2px 4px rgba(0,0,0,0.5);">×</div>
                    `;
                    
                    const dbItemData = window.createItemWithRarity ? window.createItemWithRarity(cartItem.item.id, cartItem.item.rarity) : (window.ITEM_DB[cartItem.item.id] || cartItem.item);
                    const basePrice = dbItemData.price || 0;
                    const unitPrice = Math.floor(basePrice / 10);
                    
                    totalSellPrice += unitPrice * cartItem.count;
                }

                slotDiv.onclick = (e) => {
                    if (e.target.classList.contains('shop-slot-remove')) {
                        window.shopState.cart[i] = null;
                        if (window.shopState.selectedSellSlot === i) window.shopState.selectedSellSlot = -1;
                        window.renderShopUI();
                        if (typeof window.renderInventory === 'function') window.renderInventory();
                        return;
                    }
                    if (cartItem) { window.shopState.selectedSellSlot = i; window.renderShopUI(); }
                };
                slotsDiv.appendChild(slotDiv);
            }
            document.getElementById('shopTotalSellPrice').innerText = `${totalSellPrice} 星粒`;
        }

        const detailEmpty = document.getElementById('shopDetailEmpty');
        const detailContent = document.getElementById('shopDetailContent');

        if (window.shopState.mode === 'buy' && window.shopState.selectedBuyItemIdx !== -1) {
            const shopItemDef = window.shopState.npc.shopItems[window.shopState.selectedBuyItemIdx];
            const itemId = typeof shopItemDef === 'string' ? shopItemDef : shopItemDef.id;
            const targetRarity = typeof shopItemDef === 'string' ? null : shopItemDef.rarity;
            
            const itemData = window.createItemWithRarity ? window.createItemWithRarity(itemId, targetRarity) : window.ITEM_DB[itemId];
            if (!itemData) return;
            
            detailEmpty.style.display = 'none'; detailContent.style.display = 'flex';
            document.getElementById('shopBuyActionArea').style.display = 'flex'; document.getElementById('shopSellActionArea').style.display = 'none';
            document.getElementById('shopDetailIcon').innerHTML = window.getItemIconHTML(itemData);
            document.getElementById('shopDetailName').innerText = itemData.name;
            document.getElementById('shopDetailDesc').innerText = itemData.desc || '';
            document.getElementById('shopDetailUnitPrice').innerText = `${itemData.price || 0} 星粒`;
            
            const rarityColor = window.RARITY && window.RARITY[itemData.rarity] ? window.RARITY[itemData.rarity].color : '#fff';
            document.getElementById('shopDetailName').style.color = rarityColor;
            
            const maxStack = itemData.maxStack || 1;
            if (maxStack === 1) {
                document.getElementById('shopBuyAmountCtrl').style.display = 'none';
                window.shopState.buyCount = 1;
            } else {
                document.getElementById('shopBuyAmountCtrl').style.display = 'flex';
            }
            
            document.getElementById('shopBuySlider').value = window.shopState.buyCount;
            document.getElementById('shopBuyCountText').innerText = window.shopState.buyCount;
            document.getElementById('shopBuyTotalPrice').innerText = `${(itemData.price || 0) * window.shopState.buyCount} 星粒`;
            
        } else if (window.shopState.mode === 'sell' && window.shopState.selectedSellSlot !== -1) {
            const cartItem = window.shopState.cart[window.shopState.selectedSellSlot];
            if (cartItem) {
                detailEmpty.style.display = 'none'; detailContent.style.display = 'flex';
                document.getElementById('shopBuyActionArea').style.display = 'none'; document.getElementById('shopSellActionArea').style.display = 'flex';
                document.getElementById('shopDetailIcon').innerHTML = window.getItemIconHTML(cartItem.item);
                document.getElementById('shopDetailName').innerText = cartItem.item.name;
                document.getElementById('shopDetailDesc').innerText = cartItem.item.desc || '';
                
                const dbItemData = window.createItemWithRarity ? window.createItemWithRarity(cartItem.item.id, cartItem.item.rarity) : (window.ITEM_DB[cartItem.item.id] || cartItem.item);
                const basePrice = dbItemData.price || 0;
                const unitPrice = Math.floor(basePrice / 10);
                
                const rarityColor = window.RARITY && window.RARITY[cartItem.item.rarity] ? window.RARITY[cartItem.item.rarity].color : '#fff';
                document.getElementById('shopDetailName').style.color = rarityColor;
                
                document.getElementById('shopDetailUnitPrice').innerText = `${unitPrice} 星粒`;
                document.getElementById('shopSellDetailCount').innerText = `${cartItem.count}`;
                document.getElementById('shopSellDetailTotal').innerText = `${unitPrice * cartItem.count} 星粒`;
            } else { detailEmpty.style.display = 'block'; detailContent.style.display = 'none'; }
        } else {
            detailEmpty.style.display = 'block'; detailContent.style.display = 'none';
        }
    };

    window.promptShopSellCount = function(item, slotIdx) {
        if (!item) return;
        let modal = document.getElementById('shopSellCountModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'shopSellCountModal';
            modal.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:260px; background:rgba(20,20,30,0.95); border:2px solid #aaa; border-radius:8px; z-index:100; color:#fff; display:none; flex-direction:column; padding:15px; box-shadow:0 10px 30px rgba(0,0,0,0.9); pointer-events:auto;';
            
            // ★修正: こちらもイベント伝播を止める
            modal.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                if(window.bringToFront) window.bringToFront('shopSellCountModal');
            });
            modal.addEventListener('pointermove', (e) => e.stopPropagation());
            modal.addEventListener('pointerup', (e) => e.stopPropagation());
            modal.addEventListener('wheel', (e) => e.stopPropagation(), {passive: true});
            modal.addEventListener('touchstart', (e) => e.stopPropagation(), {passive: true});
            modal.addEventListener('touchmove', (e) => e.stopPropagation(), {passive: true});
            
            document.getElementById('ui-layer').appendChild(modal);
        }
        
        let currentVal = 1; 
        const maxVal = item.count || 1;
        
        const dbItemData = window.createItemWithRarity ? window.createItemWithRarity(item.id, item.rarity) : (window.ITEM_DB[item.id] || item);
        const basePrice = dbItemData.price || 0;
        const unitPrice = Math.floor(basePrice / 10);
        
        const descText = (item.desc || '').replace(/\\n/g, '<br>');
        const amountCtrlDisplay = maxVal > 1 ? 'block' : 'none';
        const rarityColor = window.RARITY && window.RARITY[item.rarity] ? window.RARITY[item.rarity].color : '#fff';
        
        modal.innerHTML = `
            <div style="font-weight:bold; text-align:center; margin-bottom:10px; font-size:16px;">売却リストに追加</div>
            
            <div style="display:flex; flex-direction:column; align-items:center; gap:5px; margin-bottom:10px; padding:10px; background:rgba(0,0,0,0.3); border-radius:6px;">
                <div style="width:44px; height:44px; background:#000; border:2px solid ${rarityColor}; border-radius:4px; display:flex; justify-content:center; align-items:center; font-size:24px;">${window.getItemIconHTML(item)}</div>
                <div style="font-weight:bold; font-size:14px; text-align:center; color:${rarityColor};">${item.name}</div>
                <div style="font-size:11px; color:#ccc; line-height:1.4; text-align:center;">${descText}</div>
                <div style="font-size:12px; color:#ffd700; margin-top:5px;">単価: ${unitPrice} 星粒</div>
            </div>
            
            <div id="shopSellAmountCtrl" style="display:${amountCtrlDisplay}; width:100%;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <button id="shopSellCountMinus" style="width:40px; height:40px; background:#555; color:#fff; border:none; border-radius:4px; font-size:20px; font-weight:bold;">-</button>
                    <div id="shopSellCountText" style="font-size:20px; font-weight:bold;">${currentVal}</div>
                    <button id="shopSellCountPlus" style="width:40px; height:40px; background:#555; color:#fff; border:none; border-radius:4px; font-size:20px; font-weight:bold;">+</button>
                </div>
                <input type="range" id="shopSellCountSlider" min="1" max="${maxVal}" value="${currentVal}" style="width:100%; margin-bottom:20px;">
            </div>
            
            <div style="display:flex; gap:10px; width:100%;">
                <button id="shopSellCountCancel" style="flex:1; padding:10px; background:#555; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">キャンセル</button>
                <button id="shopSellCountOk" style="flex:1; padding:10px; background:#e94560; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">リストに追加</button>
            </div>
        `;
        modal.style.display = 'flex';
        if (window.bringToFront) window.bringToFront('shopSellCountModal');
        
        const updateVal = (val) => {
            currentVal = Math.max(1, Math.min(maxVal, val));
            const slider = document.getElementById('shopSellCountSlider');
            const text = document.getElementById('shopSellCountText');
            if(slider) slider.value = currentVal;
            if(text) text.innerText = currentVal;
        };
        
        const btnMinus = document.getElementById('shopSellCountMinus');
        if(btnMinus) btnMinus.onclick = () => updateVal(currentVal - 1);
        
        const btnPlus = document.getElementById('shopSellCountPlus');
        if(btnPlus) btnPlus.onclick = () => updateVal(currentVal + 1);
        
        const sellSlider = document.getElementById('shopSellCountSlider');
        if(sellSlider) {
            sellSlider.oninput = (e) => updateVal(parseInt(e.target.value));
            sellSlider.addEventListener('pointerdown', (e) => e.stopPropagation());
            sellSlider.addEventListener('pointermove', (e) => e.stopPropagation());
            sellSlider.addEventListener('touchstart', (e) => e.stopPropagation(), {passive: true});
            sellSlider.addEventListener('touchmove', (e) => e.stopPropagation(), {passive: true});
        }
        
        document.getElementById('shopSellCountCancel').onclick = () => { modal.style.display = 'none'; };
        
        document.getElementById('shopSellCountOk').onclick = () => {
            modal.style.display = 'none';
            for(let i=0; i<window.shopState.cart.length; i++){
                if (window.shopState.cart[i] && window.shopState.cart[i].item.uid === item.uid) { window.shopState.cart[i] = null; }
            }
            window.shopState.cart[slotIdx] = { item: item, count: currentVal };
            window.shopState.selectedSellSlot = slotIdx;
            window.renderShopUI();
            if (typeof window.renderInventory === 'function') window.renderInventory();
        };
    };
})();
