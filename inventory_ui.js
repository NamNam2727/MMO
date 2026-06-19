// =========================================================
// inventory_ui.js
// インベントリの描画、タブ切り替え、アイテム詳細表示(動的テキスト対応)
// =========================================================

window.tabsList = ['equip', 'consume', 'skill', 'etc', 'important'];
window.currentTabIndex = 0;
window.selectedItemIndex = -1;

// インベントリD&D グローバル状態
window.isDraggingItem = false;
window.dragState = { active: false, item: null, sourceIdx: -1, sourceTab: null };
window.lpStartX = 0;
window.lpStartY = 0;
window.lastDragX = 0; 
window.lastDragY = 0;
window.lpTimer = null;
window.justDropped = false;

// アイテムCT グローバル状態
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
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.maxStack > 1) {
                if (!itemsById[item.id]) itemsById[item.id] = [];
                itemsById[item.id].push(item);
            }
        }
        
        for (const id in itemsById) {
            const group = itemsById[id];
            if (group.length === 0) continue;
            
            let totalCount = 0;
            group.forEach(item => totalCount += item.count);
            const max = group[0].maxStack;
            
            for (let i = 0; i < group.length; i++) {
                if (totalCount >= max) {
                    group[i].count = max;
                    totalCount -= max;
                } else {
                    group[i].count = totalCount;
                    totalCount = 0;
                }
            }
            
            while (totalCount > 0) {
                const newItem = Object.assign({}, group[0]);
                newItem.uid = 'uid_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
                if (totalCount >= max) {
                    newItem.count = max;
                    totalCount -= max;
                } else {
                    newItem.count = totalCount;
                    totalCount = 0;
                }
                items.push(newItem);
            }
            
            for (let i = items.length - 1; i >= 0; i--) {
                const item = items[i];
                if (item.maxStack > 1 && item.id === id && item.count <= 0) {
                    items.splice(i, 1);
                }
            }
        }
    }
};

