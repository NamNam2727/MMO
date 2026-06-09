// =========================================================
// inventory.js
// インベントリの描画、操作、ドラッグ＆ドロップ(D&D)制御、アイテムCT管理
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

window.initInventoryUI = function() {
    window.invWindow = document.getElementById('invWindow');
    const invTitleBar = document.getElementById('invTitleBar');
    const invTabs = document.getElementById('invTabs');
    const invContent = document.getElementById('invContent');
    const itemDetail = document.getElementById('itemDetail');

    if (!window.player) return; 

    window.ensureUIDs();

    // --- CT減算とDOM更新ループ ---
    let lastTimeCT = performance.now();
    function updateCT() {
        let now = performance.now();
        let dt = (now - lastTimeCT) / 1000;
        lastTimeCT = now;
        
        for (let id in window.itemCooldowns) {
            if (window.itemCooldowns[id] > 0) {
                window.itemCooldowns[id] -= dt;
                if (window.itemCooldowns[id] <= 0) {
                    delete window.itemCooldowns[id];
                }
            }
        }
        
        const allOverlays = document.querySelectorAll('.ct-overlay, .ct-overlay-sc');
        allOverlays.forEach(overlay => {
            const id = overlay.getAttribute('data-ct-id');
            if (window.itemCooldowns && window.itemCooldowns[id] > 0) {
                const ratio = window.itemCooldowns[id] / 3.0; 
                overlay.style.height = `${ratio * 100}%`; 
            } else {
                overlay.style.height = `0%`;
            }
        });

        requestAnimationFrame(updateCT);
    }
    requestAnimationFrame(updateCT);

    // インベントリ用ゴーストアイコンの生成
    let ghost = document.getElementById('invDragGhost');
    if (!ghost) {
        ghost = document.createElement('div');
        ghost.id = 'invDragGhost';
        ghost.style.cssText = 'position: fixed; pointer-events: none; display: none; z-index: 1000; width: 44px; height: 44px; justify-content: center; align-items: center; opacity: 0.8; transform: translate(-50%, -50%);';
        document.body.appendChild(ghost);
    }

    // --- インベントリイベントリスナー ---
    document.getElementById('bagBtn').addEventListener('pointerdown', (e) => { 
        e.stopPropagation(); 
        window.toggleInventory(); 
    });
    
    document.getElementById('invCloseBtn').addEventListener('pointerdown', (e) => { 
        e.stopPropagation(); 
        window.toggleInventory(); 
    });

    let isDraggingInv = false; 
    let dragOffsetX = 0; 
    let dragOffsetY = 0;
    
    invTitleBar.addEventListener('pointerdown', (e) => {
        if(e.target.id === 'invCloseBtn') return;
        isDraggingInv = true; 
        const rect = window.invWindow.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left; 
        dragOffsetY = e.clientY - rect.top; 
        e.stopPropagation();
    });
    
    window.addEventListener('pointermove', (e) => {
        if (isDraggingInv) { 
            window.invWindow.style.left = `${e.clientX - dragOffsetX}px`; 
            window.invWindow.style.top = `${e.clientY - dragOffsetY}px`; 
        }
    });
    
    window.addEventListener('pointerup', () => { isDraggingInv = false; });

    let isDraggingTab = false;
    invTabs.addEventListener('pointerdown', (e) => { 
        isDraggingTab = true; 
        handleTabDrag(e); 
        e.stopPropagation(); 
    });
    window.addEventListener('pointermove', (e) => { 
        if (isDraggingTab) handleTabDrag(e); 
    });
    window.addEventListener('pointerup', () => { isDraggingTab = false; });
    window.addEventListener('pointercancel', () => { isDraggingTab = false; });

    function handleTabDrag(e) {
        const elem = document.elementFromPoint(e.clientX, e.clientY);
        if (elem && elem.classList.contains('inv-tab')) {
            const tabName = elem.getAttribute('data-tab');
            const idx = window.tabsList.indexOf(tabName);
            if (idx !== -1) window.switchTab(idx);
        }
    }

    let contentStartX = 0; 
    let contentStartY = 0; 
    let isContentSwiping = false;
    
    invContent.addEventListener('pointerdown', (e) => { 
        contentStartX = e.clientX; 
        contentStartY = e.clientY; 
        isContentSwiping = true; 
    });
    
    invContent.addEventListener('pointerup', (e) => {
        if (!isContentSwiping) return;
        isContentSwiping = false;
        let dx = e.clientX - contentStartX; 
        let dy = e.clientY - contentStartY;
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) window.switchTab(window.currentTabIndex + 1); 
            else window.switchTab(window.currentTabIndex - 1);        
        }
    });
    
    invContent.addEventListener('pointercancel', () => { isContentSwiping = false; });

    document.getElementById('btnDetailClose').addEventListener('pointerdown', (e) => {
        e.stopPropagation(); 
        itemDetail.style.display = 'none';
    });

    document.getElementById('btnUseEquip').addEventListener('pointerdown', (e) => {
        const btnUseEquip = document.getElementById('btnUseEquip');
        
        if (btnUseEquip.dataset.isChip === "true") {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
            
            document.getElementById('itemDetail').style.display = 'none';
            const tabData = window.player.inventory[window.tabsList[window.currentTabIndex]];
            if (!tabData) return;
            const item = tabData.items[window.selectedItemIndex];
            if (item && typeof window.openSkillCreateWindow === 'function') {
                window.openSkillCreateWindow(item);
            }
            return;
        }

        if (btnUseEquip.dataset.isSkill === "true") {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
            
            document.getElementById('itemDetail').style.display = 'none';
            const tabData = window.player.inventory[window.tabsList[window.currentTabIndex]];
            if (!tabData) return;
            const item = tabData.items[window.selectedItemIndex];
            if (item && typeof window.prepareSkill === 'function') {
                window.prepareSkill(item);
            }
            return;
        }

        e.stopPropagation();
        const currentTabName = window.tabsList[window.currentTabIndex];
        const tabData = window.player.inventory[currentTabName];
        if (!tabData) return;
        const item = tabData.items[window.selectedItemIndex];
        if (!item) return;

        if (item.type === 'consume') {
            if (window.itemCooldowns && window.itemCooldowns[item.id] > 0) {
                if (typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>まだ使用できません。</span>`, 'sys');
                return;
            }
            if (item.restore) {
                window.player.hp = Math.min(window.player.maxHp, window.player.hp + item.restore);
            }
            if (typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
            
            window.itemCooldowns[item.id] = 3.0;

            item.count--;
            if (item.count <= 0) { 
                tabData.items.splice(window.selectedItemIndex, 1); 
                window.selectedItemIndex = -1; 
            }
        } else if (item.type === 'equip') {
            if (item.isEquipped) {
                item.isEquipped = false; 
                window.player.equipped[item.equipSlot] = null;
            } else {
                tabData.items.forEach(i => { if (i.equipSlot === item.equipSlot) i.isEquipped = false; });
                item.isEquipped = true; 
                window.player.equipped[item.equipSlot] = item;
            }
            if (typeof window.updatePlayerStats === 'function') window.updatePlayerStats(); 
        }
        itemDetail.style.display = 'none'; 
        window.renderInventory();
    });

    document.getElementById('btnDrop').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if(itemDetail) itemDetail.style.display = 'none';

        const currentTabName = window.tabsList[window.currentTabIndex];
        const tabData = window.player.inventory[currentTabName];
        if (!tabData) return;
        const item = tabData.items[window.selectedItemIndex];
        if (!item) return;

        if (item.count > 1) {
            window.showDropDialog(item, tabData, window.selectedItemIndex);
        } else {
            window.showConfirmDropDialog(item, tabData, window.selectedItemIndex);
        }
    });

    // --- インベントリ用 グローバル D&Dイベント ---
    if (!window.__invDndEventsRegistered) {
        window.__invDndEventsRegistered = true;
        
        const updateInvGhostPos = (x, y) => {
            window.lastDragX = x; 
            window.lastDragY = y;
            const gh = document.getElementById('invDragGhost');
            if(gh) { 
                gh.style.left = x + 'px'; 
                gh.style.top = y + 'px'; 
            }
            window.checkAutoScroll(y);
        };

        window.addEventListener('pointermove', (e) => {
            if (window.isDraggingItem) { 
                e.preventDefault(); 
                updateInvGhostPos(e.clientX, e.clientY); 
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                if (window.isDraggingItem) { 
                    e.preventDefault(); 
                    updateInvGhostPos(e.touches[0].clientX, e.touches[0].clientY); 
                }
            }
        }, { passive: false });

        const handleInvDropEnd = (e) => {
            if (window.lpTimer) { 
                clearTimeout(window.lpTimer); 
                window.lpTimer = null; 
            }
            if (!window.isDraggingItem) return;
            
            window.isDraggingItem = false;
            window.justDropped = true; 
            const gh = document.getElementById('invDragGhost');
            if (gh) gh.style.display = 'none';
            window.stopAutoScroll();
            document.body.style.touchAction = '';

            setTimeout(() => {
                const targetElem = document.elementFromPoint(window.lastDragX, window.lastDragY);
                if (targetElem) {
                    const dropSlot = targetElem.closest('.inv-slot');
                    const scSlot = targetElem.closest('.shortcut-slot');
                    const invWindowObj = targetElem.closest('#invWindow');
                    const tabData = window.player.inventory[window.dragState.sourceTab];
                    
                    if (dropSlot && dropSlot.dataset.idx !== undefined) {
                        const targetIdx = parseInt(dropSlot.dataset.idx);
                        const sourceIdx = window.dragState.sourceIdx;
                        if (targetIdx !== sourceIdx) {
                            if (targetIdx < tabData.items.length) {
                                let temp = tabData.items[sourceIdx];
                                tabData.items[sourceIdx] = tabData.items[targetIdx];
                                tabData.items[targetIdx] = temp;
                            } else {
                                let temp = tabData.items[sourceIdx];
                                tabData.items.splice(sourceIdx, 1);
                                tabData.items.push(temp);
                            }
                            window.renderInventory();
                        }
                    } else if (scSlot && scSlot.dataset.scIdx !== undefined) {
                        const scIdx = parseInt(scSlot.dataset.scIdx);
                        const item = window.dragState.item;
                        window.ensureUIDs();
                        if (!item.uid) item.uid = 'uid_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
                        if (typeof window.registerShortcut === 'function') {
                            window.registerShortcut(scIdx, item);
                        }
                    } else if (!invWindowObj && !targetElem.closest('#bottomUIContainer')) {
                        const item = window.dragState.item;
                        const sIdx = window.dragState.sourceIdx;
                        if (item.count > 1) {
                            if (typeof window.showDropDialog === 'function') window.showDropDialog(item, tabData, sIdx);
                        } else {
                            window.showConfirmDropDialog(item, tabData, sIdx);
                        }
                    }
                }
                setTimeout(() => { window.justDropped = false; }, 200);
            }, 10);
        };

        window.addEventListener('pointerup', handleInvDropEnd);
        window.addEventListener('pointercancel', handleInvDropEnd);
        window.addEventListener('touchend', handleInvDropEnd);
    }

    if (typeof window.initShortcutUI === 'function') {
        window.initShortcutUI();
    }
};

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
                    if (dbItem.desc && item.desc !== dbItem.desc) item.desc = dbItem.desc;
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
            if (item.type === 'consume') {
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
                e.stopPropagation(); 
                if (window.isDraggingItem || window.justDropped) return;
                
                window.lpStartX = e.clientX; 
                window.lpStartY = e.clientY; 
                window.lastDragX = e.clientX; 
                window.lastDragY = e.clientY;

                if (invContent) invContent.style.overflowY = 'hidden';

                window.lpTimer = setTimeout(() => {
                    window.lpTimer = null;
                    window.startInventoryDrag(item, i, currentTabName, rarityColor);
                }, 300);
            });

            slot.addEventListener('pointermove', (e) => {
                if (window.isDraggingItem) return; 
                if (window.lpTimer) {
                    if (Math.abs(e.clientX - window.lpStartX) > 10 || Math.abs(e.clientY - window.lpStartY) > 10) {
                        clearTimeout(window.lpTimer); 
                        window.lpTimer = null;
                        if (invContent) invContent.style.overflowY = 'auto';
                    }
                }
            });

            slot.addEventListener('pointerup', (e) => {
                e.stopPropagation();
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

window.startInventoryDrag = function(item, idx, tabName, rarityColor) {
    window.isDraggingItem = true;
    window.dragState = { active: true, item: item, sourceIdx: idx, sourceTab: tabName };
    document.body.style.touchAction = 'none';

    const ghost = document.getElementById('invDragGhost');
    if (ghost) {
        ghost.innerHTML = `<div style="width: 70%; height: 70%; border-radius: 50%; background-color: ${item.color}; border: 2px solid ${rarityColor}; box-sizing: border-box;"></div>`;
        ghost.style.left = window.lastDragX + 'px';
        ghost.style.top = window.lastDragY + 'px';
        ghost.style.display = 'flex';
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
        window.invWindow.style.top = '10%'; 
        window.invWindow.style.left = '5%';
        window.renderInventory();
        setTimeout(window.updateTabIndicator, 10); 
    }
};

window.showItemDetail = function(item, index) {
    window.selectedItemIndex = index;
    document.getElementById('detailName').innerText = item.name;
    document.getElementById('detailName').style.color = window.RARITY[item.rarity].color;
    document.getElementById('detailType').innerText = `${item.type} / ${item.rarity}`;
    
    let descText = item.desc;
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

window.executeDropLogic = function(item, tabData, idx, count) {
    if (item.isEquipped) { 
        item.isEquipped = false; 
        window.player.equipped[item.equipSlot] = null; 
        if(typeof window.updatePlayerStats === 'function') window.updatePlayerStats(); 
    }
    item.count -= count;
    if (item.count <= 0) { 
        tabData.items.splice(idx, 1); 
        window.selectedItemIndex = -1; 
    }
    
    const droppedItem = {
        uid: Date.now() + Math.random(), 
        id: item.id, 
        type: item.type, 
        equipSlot: item.equipSlot, 
        name: item.name, 
        rarity: item.rarity, 
        color: item.color, 
        desc: item.desc, 
        stats: item.stats, 
        element: item.element, 
        elementParams: item.elementParams, 
        resists: item.resists, 
        restore: item.restore, 
        maxStack: item.maxStack, 
        count: count, 
        x: window.player.x, 
        y: window.player.y, 
        radius: 8, 
        ownerId: window.player.id, 
        lifeTime: 0
    };
    
    if (item.chipData) droppedItem.chipData = JSON.parse(JSON.stringify(item.chipData));
    if (item.materialData) droppedItem.materialData = JSON.parse(JSON.stringify(item.materialData));
    if (item.type === 'skill' || item.icon || item.skillData) {
        if (item.icon) droppedItem.icon = item.icon;
        if (item.skillData) droppedItem.skillData = JSON.parse(JSON.stringify(item.skillData));
    }

    window.droppedItems.push(droppedItem);
    
    const itemDetail = document.getElementById('itemDetail');
    if (itemDetail) itemDetail.style.display = 'none'; 
    window.renderInventory();
};

window.showConfirmDropDialog = function(item, tabData, idx) {
    if (document.getElementById('dropConfirmOverlay')) return; 
    
    const overlay = document.createElement('div'); 
    overlay.id = 'dropConfirmOverlay';
    overlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:60; display:flex; justify-content:center; align-items:center; pointer-events:auto; touch-action:none;';
    
    const stopAll = (e) => { 
        e.stopPropagation(); 
        if(e.cancelable && e.target.tagName !== 'INPUT') e.preventDefault(); 
    };
    
    overlay.addEventListener('pointerdown', (e) => { 
        e.stopPropagation(); 
        if (e.target === overlay) overlay.remove(); 
    });
    overlay.addEventListener('pointerup', stopAll); 
    overlay.addEventListener('pointermove', stopAll); 
    overlay.addEventListener('touchstart', stopAll, {passive: false}); 
    overlay.addEventListener('touchend', stopAll, {passive: false}); 
    overlay.addEventListener('click', stopAll);
    
    const dialog = document.createElement('div');
    dialog.style.cssText = 'width:200px; background:rgba(20,20,20,0.95); border:1px solid #777; border-radius:8px; padding:15px; position:relative; text-align:center; color:white;';
    
    const closeBtn = document.createElement('span'); 
    closeBtn.innerText = '❌'; 
    closeBtn.style.cssText = 'position:absolute; right:10px; top:10px; cursor:pointer; font-size:12px; padding:5px;';
    closeBtn.addEventListener('pointerdown', (e) => { 
        e.stopPropagation(); 
        overlay.remove(); 
    });
    
    const msg = document.createElement('div'); 
    msg.innerText = `${item.name} を落としますか？`; 
    msg.style.cssText = 'margin-bottom:15px; font-size:14px; font-weight:bold;';
    
    const okBtn = document.createElement('button'); 
    okBtn.innerText = 'OK'; 
    okBtn.style.cssText = 'background:#663; color:white; border:none; padding:8px 20px; border-radius:4px; font-weight:bold; cursor:pointer;';
    okBtn.addEventListener('pointerdown', stopAll); 
    okBtn.addEventListener('pointerup', (e) => { 
        e.stopPropagation(); 
        window.executeDropLogic(item, tabData, idx, 1); 
        overlay.remove(); 
    });
    
    dialog.appendChild(closeBtn); 
    dialog.appendChild(msg); 
    dialog.appendChild(okBtn); 
    overlay.appendChild(dialog);
    
    document.getElementById('ui-layer').appendChild(overlay);
};

window.showDropDialog = function(item, tabData, selectedIndex) {
    if (document.getElementById('dropAmountOverlay')) return; 
    
    const overlay = document.createElement('div'); 
    overlay.id = 'dropAmountOverlay';
    overlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:60; display:flex; justify-content:center; align-items:center; pointer-events:auto; touch-action:none;';
    
    const stopAll = (e) => { 
        e.stopPropagation(); 
        if(e.cancelable && e.target.tagName !== 'INPUT') e.preventDefault(); 
    };
    
    overlay.addEventListener('pointerdown', (e) => { 
        e.stopPropagation(); 
        if (e.target === overlay) overlay.remove(); 
    });
    overlay.addEventListener('pointerup', stopAll); 
    overlay.addEventListener('pointermove', stopAll); 
    overlay.addEventListener('touchstart', stopAll, {passive: false}); 
    overlay.addEventListener('touchend', stopAll, {passive: false}); 
    overlay.addEventListener('click', stopAll);

    const dialog = document.createElement('div');
    dialog.style.cssText = 'width:180px; background:rgba(20,20,20,0.95); border:1px solid #777; border-radius:8px; padding:15px; position:relative; text-align:center; color:white;';
    
    const closeBtn = document.createElement('span'); 
    closeBtn.innerText = '❌'; 
    closeBtn.style.cssText = 'position:absolute; right:10px; top:10px; cursor:pointer; font-size:12px; padding:5px;';
    closeBtn.addEventListener('pointerdown', (e) => { 
        e.stopPropagation(); 
        overlay.remove(); 
    });
    
    const title = document.createElement('div'); 
    title.innerText = '置く個数を指定'; 
    title.style.cssText = 'color:white; margin-bottom:15px; font-size:14px; font-weight:bold; text-align:center;';
    
    const countContainer = document.createElement('div'); 
    countContainer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;';

    let currentCount = 1;
    const countDisplay = document.createElement('div'); 
    countDisplay.innerText = currentCount + ' 個'; 
    countDisplay.style.cssText = 'color:#00ffff; font-size:16px; font-weight:bold;';
    
    const btnStyle = "background-color: #444; color: white; border: 1px solid #666; border-radius: 4px; width: 30px; height: 30px; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; user-select: none;";
    const minusBtn = document.createElement('div'); 
    minusBtn.innerText = '－'; 
    minusBtn.style.cssText = btnStyle;
    const plusBtn = document.createElement('div'); 
    plusBtn.innerText = '＋'; 
    plusBtn.style.cssText = btnStyle;

    const slider = document.createElement('input'); 
    slider.type = 'range'; 
    slider.min = 1; 
    slider.max = item.count; 
    slider.value = 1; 
    slider.style.cssText = 'width:100%; margin-bottom:15px;';
    
    const updateDisplay = () => { 
        countDisplay.innerText = currentCount + ' 個'; 
        slider.value = currentCount; 
    };

    minusBtn.addEventListener('pointerdown', (e) => { 
        e.stopPropagation(); 
        if (currentCount > 1) { currentCount--; updateDisplay(); } 
    });
    plusBtn.addEventListener('pointerdown', (e) => { 
        e.stopPropagation(); 
        if (currentCount < item.count) { currentCount++; updateDisplay(); } 
    });
    
    slider.addEventListener('pointerdown', (e) => { e.stopPropagation(); }); 
    slider.addEventListener('pointermove', (e) => { e.stopPropagation(); });
    slider.addEventListener('input', (e) => { 
        currentCount = parseInt(e.target.value, 10); 
        countDisplay.innerText = currentCount + ' 個'; 
    });

    const okBtn = document.createElement('button'); 
    okBtn.innerText = '決定'; 
    okBtn.style.cssText = 'background:#663; color:white; border:none; padding:8px; border-radius:4px; font-weight:bold; cursor:pointer; width:100%;';
    okBtn.addEventListener('pointerdown', stopAll);
    okBtn.addEventListener('pointerup', (e) => { 
        e.stopPropagation(); 
        window.executeDropLogic(item, tabData, selectedIndex, currentCount); 
        overlay.remove(); 
    });

    countContainer.appendChild(minusBtn); 
    countContainer.appendChild(countDisplay); 
    countContainer.appendChild(plusBtn);
    
    dialog.appendChild(closeBtn); 
    dialog.appendChild(title); 
    dialog.appendChild(countContainer); 
    dialog.appendChild(slider); 
    dialog.appendChild(okBtn);
    
    overlay.appendChild(dialog); 
    document.getElementById('ui-layer').appendChild(overlay);
};

window.scrollInterval = null;
window.checkAutoScroll = function(y) {
    const invWindow = document.getElementById('invWindow'); 
    const invContent = document.getElementById('invContent');
    if (!invWindow || invWindow.style.display !== 'flex' || !invContent) return;
    
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
