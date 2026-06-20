// =========================================================
// inventory_ui.js
// インベントリの描画、タブ切り替え、アイテム詳細表示(動的テキスト対応)
// =========================================================

window.tabsList = ['equip', 'consume', 'skill', 'etc', 'important'];
window.currentTabIndex = 0;
window.selectedItemIndex = -1;

window.isDraggingItem = false;
window.dragState = { active: false, item: null, sourceIdx: -1, sourceTab: null };
window.lpStartX = 0;
window.lpStartY = 0;
window.lastDragX = 0; 
window.lastDragY = 0;
window.lpTimer = null;
window.justDropped = false;

window.itemCooldowns = {};

window.ensureUIDs = function() {
    if (!window.player || !window.player.inventory) return;
    for (const tab in window.player.inventory) {
        window.player.inventory[tab].items.forEach(item => {
            if (!item.uid) item.uid = 'uid_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
        });
    }
};

window.compressStacks = function() {
    if (!window.player || !window.player.inventory) return;
    for (const tab in window.player.inventory) {
        const items = window.player.inventory[tab].items;
        if (!items) continue;
        const itemsById = {};
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (item.maxStack && item.maxStack > 1) {
                if (!itemsById[item.id]) {
                    itemsById[item.id] = [item];
                } else {
                    let target = itemsById[item.id].find(it => it.count < it.maxStack);
                    if (target) {
                        const space = target.maxStack - target.count;
                        const moveCount = Math.min(space, item.count);
                        target.count += moveCount;
                        item.count -= moveCount;
                        if (item.count <= 0) items.splice(i, 1);
                        else itemsById[item.id].push(item);
                    } else {
                        itemsById[item.id].push(item);
                    }
                }
            }
        }
    }
};

window.renderInventory = function() {
    const invTabs = document.getElementById('invTabs');
    const invContent = document.getElementById('invContent');
    const itemDetail = document.getElementById('itemDetail');
    if (!invTabs || !invContent || !itemDetail) return;

    // ★追加: ショップの売却カート整合性チェック
    if (typeof window.validateShopCart === 'function') {
        window.validateShopCart();
    }

    invTabs.innerHTML = '';
    const tabNames = { equip: '装備', consume: '消費', skill: 'スキル', etc: 'ETC', important: '重要' };
    window.tabsList.forEach((tabId, index) => {
        const tab = document.createElement('div');
        tab.className = 'inv-tab' + (index === window.currentTabIndex ? ' active' : '');
        tab.innerText = tabNames[tabId];
        tab.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            window.currentTabIndex = index;
            window.selectedItemIndex = -1;
            itemDetail.style.display = 'none';
            window.renderInventory();
        });
        invTabs.appendChild(tab);
    });

    invContent.innerHTML = '';
    const tabId = window.tabsList[window.currentTabIndex];
    if (window.player.inventory[tabId]) {
        window.player.inventory[tabId].items.forEach((item, index) => {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            slot.dataset.index = index;
            
            // ★追加: ショップで売却カートに入っているかチェック
            let isLockedByShop = false;
            if (window.shopState && window.shopState.isOpen && window.shopState.mode === 'sell') {
                isLockedByShop = window.shopState.cart.some(c => c && c.item && c.item.uid === item.uid);
            }

            if (item.isEquipped) {
                slot.classList.add('equipped');
            } else if (isLockedByShop) {
                // ★追加: カート登録中は半透明にしてドラッグ・タップ不可にする
                slot.style.opacity = '0.3';
                slot.style.pointerEvents = 'none'; 
            }

            if (item.type === 'equip') {
                if (item.equipSlot === 'weapon') slot.innerHTML = `<div class="item-icon" style="background:${item.color};">剣</div>`;
                else if (item.equipSlot === 'armor') slot.innerHTML = `<div class="item-icon" style="background:${item.color};">鎧</div>`;
                else slot.innerHTML = `<div class="item-icon" style="background:${item.color};">飾</div>`;
            } else if (item.type === 'consume' && item.restore) {
                slot.innerHTML = `<div class="item-icon" style="background:${item.color}; border-radius:50%;">薬</div>`;
            } else if (item.chipData) {
                slot.innerHTML = `<div class="item-icon" style="background:${item.color}; border-radius:0;">CP</div>`;
            } else {
                slot.innerHTML = `<div class="item-icon" style="background:${item.color};">他</div>`;
            }
            
            if (item.maxStack > 1) {
                slot.innerHTML += `<div class="item-count">${item.count}</div>`;
            }

            // CTオーバーレイの描画
            if (window.itemCooldowns && window.itemCooldowns[item.id] > 0 && window.itemMaxCooldowns[item.id] > 0) {
                const ratio = window.itemCooldowns[item.id] / window.itemMaxCooldowns[item.id];
                slot.innerHTML += `<div style="position:absolute; bottom:0; left:0; width:100%; height:${ratio * 100}%; background:rgba(0,0,0,0.6); pointer-events:none;"></div>`;
                slot.innerHTML += `<div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:white; font-size:12px; font-weight:bold; pointer-events:none; text-shadow:1px 1px 1px black;">${Math.ceil(window.itemCooldowns[item.id])}</div>`;
            }

            slot.addEventListener('pointerdown', (e) => {
                if (item.isEquipped) return;
                
                window.lastDragX = e.clientX; 
                window.lastDragY = e.clientY;
                window.lpStartX = e.clientX; 
                window.lpStartY = e.clientY;
                window.justDropped = false;
                
                window.lpTimer = setTimeout(() => {
                    const dx = window.lastDragX - window.lpStartX; const dy = window.lastDragY - window.lpStartY;
                    if (Math.hypot(dx, dy) < 10) {
                        window.isDraggingItem = true;
                        window.dragState = { active: true, item: item, sourceIdx: index, sourceTab: tabId };
                        
                        let dragGhost = document.getElementById('dragGhost');
                        if (!dragGhost) {
                            dragGhost = document.createElement('div');
                            dragGhost.id = 'dragGhost';
                            dragGhost.style.cssText = 'position: fixed; pointer-events: none; display: none; z-index: 1000; width: 44px; height: 44px;';
                            document.body.appendChild(dragGhost);
                        }
                        
                        dragGhost.innerHTML = slot.innerHTML;
                        dragGhost.style.left = (window.lastDragX - 22) + 'px';
                        dragGhost.style.top = (window.lastDragY - 22) + 'px';
                        dragGhost.style.display = 'block';
                        
                        document.body.style.touchAction = 'none'; 
                        
                        if(typeof window.onItemDragStart === 'function') window.onItemDragStart(item);
                        
                        itemDetail.style.display = 'none'; 
                    }
                }, 400); 
            });

            slot.addEventListener('pointerup', (e) => {
                if (window.lpTimer) { clearTimeout(window.lpTimer); window.lpTimer = null; }
                if (window.justDropped) return; 
                if (!window.isDraggingItem) {
                    window.selectedItemIndex = index;
                    window.showItemDetail(item, slot);
                }
            });

            invContent.appendChild(slot);
        });

        const capacity = window.player.inventory[tabId].capacity;
        for (let i = window.player.inventory[tabId].items.length; i < capacity; i++) {
            const emptySlot = document.createElement('div');
            emptySlot.className = 'inv-slot empty';
            emptySlot.dataset.index = i;
            invContent.appendChild(emptySlot);
        }
    }
};

