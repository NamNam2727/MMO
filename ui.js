// =========================================================
// ui.js
// UIの制御、イベントリスナー、インベントリの描画処理
// =========================================================

window.tabsList = ['equip', 'consume', 'skill', 'etc', 'important'];
window.currentTabIndex = 0;
window.selectedItemIndex = -1;

// Loader側から、HTML(DOM)の読み込みが完了した後に呼ばれる初期化関数
window.initUI = function() {
    window.invWindow = document.getElementById('invWindow');
    const invTitleBar = document.getElementById('invTitleBar');
    const invGrid = document.getElementById('invGrid');
    const itemDetail = document.getElementById('itemDetail');
    const invTabs = document.getElementById('invTabs');
    const tabIndicator = document.getElementById('tabIndicator');
    const invContent = document.getElementById('invContent');
    const goldAmountDisplay = document.getElementById('goldAmount'); 

    // ------------------------------------
    // UI制御関数の定義
    // ------------------------------------
    window.updateTabIndicator = function() {
        const currentTabName = window.tabsList[window.currentTabIndex];
        const activeTab = document.querySelector(`.inv-tab[data-tab="${currentTabName}"]`);
        if (activeTab && tabIndicator && window.invWindow.style.display === 'flex') {
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
        itemDetail.style.display = 'none';
        invContent.scrollTop = 0;
        window.renderInventory();
    };

    window.toggleInventory = function() {
        if (window.invWindow.style.display === 'flex') {
            window.invWindow.style.display = 'none'; 
            itemDetail.style.display = 'none';
        } else {
            window.invWindow.style.display = 'flex'; 
            window.invWindow.style.top = '10%'; 
            window.invWindow.style.left = '5%';
            window.renderInventory();
            setTimeout(window.updateTabIndicator, 10); 
        }
    };

    window.renderInventory = function() {
        if (!invGrid) return;
        invGrid.innerHTML = '';
        const currentTabName = window.tabsList[window.currentTabIndex];
        const tabData = window.player.inventory[currentTabName];
        
        if (goldAmountDisplay) goldAmountDisplay.innerText = window.player.gold.toLocaleString();
        
        for (let i = 0; i < tabData.capacity; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            
            if (i < tabData.items.length) {
                const item = tabData.items[i];
                slot.classList.add(`rarity-${item.rarity}`);
                slot.innerHTML = `<div class="item-icon" style="background-color: ${item.color};"></div>`;
                if (item.maxStack > 1) slot.innerHTML += `<div class="item-count">${item.count}</div>`;
                if (item.isEquipped) slot.innerHTML += `<div class="item-equip-mark">E</div>`;
                
                slot.addEventListener('pointerdown', (e) => { slot.dataset.startX = e.clientX; slot.dataset.startY = e.clientY; });
                slot.addEventListener('pointerup', (e) => {
                    const sx = parseFloat(slot.dataset.startX || e.clientX); const sy = parseFloat(slot.dataset.startY || e.clientY);
                    if (Math.abs(e.clientX - sx) < 10 && Math.abs(e.clientY - sy) < 10) window.showItemDetail(item, i);
                });
            }
            invGrid.appendChild(slot);
        }
        
        const expandBtn = document.createElement('div'); expandBtn.className = 'inv-slot expand-btn'; expandBtn.innerHTML = '＋';
        expandBtn.addEventListener('pointerdown', (e) => { expandBtn.dataset.startX = e.clientX; expandBtn.dataset.startY = e.clientY; });
        expandBtn.addEventListener('pointerup', (e) => {
            const sx = parseFloat(expandBtn.dataset.startX || e.clientX); const sy = parseFloat(expandBtn.dataset.startY || e.clientY);
            if (Math.abs(e.clientX - sx) < 10 && Math.abs(e.clientY - sy) < 10) { tabData.capacity += 4; window.renderInventory(); }
        });
        invGrid.appendChild(expandBtn);
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
        }
        document.getElementById('detailDesc').innerText = descText;
        
        const btnUseEquip = document.getElementById('btnUseEquip');
        if (item.type === 'equip') {
            btnUseEquip.style.display = 'block';
            if (item.isEquipped) { btnUseEquip.innerText = 'はずす'; btnUseEquip.className = 'detail-btn btn-unequip'; } 
            else { btnUseEquip.innerText = '装備'; btnUseEquip.className = 'detail-btn btn-equip'; }
        } else if (item.type === 'consume') {
            btnUseEquip.innerText = '使用'; btnUseEquip.className = 'detail-btn'; btnUseEquip.style.display = 'block';
        } else {
            btnUseEquip.style.display = 'none'; 
        }
        itemDetail.style.display = 'flex';
    };

    // ------------------------------------
    // ドロップ（置く）関連のUI動的生成・処理
    // ------------------------------------
    function executeDrop(item, tabData, selectedIndex, dropCount) {
        if (item.isEquipped) { 
            item.isEquipped = false; window.player.equipped[item.equipSlot] = null; window.updatePlayerStats(); 
        }

        item.count -= dropCount;
        if (item.count <= 0) { tabData.items.splice(selectedIndex, 1); window.selectedItemIndex = -1; }

        window.droppedItems.push({
            uid: Date.now() + Math.random(), id: item.id, 
            type: item.type, equipSlot: item.equipSlot, name: item.name, rarity: item.rarity, 
            color: item.color, desc: item.desc, stats: item.stats, restore: item.restore, maxStack: item.maxStack,
            count: dropCount, x: window.player.x, y: window.player.y, radius: 8, ownerId: window.player.id, lifeTime: 0
        });

        itemDetail.style.display = 'none'; window.renderInventory();
    }

    function showDropDialog(item, tabData, selectedIndex) {
        // 背景を暗くするオーバーレイ
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute'; overlay.style.top = '0'; overlay.style.left = '0';
        overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '30'; overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center'; overlay.style.alignItems = 'center';
        overlay.style.pointerEvents = 'auto'; // タップをここで止める

        // ポップアップウィンドウ本体
        const dialog = document.createElement('div');
        dialog.style.width = '180px'; dialog.style.backgroundColor = 'rgba(20,20,20,0.95)';
        dialog.style.border = '1px solid #777'; dialog.style.borderRadius = '8px';
        dialog.style.padding = '15px'; dialog.style.display = 'flex'; dialog.style.flexDirection = 'column';
        dialog.style.position = 'relative';

        // ❌ボタン
        const closeBtn = document.createElement('span');
        closeBtn.innerText = '❌'; closeBtn.style.position = 'absolute'; closeBtn.style.right = '10px'; closeBtn.style.top = '10px';
        closeBtn.style.cursor = 'pointer'; closeBtn.style.color = 'white'; closeBtn.style.fontSize = '12px';
        closeBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); overlay.remove(); });

        const title = document.createElement('div');
        title.innerText = '置く個数を指定'; title.style.color = 'white'; title.style.marginBottom = '15px'; 
        title.style.fontSize = '14px'; title.style.fontWeight = 'bold'; title.style.textAlign = 'center';

        // ★変更: スライダーと微調整ボタンのコンテナ
        const countContainer = document.createElement('div');
        countContainer.style.display = 'flex'; countContainer.style.justifyContent = 'space-between'; countContainer.style.alignItems = 'center';
        countContainer.style.marginBottom = '10px';

        let currentCount = 1;

        // 数値表示
        const countDisplay = document.createElement('div');
        countDisplay.innerText = currentCount + ' 個'; 
        countDisplay.style.color = '#00ffff'; countDisplay.style.fontSize = '16px'; countDisplay.style.fontWeight = 'bold';

        // 微調整ボタン共通スタイル
        const btnStyle = "background-color: #444; color: white; border: 1px solid #666; border-radius: 4px; width: 30px; height: 30px; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; user-select: none;";

        // ［－］ボタン
        const minusBtn = document.createElement('div');
        minusBtn.innerText = '－'; minusBtn.style.cssText = btnStyle;
        
        // ［＋］ボタン
        const plusBtn = document.createElement('div');
        plusBtn.innerText = '＋'; plusBtn.style.cssText = btnStyle;

        // スライダー（シークバー）
        const slider = document.createElement('input');
        slider.type = 'range'; slider.min = 1; slider.max = item.count; slider.value = 1;
        slider.style.width = '100%'; slider.style.marginBottom = '15px';

        // 数値表示の更新関数
        const updateDisplay = () => {
            countDisplay.innerText = currentCount + ' 個';
            slider.value = currentCount;
        };

        // イベントの設定（stopPropagationで誤作動を防ぐ）
        minusBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (currentCount > 1) { currentCount--; updateDisplay(); }
        });
        plusBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (currentCount < item.count) { currentCount++; updateDisplay(); }
        });
        slider.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
        slider.addEventListener('input', (e) => {
            currentCount = parseInt(e.target.value, 10);
            countDisplay.innerText = currentCount + ' 個';
        });

        countContainer.appendChild(minusBtn);
        countContainer.appendChild(countDisplay);
        countContainer.appendChild(plusBtn);

        // 決定ボタン
        const okBtn = document.createElement('button');
        okBtn.innerText = '決定'; okBtn.style.backgroundColor = '#663'; okBtn.style.color = 'white';
        okBtn.style.border = 'none'; okBtn.style.padding = '8px'; okBtn.style.borderRadius = '4px'; okBtn.style.fontWeight = 'bold';
        okBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            executeDrop(item, tabData, selectedIndex, currentCount);
            overlay.remove();
        });

        dialog.appendChild(closeBtn); 
        dialog.appendChild(title); 
        dialog.appendChild(countContainer); 
        dialog.appendChild(slider); 
        dialog.appendChild(okBtn);
        overlay.appendChild(dialog);

        // 背景タップで閉じる
        overlay.addEventListener('pointerdown', (e) => {
            if (e.target === overlay) { e.stopPropagation(); overlay.remove(); }
        });

        document.getElementById('ui-layer').appendChild(overlay);
    }

    // ------------------------------------
    // イベントリスナーの登録
    // ------------------------------------
    document.getElementById('bagBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); window.toggleInventory(); });
    document.getElementById('invCloseBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); window.toggleInventory(); });

    let isDraggingInv = false; let dragOffsetX = 0; let dragOffsetY = 0;
    invTitleBar.addEventListener('pointerdown', (e) => {
        if(e.target.id === 'invCloseBtn') return;
        isDraggingInv = true; const rect = window.invWindow.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left; dragOffsetY = e.clientY - rect.top; e.stopPropagation();
    });
    window.addEventListener('pointermove', (e) => {
        if (isDraggingInv) { window.invWindow.style.left = `${e.clientX - dragOffsetX}px`; window.invWindow.style.top = `${e.clientY - dragOffsetY}px`; }
    });
    window.addEventListener('pointerup', () => { isDraggingInv = false; });

    let isDraggingTab = false;
    invTabs.addEventListener('pointerdown', (e) => {
        isDraggingTab = true; handleTabDrag(e); e.stopPropagation();
    });
    window.addEventListener('pointermove', (e) => { if (isDraggingTab) handleTabDrag(e); });
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

    let contentStartX = 0; let contentStartY = 0; let isContentSwiping = false;
    invContent.addEventListener('pointerdown', (e) => { contentStartX = e.clientX; contentStartY = e.clientY; isContentSwiping = true; });
    invContent.addEventListener('pointerup', (e) => {
        if (!isContentSwiping) return;
        isContentSwiping = false;
        let dx = e.clientX - contentStartX; let dy = e.clientY - contentStartY;
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) window.switchTab(window.currentTabIndex + 1); 
            else window.switchTab(window.currentTabIndex - 1);        
        }
    });
    invContent.addEventListener('pointercancel', () => { isContentSwiping = false; });

    // アクションボタンとアイテム詳細のボタン
    document.getElementById('btnDetailClose').addEventListener('pointerdown', (e) => {
        e.stopPropagation(); itemDetail.style.display = 'none';
    });

    document.getElementById('btnUseEquip').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const currentTabName = window.tabsList[window.currentTabIndex];
        const tabData = window.player.inventory[currentTabName];
        const item = tabData.items[window.selectedItemIndex];
        if (!item) return;

        if (item.type === 'consume') {
            if (item.restore) window.player.hp = Math.min(window.player.maxHp, window.player.hp + item.restore);
            item.count--;
            if (item.count <= 0) { tabData.items.splice(window.selectedItemIndex, 1); window.selectedItemIndex = -1; }
        } else if (item.type === 'equip') {
            if (item.isEquipped) {
                item.isEquipped = false; window.player.equipped[item.equipSlot] = null;
            } else {
                tabData.items.forEach(i => { if (i.equipSlot === item.equipSlot) i.isEquipped = false; });
                item.isEquipped = true; window.player.equipped[item.equipSlot] = item;
            }
            window.updatePlayerStats(); 
        }
        itemDetail.style.display = 'none'; window.renderInventory();
    });

    document.getElementById('btnDrop').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const currentTabName = window.tabsList[window.currentTabIndex];
        const tabData = window.player.inventory[currentTabName];
        const item = tabData.items[window.selectedItemIndex];
        if (!item) return;

        if (item.count > 1) {
            showDropDialog(item, tabData, window.selectedItemIndex);
        } else {
            executeDrop(item, tabData, window.selectedItemIndex, 1);
        }
    });

    document.getElementById('attackBtn').addEventListener('pointerdown', (e) => {
        e.stopPropagation(); window.player.targetItem = null; 
        if (window.player.targetEnemy && window.player.targetEnemy.state !== 'dead') {
            window.player.isAutoAttacking = true; window.playerPath = window.findPath(window.player.x, window.player.y, window.player.targetEnemy.x, window.player.targetEnemy.y);
        } else {
            let closest = null; let minDist = Infinity;
            for (const enemy of window.enemies) {
                if (enemy.state !== 'dead') {
                    const dist = Math.hypot(enemy.x - window.player.x, enemy.y - window.player.y);
                    if (dist < minDist) { minDist = dist; closest = enemy; }
                }
            }
            if (closest) { window.player.targetEnemy = closest; window.player.isAutoAttacking = false; }
        }
    });

    document.getElementById('lootBtn').addEventListener('pointerdown', (e) => {
        e.stopPropagation(); window.player.targetEnemy = null; window.player.isAutoAttacking = false;
        let closestItem = null; let minDist = Infinity;
        for (const item of window.droppedItems) {
            if (item.ownerId === null || item.ownerId === window.player.id) {
                const dist = Math.hypot(item.x - window.player.x, item.y - window.player.y);
                if (dist < minDist) { minDist = dist; closestItem = item; }
            }
        }
        if (closestItem) { window.player.targetItem = closestItem; window.playerPath = window.findPath(window.player.x, window.player.y, closestItem.x, closestItem.y); }
    });
};