window.renderInventory = function() {
    // 【修復機能】敵からドロップしたアイテム等、データが欠損している場合にマスターから補完
    if (window.player && window.player.inventory && window.ITEM_DB) {
        for (const tab in window.player.inventory) {
            window.player.inventory[tab].items.forEach(item => {
                const dbItem = window.ITEM_DB[item.id];
                if (dbItem) {
                    if (dbItem.chipData && !item.chipData) item.chipData = JSON.parse(JSON.stringify(dbItem.chipData));
                    if (dbItem.materialData && !item.materialData) item.materialData = JSON.parse(JSON.stringify(dbItem.materialData));
                    if (dbItem.skillData && !item.skillData) item.skillData = JSON.parse(JSON.stringify(dbItem.skillData));
                    // ★変更: スキルアイテムのdescは動的生成するため、マスターのdescで上書きしない
                    if (item.type !== 'skill' && dbItem.desc && item.desc !== dbItem.desc) item.desc = dbItem.desc;
                }
            });
        }
    }

    window.compressStacks();

    if (typeof window.validateSkillMaterials === 'function') {
        window.validateSkillMaterials();
    }

    const invGrid = document.getElementById('invGrid');
    const goldAmountDisplay = document.getElementById('goldAmount');
    const invContent = document.getElementById('invContent');
    if (!invGrid) return;
    invGrid.innerHTML = '';
    
    const currentTabName = window.tabsList[window.currentTabIndex];
    const tabData = window.player.inventory[currentTabName];
    if (goldAmountDisplay) {
        goldAmountDisplay.innerText = window.player.gold.toLocaleString();
    }
    
    for (let i = 0; i < tabData.capacity; i++) {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        slot.dataset.idx = i;
        
        if (i < tabData.items.length) {
            const item = tabData.items[i];
            slot.classList.add(`rarity-${item.rarity}`);
            const rarityColor = window.RARITY && window.RARITY[item.rarity] ? window.RARITY[item.rarity].color : '#fff';
            
            let ctOverlay = '';
            if (item.type === 'consume' || item.type === 'skill') {
                ctOverlay = `<div class="ct-overlay" data-ct-id="${item.id}" style="position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.7); height: 0%;"></div>`;
            }

            slot.innerHTML = `<div class="item-icon" style="background-color: ${item.color}; border: 2px solid ${rarityColor}; box-sizing: border-box; position: relative; overflow: hidden; border-radius: 50%; display:flex; justify-content:center; align-items:center;">${ctOverlay}</div>`;
            
            if (item.type === 'skill' && item.icon) {
                const iconDiv = slot.querySelector('.item-icon');
                if (iconDiv && !iconDiv.querySelector('.emoji-icon')) {
                    iconDiv.innerHTML += `<span class="emoji-icon" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:24px; line-height:1;">${item.icon}</span>`;
                }
            }

            if (item.maxStack > 1) {
                slot.innerHTML += `<div class="item-count">${item.count}</div>`;
            }
            if (item.isEquipped) {
                slot.innerHTML += `<div class="item-equip-mark">E</div>`;
            }
            
            slot.addEventListener('pointerdown', (e) => { 
                if (window.isDraggingItem || window.justDropped) return;
                
                window.lpStartX = e.clientX; 
                window.lpStartY = e.clientY; 
                window.lastDragX = e.clientX; 
                window.lastDragY = e.clientY;

                window.lpTimer = setTimeout(() => {
                    window.lpTimer = null;
                    if (invContent) invContent.style.overflowY = 'hidden'; 
                    if(typeof window.startInventoryDrag === 'function') window.startInventoryDrag(item, i, currentTabName, rarityColor);
                }, 300);
            });

            slot.addEventListener('pointermove', (e) => {
                if (window.isDraggingItem) return; 
                if (window.lpTimer) {
                    if (Math.abs(e.clientX - window.lpStartX) > 10 || Math.abs(e.clientY - window.lpStartY) > 10) {
                        clearTimeout(window.lpTimer); 
                        window.lpTimer = null;
                    }
                }
            });

            slot.addEventListener('pointerup', (e) => {
                if (invContent) invContent.style.overflowY = 'auto'; 
                if (window.isDraggingItem || window.justDropped) return;
                
                if (window.lpTimer) {
                    clearTimeout(window.lpTimer); 
                    window.lpTimer = null;
                    if (Math.abs(e.clientX - window.lpStartX) < 10 && Math.abs(e.clientY - window.lpStartY) < 10) {
                        window.showItemDetail(item, i);
                    }
                }
            });

            slot.addEventListener('pointercancel', () => {
                if (window.lpTimer) { 
                    clearTimeout(window.lpTimer); 
                    window.lpTimer = null; 
                }
                if (invContent) invContent.style.overflowY = 'auto';
            });

            slot.addEventListener('pointerleave', (e) => {
                if (window.lpTimer && (Math.abs(e.clientX - window.lpStartX) > 10 || Math.abs(e.clientY - window.lpStartY) > 10)) { 
                    clearTimeout(window.lpTimer); 
                    window.lpTimer = null; 
                    if (invContent) invContent.style.overflowY = 'auto';
                }
            });
        }
        invGrid.appendChild(slot);
    }
    
    const expandBtn = document.createElement('div'); 
    expandBtn.className = 'inv-slot expand-btn'; 
    expandBtn.innerHTML = '＋';
    expandBtn.addEventListener('pointerdown', (e) => { 
        expandBtn.dataset.startX = e.clientX; 
        expandBtn.dataset.startY = e.clientY; 
    });
    expandBtn.addEventListener('pointerup', (e) => {
        const sx = parseFloat(expandBtn.dataset.startX || e.clientX); 
        const sy = parseFloat(expandBtn.dataset.startY || e.clientY);
        if (Math.abs(e.clientX - sx) < 10 && Math.abs(e.clientY - sy) < 10) { 
            tabData.capacity += 4; 
            window.renderInventory(); 
        }
    });
    invGrid.appendChild(expandBtn);

    if (typeof window.updateTabIndicator === 'function') {
        window.updateTabIndicator();
    }
    if (typeof window.renderShortcutPages === 'function') {
        window.renderShortcutPages();
    }
};

