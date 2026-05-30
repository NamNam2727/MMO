// =========================================================
// ui.js
// UIの制御、イベントリスナー、インベントリ・ステータス・ログの描画処理
// =========================================================

window.tabsList = ['equip', 'consume', 'skill', 'etc', 'important'];
window.currentTabIndex = 0;
window.selectedItemIndex = -1;
window.tempStats = { str: 0, int: 0, vit: 0 }; // 仮振り用のステータス保持

// =========================================================
// ★ ログシステム制御
// =========================================================
window.getEntityName = function(entity) {
    if (!entity) return "";
    return entity.id === 'p1' ? "<span class='color-player'>プレイヤー</span>" : "<span class='color-enemy'>モンスター</span>";
};

window.addLog = function(htmlText, type = 'sys') {
    const fullLogContent = document.getElementById('fullLogContent');
    if (!fullLogContent) return; // UIが初期化されていない場合はスキップ

    const fullLine = document.createElement('div');
    fullLine.className = `full-log-line log-type-${type}`;
    fullLine.innerHTML = htmlText;
    fullLogContent.appendChild(fullLine);
    fullLogContent.scrollTop = fullLogContent.scrollHeight; 

    // ★修正: チャットタブには「チャット」のログのみを流す
    if (type === 'chat') {
        const chatLogContent = document.getElementById('chatLogContent');
        if (chatLogContent) {
            const chatLine = document.createElement('div');
            chatLine.className = `full-log-line log-type-${type}`;
            chatLine.innerHTML = htmlText;
            chatLogContent.appendChild(chatLine);
            chatLogContent.scrollTop = chatLogContent.scrollHeight;
        }
    }

    const floatingLog = document.getElementById('floatingLog');
    if (!floatingLog) return;
    
    const floatLine = document.createElement('div');
    floatLine.className = `log-line log-type-${type}`;
    floatLine.innerHTML = htmlText;
    floatingLog.appendChild(floatLine);

    const removeFloatLine = () => {
        if(!floatLine.classList.contains('fade-out')) {
            floatLine.classList.add('fade-out');
            setTimeout(() => { if (floatLine.parentNode) floatLine.remove(); }, 500); 
        }
    };
    // 5秒後に消える
    floatLine.timerId = setTimeout(removeFloatLine, 5000);

    // 5行制限
    const activeLines = Array.from(floatingLog.children).filter(child => !child.classList.contains('fade-out'));
    if (activeLines.length > 5) {
        const oldest = activeLines[0];
        clearTimeout(oldest.timerId); 
        if(!oldest.classList.contains('fade-out')) {
            oldest.classList.add('fade-out');
            setTimeout(() => { if (oldest.parentNode) oldest.remove(); }, 500);
        }
    }
};

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

    // ステータス画面のヘッダー上部固定と、不要な横スクロールの禁止
    const statHeader = document.querySelector('#statusWindow .stat-header');
    if (statHeader) {
        statHeader.style.position = 'sticky';
        statHeader.style.top = '-15px'; // 親ウィンドウのpadding分を相殺
        statHeader.style.backgroundColor = 'rgba(20,20,20,0.95)'; // 背景と同色にして下の文字を隠す
        statHeader.style.zIndex = '10';
        statHeader.style.margin = '-15px -15px 10px -15px'; 
        statHeader.style.padding = '15px 15px 5px 15px'; 
        
        // 横揺れ（左右スクロール）を無効化
        const statusWindowObj = document.getElementById('statusWindow');
        if (statusWindowObj) {
            statusWindowObj.style.overflowX = 'hidden';
        }
    }

    // ------------------------------------
    // 左上ウィジェット・ステータス画面の更新関数
    // ------------------------------------
    window.updateWidgetUI = function() {
        if (!window.player) return;
        const player = window.player;
        const lvNum = document.getElementById('uiLvNum');
        if (lvNum) lvNum.innerText = player.level;
        const hpBar = document.getElementById('uiHpBar');
        if (hpBar) hpBar.style.width = Math.max(0, (player.hp / player.maxHp) * 100) + '%';
        const mpBar = document.getElementById('uiMpBar');
        if (mpBar) mpBar.style.width = Math.max(0, (player.mp / player.maxMp) * 100) + '%';
        const expBar = document.getElementById('uiExpBar');
        if (expBar) expBar.style.width = Math.max(0, (player.exp / player.nextExp) * 100) + '%';
    };

    window.updateStatusUI = function() {
        if (!window.player) return;
        const player = window.player;
        const tempStats = window.tempStats;

        document.getElementById('statLvNum').innerText = player.level;
        document.getElementById('statExp').innerText = player.exp;
        document.getElementById('statNextExp').innerText = player.nextExp;
        document.getElementById('statPoints').innerText = player.statPoints;
        
        const remainingPoints = player.statPoints - (tempStats.str + tempStats.int + tempStats.vit);
        document.getElementById('statPointsPreview').innerText = remainingPoints;

        document.getElementById('statStr').innerText = player.stats.str;
        document.getElementById('tempStr').innerText = tempStats.str > 0 ? `+${tempStats.str}` : '';
        document.getElementById('statInt').innerText = player.stats.int;
        document.getElementById('tempInt').innerText = tempStats.int > 0 ? `+${tempStats.int}` : '';
        document.getElementById('statVit').innerText = player.stats.vit;
        document.getElementById('tempVit').innerText = tempStats.vit > 0 ? `+${tempStats.vit}` : '';

        // プレビュー計算
        const previewStr = player.stats.str + tempStats.str;
        const previewInt = player.stats.int + tempStats.int;
        const previewVit = player.stats.vit + tempStats.vit;

        let previewMaxHp = player.baseHp + (previewVit * 10);
        if (player.equipped.armor && player.equipped.armor.stats && player.equipped.armor.stats.hp) previewMaxHp += player.equipped.armor.stats.hp;
        let previewMaxMp = player.baseMp + (previewInt * 5);
        
        let previewAtk = player.baseAtk + (previewStr * 2);
        if (player.equipped.weapon && player.equipped.weapon.stats && player.equipped.weapon.stats.atk) previewAtk += player.equipped.weapon.stats.atk;
        let previewMatk = player.baseMatk + (previewInt * 2);

        document.getElementById('valHp').innerText = `${Math.floor(player.hp)} / ${player.maxHp}`;
        document.getElementById('previewHp').innerText = tempStats.vit > 0 ? `(-> ${previewMaxHp})` : '';
        document.getElementById('valMp').innerText = `${Math.floor(player.mp)} / ${player.maxMp}`;
        document.getElementById('previewMp').innerText = tempStats.int > 0 ? `(-> ${previewMaxMp})` : '';
        document.getElementById('valAtk').innerText = player.atk;
        document.getElementById('previewAtk').innerText = tempStats.str > 0 ? `(-> ${previewAtk})` : '';
        document.getElementById('valMatk').innerText = player.matk;
        document.getElementById('previewMatk').innerText = tempStats.int > 0 ? `(-> ${previewMatk})` : '';
        document.getElementById('valArmor').innerText = player.armor;
        
        const mitigation = (player.armor / (100 + player.armor)) * 100;
        document.getElementById('valMitigation').innerText = mitigation.toFixed(1);

        // 属性・耐性の表示
        let elementText = "なし";
        if (player.equipped.weapon && player.equipped.weapon.element) {
            const trans = { 'fire':'火', 'ice':'氷', 'lightning':'雷', 'wind':'風', 'earth':'地' };
            elementText = trans[player.equipped.weapon.element] || player.equipped.weapon.element;
        }
        let resistsText = "なし";
        if (player.equipped.armor && player.equipped.armor.resists) {
            const trans = { 'fire':'火', 'ice':'氷', 'lightning':'雷', 'wind':'風', 'earth':'地' };
            resistsText = player.equipped.armor.resists.map(r => trans[r] || r).join(', ');
        }
        document.getElementById('valElements').innerHTML = `武器属性: ${elementText}<br>耐性: ${resistsText}`;

        // ボタンの有効無効制御
        const hasPoints = remainingPoints > 0;
        document.getElementById('btnAddStr').disabled = !hasPoints;
        document.getElementById('btnAddInt').disabled = !hasPoints;
        document.getElementById('btnAddVit').disabled = !hasPoints;
        document.getElementById('btnSubStr').disabled = tempStats.str <= 0;
        document.getElementById('btnSubInt').disabled = tempStats.int <= 0;
        document.getElementById('btnSubVit').disabled = tempStats.vit <= 0;

        const isDirty = tempStats.str > 0 || tempStats.int > 0 || tempStats.vit > 0;
        document.getElementById('btnConfirmStats').disabled = !isDirty;
        document.getElementById('btnResetStats').disabled = !isDirty;
    };

    window.getRemainingPoints = function() { 
        return window.player.statPoints - (window.tempStats.str + window.tempStats.int + window.tempStats.vit); 
    };

    // ------------------------------------
    // 左下統合UI（タブ開閉）の制御
    // ------------------------------------
    let isBottomUIOpen = false;
    let currentBottomTab = null;

    function toggleBottomTab(tabName) {
        const container = document.getElementById('bottomUIContainer');
        const floating = document.getElementById('floatingLog');
        if (!container || !floating) return;
        
        if (isBottomUIOpen && currentBottomTab === tabName) {
            isBottomUIOpen = false;
            container.classList.remove('open');
            currentBottomTab = null;
            document.querySelectorAll('.bottom-tab-btn').forEach(b => b.classList.remove('active'));
            floating.className = 'state-closed';
            return;
        }
        
        isBottomUIOpen = true;
        currentBottomTab = tabName;
        container.classList.add('open');
        
        document.querySelectorAll('.bottom-tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.target === tabName);
        });
        
        document.querySelectorAll('.bottom-content').forEach(c => {
            c.classList.toggle('active', c.id === `content-${tabName}`);
        });
        
        floating.className = `state-${tabName}`;
        
        if (tabName === 'log') {
            const lc = document.getElementById('fullLogContent');
            if(lc) lc.scrollTop = lc.scrollHeight;
        } else if (tabName === 'chat') {
            const cc = document.getElementById('chatLogContent');
            if(cc) cc.scrollTop = cc.scrollHeight;
        }
    }

    document.querySelectorAll('.bottom-tab-btn').forEach(btn => {
        btn.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); toggleBottomTab(btn.dataset.target);
        });
    });

    const chatSendBtn = document.getElementById('chatSendBtn');
    if (chatSendBtn) {
        chatSendBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            const input = document.getElementById('chatInput');
            const text = input.value.trim();
            if (text) {
                window.addLog(`<span class='color-player'>プレイヤー:</span> ${text}`, 'chat');
                input.value = '';
            }
        });
    }

    // ------------------------------------
    // ショートカットカルーセルの制御
    // ------------------------------------
    window.scCurrentPage = 0;
    window.isScDragging = false;
    window.scStartX = 0;

    const scViewport = document.getElementById('shortcutViewport');
    const scTrack = document.getElementById('shortcutTrack');

    if (scViewport && scTrack) {
        scViewport.addEventListener('pointerdown', (e) => {
            window.isScDragging = true;
            window.scStartX = e.clientX;
            scTrack.style.transition = 'none';
            e.stopPropagation();
        });

        window.addEventListener('pointermove', (e) => {
            if (!window.isScDragging) return;
            const dx = e.clientX - window.scStartX;
            scTrack.style.transform = `translateX(${dx}px)`;
        });

        window.addEventListener('pointerup', (e) => {
            if (!window.isScDragging) return;
            window.isScDragging = false;
            const dx = e.clientX - window.scStartX;
            const threshold = scViewport.clientWidth * 0.2; 
            
            scTrack.style.transition = 'transform 0.2s ease-out';
            if (dx > threshold) {
                scTrack.style.transform = `translateX(${scViewport.clientWidth}px)`;
                window.scCurrentPage = (window.scCurrentPage - 1 + 10) % 10;
                setTimeout(() => window.resetScTrack(), 200);
            } else if (dx < -threshold) {
                scTrack.style.transform = `translateX(${-scViewport.clientWidth}px)`;
                window.scCurrentPage = (window.scCurrentPage + 1) % 10;
                setTimeout(() => window.resetScTrack(), 200);
            } else {
                scTrack.style.transform = `translateX(0px)`;
            }
        });
    }

    window.resetScTrack = function() {
        if (!scTrack) return;
        scTrack.style.transition = 'none';
        scTrack.style.transform = 'translateX(0px)';
        window.renderShortcutPages();
    };

    window.renderShortcutPages = function() {
        const prevPage = (window.scCurrentPage - 1 + 10) % 10;
        const nextPage = (window.scCurrentPage + 1) % 10;
        
        const pagePrev = document.getElementById('shortcutPagePrev');
        const pageCurr = document.getElementById('shortcutPageCurrent');
        const pageNext = document.getElementById('shortcutPageNext');
        
        if (pagePrev) pagePrev.innerHTML = window.createSlotsForPage(prevPage);
        if (pageCurr) pageCurr.innerHTML = window.createSlotsForPage(window.scCurrentPage);
        if (pageNext) pageNext.innerHTML = window.createSlotsForPage(nextPage);
        
        const circles = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
        let html = '';
        for(let i=0; i<10; i++) {
            html += `<span style="color: ${i === window.scCurrentPage ? '#fff' : '#555'}; margin: 0 1px;">${circles[i]}</span>`;
        }
        const pagination = document.getElementById('shortcutPagination');
        if (pagination) pagination.innerHTML = html;
    };

    window.createSlotsForPage = function(pageIndex) {
        let html = '';
        for(let i=0; i<10; i++) {
            html += `<div class="shortcut-slot"></div>`; 
        }
        return html;
    };

    window.renderShortcutPages();


    // ------------------------------------
    // インベントリUI制御関数の定義
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

    function executeDrop(item, tabData, selectedIndex, dropCount) {
        if (item.isEquipped) { 
            item.isEquipped = false; window.player.equipped[item.equipSlot] = null; 
            if(typeof window.updatePlayerStats === 'function') window.updatePlayerStats(); 
        }

        item.count -= dropCount;
        if (item.count <= 0) { tabData.items.splice(selectedIndex, 1); window.selectedItemIndex = -1; }

        window.droppedItems.push({
            uid: Date.now() + Math.random(), id: item.id, 
            type: item.type, equipSlot: item.equipSlot, name: item.name, rarity: item.rarity, 
            color: item.color, desc: item.desc, stats: item.stats, 
            element: item.element, elementParams: item.elementParams, resists: item.resists, restore: item.restore, 
            maxStack: item.maxStack, count: dropCount, x: window.player.x, y: window.player.y, 
            radius: 8, ownerId: window.player.id, lifeTime: 0
        });

        itemDetail.style.display = 'none'; window.renderInventory();
    }

    function showDropDialog(item, tabData, selectedIndex) {
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute'; overlay.style.top = '0'; overlay.style.left = '0';
        overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '60'; overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center'; overlay.style.alignItems = 'center';
        overlay.style.pointerEvents = 'auto';

        const dialog = document.createElement('div');
        dialog.style.width = '180px'; dialog.style.backgroundColor = 'rgba(20,20,20,0.95)';
        dialog.style.border = '1px solid #777'; dialog.style.borderRadius = '8px';
        dialog.style.padding = '15px'; dialog.style.display = 'flex'; dialog.style.flexDirection = 'column';
        dialog.style.position = 'relative';

        const closeBtn = document.createElement('span');
        closeBtn.innerText = '❌'; closeBtn.style.position = 'absolute'; closeBtn.style.right = '10px'; closeBtn.style.top = '10px';
        closeBtn.style.cursor = 'pointer'; closeBtn.style.color = 'white'; closeBtn.style.fontSize = '12px';
        closeBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); overlay.remove(); });

        const title = document.createElement('div');
        title.innerText = '置く個数を指定'; title.style.color = 'white'; title.style.marginBottom = '15px'; 
        title.style.fontSize = '14px'; title.style.fontWeight = 'bold'; title.style.textAlign = 'center';

        const countContainer = document.createElement('div');
        countContainer.style.display = 'flex'; countContainer.style.justifyContent = 'space-between'; countContainer.style.alignItems = 'center';
        countContainer.style.marginBottom = '10px';

        let currentCount = 1;

        const countDisplay = document.createElement('div');
        countDisplay.innerText = currentCount + ' 個'; 
        countDisplay.style.color = '#00ffff'; countDisplay.style.fontSize = '16px'; countDisplay.style.fontWeight = 'bold';

        const btnStyle = "background-color: #444; color: white; border: 1px solid #666; border-radius: 4px; width: 30px; height: 30px; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; user-select: none;";

        const minusBtn = document.createElement('div'); minusBtn.innerText = '－'; minusBtn.style.cssText = btnStyle;
        const plusBtn = document.createElement('div'); plusBtn.innerText = '＋'; plusBtn.style.cssText = btnStyle;

        const slider = document.createElement('input');
        slider.type = 'range'; slider.min = 1; slider.max = item.count; slider.value = 1;
        slider.style.width = '100%'; slider.style.marginBottom = '15px';

        const updateDisplay = () => { countDisplay.innerText = currentCount + ' 個'; slider.value = currentCount; };

        minusBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (currentCount > 1) { currentCount--; updateDisplay(); } });
        plusBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (currentCount < item.count) { currentCount++; updateDisplay(); } });
        slider.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
        slider.addEventListener('input', (e) => {
            currentCount = parseInt(e.target.value, 10);
            countDisplay.innerText = currentCount + ' 個';
        });

        countContainer.appendChild(minusBtn);
        countContainer.appendChild(countDisplay);
        countContainer.appendChild(plusBtn);

        const okBtn = document.createElement('button');
        okBtn.innerText = '決定'; okBtn.style.backgroundColor = '#663'; okBtn.style.color = 'white';
        okBtn.style.border = 'none'; okBtn.style.padding = '8px'; okBtn.style.borderRadius = '4px'; okBtn.style.fontWeight = 'bold';
        okBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            executeDrop(item, tabData, selectedIndex, currentCount);
            overlay.remove();
        });

        dialog.appendChild(closeBtn); dialog.appendChild(title); dialog.appendChild(countContainer); dialog.appendChild(slider); dialog.appendChild(okBtn);
        overlay.appendChild(dialog);

        overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) { e.stopPropagation(); overlay.remove(); } });
        document.getElementById('ui-layer').appendChild(overlay);
    }

    // ------------------------------------
    // ステータス画面のイベントリスナー
    // ------------------------------------
    document.getElementById('btnAddStr').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.getRemainingPoints() > 0){ window.tempStats.str++; window.updateStatusUI(); } });
    document.getElementById('btnAddInt').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.getRemainingPoints() > 0){ window.tempStats.int++; window.updateStatusUI(); } });
    document.getElementById('btnAddVit').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.getRemainingPoints() > 0){ window.tempStats.vit++; window.updateStatusUI(); } });

    document.getElementById('btnSubStr').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.tempStats.str>0){window.tempStats.str--; window.updateStatusUI();} });
    document.getElementById('btnSubInt').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.tempStats.int>0){window.tempStats.int--; window.updateStatusUI();} });
    document.getElementById('btnSubVit').addEventListener('pointerdown', (e) => { e.stopPropagation(); if(window.tempStats.vit>0){window.tempStats.vit--; window.updateStatusUI();} });

    document.getElementById('btnResetStats').addEventListener('pointerdown', (e) => { e.stopPropagation(); window.tempStats = {str:0, int:0, vit:0}; window.updateStatusUI(); });
    
    document.getElementById('btnConfirmStats').addEventListener('pointerdown', (e) => { 
        e.stopPropagation(); 
        const totalSpent = window.tempStats.str + window.tempStats.int + window.tempStats.vit;
        if (totalSpent > 0 && window.player.statPoints >= totalSpent) {
            window.player.stats.str += window.tempStats.str; 
            window.player.stats.int += window.tempStats.int; 
            window.player.stats.vit += window.tempStats.vit;
            window.player.statPoints -= totalSpent; 
            window.tempStats = {str:0, int:0, vit:0};
            if(typeof window.updatePlayerStats === 'function') window.updatePlayerStats(); 
        }
    });

    document.getElementById('playerWidget').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const w = document.getElementById('statusWindow');
        if (w.style.display === 'flex') {
            w.style.display = 'none';
            window.tempStats = {str:0, int:0, vit:0};
        } else { 
            window.updateStatusUI(); w.style.display = 'flex'; 
        }
    });

    document.getElementById('closeStatusBtn').addEventListener('pointerdown', (e) => { 
        e.stopPropagation(); 
        document.getElementById('statusWindow').style.display = 'none'; 
        window.tempStats = {str:0, int:0, vit:0};
    });

    // ------------------------------------
    // インベントリのイベントリスナー・ジェスチャー操作
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
    invTabs.addEventListener('pointerdown', (e) => { isDraggingTab = true; handleTabDrag(e); e.stopPropagation(); });
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
            if(typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
            item.count--;
            if (item.count <= 0) { tabData.items.splice(window.selectedItemIndex, 1); window.selectedItemIndex = -1; }
        } else if (item.type === 'equip') {
            if (item.isEquipped) {
                item.isEquipped = false; window.player.equipped[item.equipSlot] = null;
            } else {
                tabData.items.forEach(i => { if (i.equipSlot === item.equipSlot) i.isEquipped = false; });
                item.isEquipped = true; window.player.equipped[item.equipSlot] = item;
            }
            if(typeof window.updatePlayerStats === 'function') window.updatePlayerStats(); 
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
            window.player.isAutoAttacking = true; 
            if(typeof window.findPath === 'function') window.playerPath = window.findPath(window.player.x, window.player.y, window.player.targetEnemy.x, window.player.targetEnemy.y);
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
        if (closestItem && typeof window.findPath === 'function') { 
            window.player.targetItem = closestItem; 
            window.playerPath = window.findPath(window.player.x, window.player.y, closestItem.x, closestItem.y); 
        }
    });
};