window.showItemDetail = function(item, slotElement) {
    const itemDetail = document.getElementById('itemDetail');
    if (!itemDetail) return;
    
    let descText = item.desc || '';
    if (item.type === 'skill') {
        if (typeof window.getCalculatedSkillDesc === 'function') {
            descText = window.getCalculatedSkillDesc(item);
        }
    } else if (item.chipData) {
        const depText = item.chipData.dependency === 'str' ? 'ちから' : item.chipData.dependency === 'int' ? 'まりょく' : '';
        const targetText = item.chipData.targetType === 'self' ? '自身' : item.chipData.targetType === 'ally' ? '味方' : '敵';
        const areaText = item.chipData.areaType === 'circle' ? '円範囲' : '単体';
        descText = `${depText}依存 / ${targetText}${areaText}\\n(最大容量: ${item.chipData.capacity})`;
    }

    const rarityColor = window.RARITY[item.rarity] ? window.RARITY[item.rarity].color : '#fff';
    document.getElementById('detailName').innerText = item.name;
    document.getElementById('detailName').style.color = rarityColor;
    document.getElementById('detailRarity').innerText = item.rarity;
    document.getElementById('detailRarity').style.color = rarityColor;
    document.getElementById('detailDesc').innerHTML = descText.replace(/\\n/g, '<br>');

    let statsHtml = '';
    if (item.stats) {
        for (let key in item.stats) {
            statsHtml += `<div>${key.toUpperCase()}: +${item.stats[key]}</div>`;
        }
    }
    if (item.element) {
        statsHtml += `<div style=\"color:#ffaa00;\">属性: ${item.element.toUpperCase()}</div>`;
    }
    document.getElementById('detailStats').innerHTML = statsHtml;

    const btnUseEquip = document.getElementById('btnUseEquip');
    
    if (item.type === 'skill') {
        btnUseEquip.innerText = 'スキル発動';
        btnUseEquip.className = 'detail-btn';
        btnUseEquip.style.backgroundColor = '#cc22cc';
        btnUseEquip.style.display = 'block';
        btnUseEquip.dataset.isSkill = "true";
        btnUseEquip.dataset.isChip = "false";
    }
    else if (item.chipData) { 
        btnUseEquip.innerText = '使用 (スキル作成)';
        btnUseEquip.className = 'detail-btn';
        btnUseEquip.style.backgroundColor = '#aa5500';
        btnUseEquip.style.display = 'block';
        btnUseEquip.dataset.isChip = "true";
        btnUseEquip.dataset.isSkill = "false";
    } else {
        btnUseEquip.dataset.isChip = "false";
        btnUseEquip.dataset.isSkill = "false";
        btnUseEquip.style.backgroundColor = ''; 
        if (item.type === 'equip') {
            btnUseEquip.style.display = 'block';
            if (item.isEquipped) { 
                btnUseEquip.innerText = 'はずす'; 
                btnUseEquip.className = 'detail-btn btn-unequip'; 
            } else { 
                btnUseEquip.innerText = '装備'; 
                btnUseEquip.className = 'detail-btn btn-equip'; 
            }
        } else if (item.type === 'consume') {
            btnUseEquip.style.display = 'block';
            btnUseEquip.innerText = '使う';
            btnUseEquip.className = 'detail-btn btn-consume';
        } else {
            btnUseEquip.style.display = 'none';
        }
    }

    const rect = slotElement.getBoundingClientRect();
    let topPos = rect.bottom + 5;
    let leftPos = rect.left;
    
    itemDetail.style.display = 'flex';
    
    if (leftPos + itemDetail.offsetWidth > window.innerWidth) {
        leftPos = window.innerWidth - itemDetail.offsetWidth - 5;
    }
    if (topPos + itemDetail.offsetHeight > window.innerHeight) {
        topPos = rect.top - itemDetail.offsetHeight - 5;
    }
    
    itemDetail.style.top = topPos + 'px';
    itemDetail.style.left = leftPos + 'px';
};