window.updateTabIndicator = function() {
    const currentTabName = window.tabsList[window.currentTabIndex];
    const activeTab = document.querySelector(`.inv-tab[data-tab="${currentTabName}"]`);
    const tabIndicator = document.getElementById('tabIndicator');
    if (activeTab && tabIndicator && window.invWindow && window.invWindow.style.display === 'flex') {
        tabIndicator.style.left = `${activeTab.offsetLeft}px`;
        tabIndicator.style.width = `${activeTab.offsetWidth}px`;
    }
};

window.switchTab = function(index) {
    if (index < 0) index = 0;
    if (index >= window.tabsList.length) index = window.tabsList.length - 1;
    if (window.currentTabIndex === index) return;
    
    window.currentTabIndex = index;
    const currentTabName = window.tabsList[window.currentTabIndex];
    
    document.querySelectorAll('.inv-tab').forEach(btn => btn.classList.remove('active'));
    const activeTab = document.querySelector(`.inv-tab[data-tab="${currentTabName}"]`);
    if(activeTab) activeTab.classList.add('active');
    
    window.updateTabIndicator();
    
    const itemDetail = document.getElementById('itemDetail');
    if (itemDetail) itemDetail.style.display = 'none';
    
    const invContent = document.getElementById('invContent');
    if (invContent) invContent.scrollTop = 0;
    
    window.renderInventory();
};

window.toggleInventory = function() {
    if (!window.invWindow) return;
    const itemDetail = document.getElementById('itemDetail');
    if (window.invWindow.style.display === 'flex') {
        window.invWindow.style.display = 'none'; 
        if (itemDetail) itemDetail.style.display = 'none';
    } else {
        window.invWindow.style.display = 'flex'; 
        
        const pWidget = document.getElementById('playerWidget');
        if (pWidget) {
            const rect = pWidget.getBoundingClientRect();
            window.invWindow.style.top = (rect.top + 65) + 'px';
            window.invWindow.style.left = (rect.left + 5) + 'px';
        } else {
            window.invWindow.style.top = '75px'; 
            window.invWindow.style.left = '15px';
        }

        window.renderInventory();
        setTimeout(window.updateTabIndicator, 10); 
    }
};

window.showItemDetail = function(item, index) {
    window.selectedItemIndex = index;
    document.getElementById('detailName').innerText = item.name;
    document.getElementById('detailName').style.color = window.RARITY[item.rarity].color;
    document.getElementById('detailType').innerText = `${item.type} / ${item.rarity}`;
    
    // ★変更: スキルアイテムの場合は、動的計算関数を使って詳細テキストを生成する
    let descText = item.desc || "";
    if (item.type === 'skill' && typeof window.getCalculatedSkillDesc === 'function') {
        descText = window.getCalculatedSkillDesc(item);
    }
    
    if (item.stats) {
        if (item.stats.atk) descText += `\n攻撃力: +${item.stats.atk}`;
        if (item.stats.hp) descText += `\n最大HP: +${item.stats.hp}`;
        if (item.stats.armor) descText += `\n防御: +${item.stats.armor}`;
        if (item.stats.attackRange) descText += `\n射程: ${item.stats.attackRange}`;
    }
    if (item.element) { 
        const trans = { 'fire':'火', 'ice':'氷', 'lightning':'雷', 'wind':'風', 'earth':'地' }; 
        descText += `\n属性: ${trans[item.element]}`; 
    }
    if (item.resists) { 
        const trans = { 'fire':'火', 'ice':'氷', 'lightning':'雷', 'wind':'風', 'earth':'地' }; 
        descText += `\n耐性: ${item.resists.map(r=>trans[r]).join(',')}`; 
    }
    if (item.elementParams) {
        if (item.elementParams.duration) descText += `\n効果時間: ${item.elementParams.duration}s`;
        if (item.elementParams.distance) descText += `\n吹飛距離: ${item.elementParams.distance}`;
    }
    
    const descElem = document.getElementById('detailDesc');
    descElem.innerText = descText;
    descElem.style.whiteSpace = "pre-wrap"; 
    
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
            btnUseEquip.innerText = '使用'; 
            btnUseEquip.className = 'detail-btn'; 
            btnUseEquip.style.display = 'block';
        } else {
            btnUseEquip.style.display = 'none'; 
        }
    }
    document.getElementById('itemDetail').style.display = 'flex';
};
