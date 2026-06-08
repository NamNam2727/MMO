// =========================================================
// skill_create.js
// スキル作成ウィンドウのUI生成、イベント制御、プレビュー更新
// および作成処理（第2フェーズの実装完了版）
// =========================================================

(function() {
    window.skillCreateState = { isOpen: false, baseChip: null, materials: [] };

    window.initSkillCreateUI = function() {
        // --- 1. UI生成（スキル作成画面 ＋ 確認ダイアログ） ---
        const skillWin = document.createElement('div');
        skillWin.id = 'skillCreateWindow';
        skillWin.style.cssText = 'position:absolute; display:none; flex-direction:column; width:280px; background:rgba(20,20,20,0.95); border:2px solid #aaa; border-radius:8px; z-index:50; color:#fff; pointer-events:auto; touch-action:none; box-shadow:0 10px 20px rgba(0,0,0,0.8);';
        
        // ウィンドウの透過防止
        skillWin.addEventListener('pointerdown', (e) => {
            if(window.bringToFront) window.bringToFront('skillCreateWindow');
            e.stopPropagation();
            const detail = document.getElementById('itemDetail');
            if(detail && detail.style.display !== 'none') detail.style.display = 'none';
        });
        skillWin.addEventListener('pointerup', (e) => { e.stopPropagation(); });
        skillWin.addEventListener('click', (e) => { e.stopPropagation(); });
        skillWin.addEventListener('touchstart', (e) => { e.stopPropagation(); }, {passive: true});
        skillWin.addEventListener('touchend', (e) => {
            e.stopPropagation();
            if (e.cancelable && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        }, {passive: false});

        skillWin.innerHTML = `
            <div id="scTitleBar" style="cursor:move; background:#444; padding:8px 10px; border-radius:6px 6px 0 0; display:flex; justify-content:space-between; font-weight:bold; font-size:14px; border-bottom:1px solid #666;">
                <span id="scTitleText">スキル作成</span><span id="scCloseBtn" style="cursor:pointer; padding:0 5px;">❌</span>
            </div>
            <div style="padding: 10px;">
                <div style="margin-bottom:12px; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; flex-direction:column; gap:3px; font-size:12px; font-weight:bold;">
                        <span>アイコン:</span>
                        <input id="scIconInput" type="text" maxlength="2" placeholder="(絵文字)" style="width:80px; background:#000; color:#fff; border:1px solid #555; text-align:center; padding:5px; font-size:16px; box-sizing:border-box;">
                    </div>
                    <div style="display:flex; flex-direction:column; gap:3px; font-size:12px; font-weight:bold;">
                        <span>スキル名:</span>
                        <input id="scNameInput" type="text" placeholder="名前を入力" style="width:100%; background:#000; color:#fff; border:1px solid #555; padding:5px; font-size:16px; box-sizing:border-box;">
                    </div>
                </div>
                <div id="scStatusInfo" style="display:flex; justify-content:space-between; font-size:12px; font-weight:bold; margin-bottom:8px; background:#333; padding:5px; border-radius:4px;">
                    <span>依存: <span id="scDepText" style="color:#ffdd00;"></span></span>
                    <span>コスト: <span id="scCostText">0 / 0</span></span>
                </div>
                <div id="scMaterialList" style="background:#222; height:auto; overflow-y:visible; border:1px inset #555; padding:5px; margin-bottom:5px; border-radius:4px;"></div>
                <div id="scErrorText" style="color:#ff5555; font-size:10px; font-weight:bold; text-align:center; min-height:14px; margin-bottom:5px;"></div>
                <button id="scCreateBtn" style="width:100%; padding:10px; background:#4CAF50; color:#fff; border:none; border-radius:4px; font-weight:bold; font-size:14px; cursor:not-allowed;" disabled>作成</button>
            </div>
        `;
        document.getElementById('ui-layer').appendChild(skillWin);

        const confirmOverlay = document.createElement('div');
        confirmOverlay.id = 'skillConfirmOverlay';
        confirmOverlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:75; display:none; pointer-events:auto; touch-action:none;';
        
        const stopAll = (e) => { 
            e.stopPropagation(); 
            if (e.cancelable && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault(); 
            }
        };
        confirmOverlay.addEventListener('pointerdown', stopAll);
        confirmOverlay.addEventListener('pointerup', stopAll);
        confirmOverlay.addEventListener('click', stopAll);
        confirmOverlay.addEventListener('touchstart', stopAll, {passive: false});
        confirmOverlay.addEventListener('touchend', stopAll, {passive: false});
        document.getElementById('ui-layer').appendChild(confirmOverlay);

        const confirmDialog = document.createElement('div');
        confirmDialog.id = 'skillConfirmDialog';
        confirmDialog.style.cssText = 'position:absolute; display:none; flex-direction:column; width:220px; background:rgba(20,20,20,0.95); border:2px solid #aaa; border-radius:8px; z-index:80; top:50%; left:50%; transform:translate(-50%, -50%); color:#fff; pointer-events:auto; touch-action:none; box-shadow:0 10px 20px rgba(0,0,0,0.8);';
        
        confirmDialog.addEventListener('pointerdown', stopAll);
        confirmDialog.addEventListener('pointerup', stopAll);
        confirmDialog.addEventListener('click', stopAll);
        confirmDialog.addEventListener('touchstart', stopAll, {passive: false});
        confirmDialog.addEventListener('touchend', stopAll, {passive: false});

        confirmDialog.innerHTML = `
            <div style="background:#444; padding:8px 10px; border-radius:6px 6px 0 0; display:flex; justify-content:space-between; font-weight:bold; font-size:14px; border-bottom:1px solid #666;">
                <span>確認</span><span id="scConfirmCloseBtn" style="cursor:pointer; padding:0 5px;">❌</span>
            </div>
            <div style="padding: 15px; font-size:12px;">
                <div style="font-size:18px; font-weight:bold; text-align:center; margin-bottom:10px;">
                    <span id="confirmIcon"></span> <span id="confirmName"></span>
                </div>
                <div style="margin-bottom:10px; background:#111; border:1px solid #444; border-radius:4px; padding:5px;">
                    <div style="color:#00ffff; margin-bottom:5px; font-weight:bold; border-bottom:1px solid #333; padding-bottom:2px;">■ 効果</div>
                    <div id="confirmEffects" style="color:#ddd; line-height:1.4;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:15px; background:#333; padding:5px; border-radius:4px;">
                    <span>依存: <span id="confirmDep" style="color:#ffdd00;"></span></span>
                    <span>コスト: <span id="confirmCost" style="color:#55ff55;"></span></span>
                </div>
                <div style="text-align:center; margin-bottom:5px; font-weight:bold;">これでよろしいですか？</div>
                <div id="confirmMissingWarning" style="color:#ff5555; font-size:11px; font-weight:bold; text-align:center; margin-bottom:10px; display:none;">※アイテムが不足しています</div>
                <button id="scConfirmOkBtn" style="width:100%; padding:10px; background:#4CAF50; color:#fff; border:none; border-radius:4px; font-weight:bold; font-size:14px; cursor:pointer;">OK</button>
            </div>
        `;
        document.getElementById('ui-layer').appendChild(confirmDialog);

        // --- 2. ウィンドウ操作（ドラッグと閉じる） ---
        const scTitleBar = document.getElementById('scTitleBar');
        let scIsDragging = false; let scDragOffsetX = 0; let scDragOffsetY = 0;
        scTitleBar.addEventListener('pointerdown', (e) => {
            if(e.target.id === 'scCloseBtn') return;
            scIsDragging = true;
            if(window.bringToFront) window.bringToFront('skillCreateWindow');
            const win = document.getElementById('skillCreateWindow');
            if (win.style.transform) {
                const rect = win.getBoundingClientRect();
                win.style.transform = '';
                win.style.left = rect.left + 'px'; win.style.top = rect.top + 'px';
            }
            const rect = win.getBoundingClientRect();
            scDragOffsetX = e.clientX - rect.left; scDragOffsetY = e.clientY - rect.top;
            e.stopPropagation();
        });
        window.addEventListener('pointermove', (e) => {
            if (scIsDragging) {
                const win = document.getElementById('skillCreateWindow');
                win.style.left = `${e.clientX - scDragOffsetX}px`; win.style.top = `${e.clientY - scDragOffsetY}px`;
            }
        });
        window.addEventListener('pointerup', () => { scIsDragging = false; }, { capture: true });
        window.addEventListener('pointercancel', () => { scIsDragging = false; }, { capture: true });
        window.addEventListener('touchend', () => { scIsDragging = false; }, { capture: true });

        document.getElementById('scCloseBtn').addEventListener('pointerdown', (e) => { 
            e.stopPropagation(); 
            window.closeSkillCreateWindow(); 
        });

        // --- 3. D&D 割り込み処理 ---
        window.addEventListener('pointerup', (e) => {
            if (window.isDraggingItem && window.skillCreateState.isOpen) {
                const x = e.clientX || window.lastDragX;
                const y = e.clientY || window.lastDragY;
                const elem = document.elementFromPoint(x, y);
                
                if (elem && elem.closest('#skillCreateWindow')) {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    
                    const slot = elem.closest('.sc-slot');
                    if (!slot) {
                        window.isDraggingItem = false;
                        const invContent = document.getElementById('invContent');
                        if (invContent) invContent.style.overflowY = 'auto';
                        if (typeof window.stopAutoScroll === 'function') window.stopAutoScroll();
                        const gh = document.getElementById('invDragGhost');
                        if (gh) gh.style.display = 'none';
                        if(typeof window.renderInventory === 'function') window.renderInventory();
                        return;
                    }

                    window.isDraggingItem = false;
                    const invContent = document.getElementById('invContent');
                    if (invContent) invContent.style.overflowY = 'auto';
                    if (typeof window.stopAutoScroll === 'function') window.stopAutoScroll();
                    
                    const item = window.dragState.item;
                    const gh = document.getElementById('invDragGhost');
                    if (gh) gh.style.display = 'none';
                    
                    if (!item.materialData) {
                        if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>ETC素材以外は投入できません。</span>", 'sys');
                        if (typeof window.renderInventory === 'function') window.renderInventory();
                        return;
                    }
                    
                    const chipDep = window.skillCreateState.baseChip.chipData.dependency;
                    if (item.materialData.dependency && item.materialData.dependency !== chipDep) {
                        if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>依存ステータスが合わないため投入できません。</span>", 'sys');
                        if (typeof window.renderInventory === 'function') window.renderInventory();
                        return;
                    }

                    const slotIdx = parseInt(slot.dataset.slotIdx);
                    
                    let requiredCount = 1;
                    window.skillCreateState.materials.forEach((m, i) => {
                        if (i !== slotIdx && m && m.id === item.id) requiredCount++;
                    });
                    
                    let totalInInv = 0;
                    for (const tab in window.player.inventory) {
                        window.player.inventory[tab].items.forEach(invItem => {
                            if (invItem.id === item.id) totalInInv += invItem.count;
                        });
                    }

                    if (requiredCount > totalInInv) {
                        if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>所持数が足りません。</span>", 'sys');
                        if (typeof window.renderInventory === 'function') window.renderInventory();
                        return;
                    }
                    
                    const matItem = Object.assign({}, item);
                    matItem.count = 1;
                    
                    window.skillCreateState.materials[slotIdx] = matItem;
                    
                    window.renderSkillCreateSlots();
                    window.updateSkillUI();
                    if(typeof window.renderInventory === 'function') window.renderInventory();
                }
            }
        }, { capture: true }); 

        // --- 4. 作成ボタンと確認ダイアログの制御 ---
        document.getElementById('scCreateBtn').addEventListener('pointerdown', (e) => {
            if (document.getElementById('scCreateBtn').disabled) return;
            e.stopPropagation();
            
            const chipId = window.skillCreateState.baseChip.id;
            let missing = false;
            const invCounts = {};
            for (const tab in window.player.inventory) {
                window.player.inventory[tab].items.forEach(item => {
                    invCounts[item.id] = (invCounts[item.id] || 0) + item.count;
                });
            }
            if (!invCounts[chipId] || invCounts[chipId] < 1) missing = true;
            
            const requiredMats = {};
            window.skillCreateState.materials.forEach(mat => {
                if (mat) requiredMats[mat.id] = (requiredMats[mat.id] || 0) + 1;
            });
            
            for (const id in requiredMats) {
                if (!invCounts[id] || invCounts[id] < requiredMats[id]) {
                    missing = true; break;
                }
            }

            const icon = document.getElementById('scIconInput').value.trim();
            const name = document.getElementById('scNameInput').value.trim();
            const chip = window.skillCreateState.baseChip;
            const dep = chip.chipData.dependency;
            
            // 効果の集計と自動テキスト化
            let totalCost = 0;
            let mergedEffects = {};
            window.skillCreateState.materials.forEach(mat => {
                if (mat && mat.materialData) {
                    totalCost += mat.materialData.cost;
                    if(mat.materialData.effects) {
                        mat.materialData.effects.forEach(eff => {
                            if(!mergedEffects[eff.type]) mergedEffects[eff.type] = 0;
                            mergedEffects[eff.type] += eff.value; 
                        });
                    }
                }
            });
            const finalEffects = Object.keys(mergedEffects).map(k => ({ type: k, value: mergedEffects[k] }));
            const effectTexts = finalEffects.map(e => window.getEffectText ? window.getEffectText(e) : `${e.type}+${e.value}`);
            
            document.getElementById('confirmIcon').innerText = icon;
            document.getElementById('confirmName').innerText = name;
            document.getElementById('confirmDep').innerText = dep === 'str' ? 'ちから' : dep === 'int' ? 'まりょく' : 'なし';
            document.getElementById('confirmCost').innerText = totalCost;
            
            const effElem = document.getElementById('confirmEffects');
            if(effectTexts.length > 0) effElem.innerHTML = effectTexts.map(t => '・'+t).join('<br>');
            else effElem.innerHTML = 'なし (効果なし)';
            
            if (missing) {
                document.getElementById('confirmMissingWarning').style.display = 'block';
                document.getElementById('scConfirmOkBtn').disabled = true;
                document.getElementById('scConfirmOkBtn').style.backgroundColor = '#555';
                document.getElementById('scConfirmOkBtn').style.cursor = 'not-allowed';
            } else {
                document.getElementById('confirmMissingWarning').style.display = 'none';
                document.getElementById('scConfirmOkBtn').disabled = false;
                document.getElementById('scConfirmOkBtn').style.backgroundColor = '#4CAF50';
                document.getElementById('scConfirmOkBtn').style.cursor = 'pointer';
            }
            
            document.getElementById('skillConfirmOverlay').style.display = 'block';
            document.getElementById('skillConfirmDialog').style.display = 'flex';
            if(window.bringToFront) window.bringToFront('skillConfirmDialog');
        });

        document.getElementById('scConfirmCloseBtn').addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            document.getElementById('skillConfirmOverlay').style.display = 'none';
            document.getElementById('skillConfirmDialog').style.display = 'none';
        });

        document.getElementById('scConfirmOkBtn').addEventListener('pointerdown', (e) => {
            if (document.getElementById('scConfirmOkBtn').disabled) return;
            e.stopPropagation();
            const name = document.getElementById('scNameInput').value.trim();
            const icon = document.getElementById('scIconInput').value.trim();
            const chipItem = window.skillCreateState.baseChip;
            
            // チップと素材の確実な消費処理
            const itemsToConsume = [chipItem, ...window.skillCreateState.materials];
            itemsToConsume.forEach(mat => {
                if (!mat) return;
                let consumed = false;
                for (const tab in window.player.inventory) {
                    const items = window.player.inventory[tab].items;
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].id === mat.id && items[i].count > 0) {
                            items[i].count -= 1;
                            if (items[i].count <= 0) items.splice(i, 1);
                            consumed = true; break;
                        }
                    }
                    if (consumed) break;
                }
            });

            // 完成スキルの効果集計とテキスト化
            let totalCost = 0;
            let mergedEffects = {};
            window.skillCreateState.materials.forEach(mat => {
                if (mat && mat.materialData) {
                    totalCost += mat.materialData.cost;
                    if(mat.materialData.effects) {
                        mat.materialData.effects.forEach(eff => {
                            if(!mergedEffects[eff.type]) mergedEffects[eff.type] = 0;
                            mergedEffects[eff.type] += eff.value; 
                        });
                    }
                }
            });
            const finalEffects = Object.keys(mergedEffects).map(k => ({ type: k, value: mergedEffects[k] }));
            const effectTexts = finalEffects.map(e => window.getEffectText ? window.getEffectText(e) : `${e.type}+${e.value}`);

            // 新規スキルの生成と格納
            const newSkill = {
                id: 'skill_' + Date.now(), uid: 'uid_' + Date.now(), type: 'skill',
                name: name, icon: icon, rarity: chipItem.rarity, color: chipItem.color, maxStack: 1,
                desc: `コスト:${totalCost} 依存:${chipItem.chipData.dependency==='str'?'力':'魔'}\n【効果】\n${effectTexts.length > 0 ? effectTexts.map(t=>'・'+t).join('\n') : 'なし'}`,
                skillData: { cost: totalCost, dependency: chipItem.chipData.dependency, effects: finalEffects }
            };

            window.addItemToInventory(newSkill);
            if (typeof window.addLog === 'function') window.addLog(`<span class='color-item'>スキル「${name}」</span> が完成し、スキルタブに格納されました！`, 'sys');
            
            document.getElementById('skillConfirmOverlay').style.display = 'none';
            document.getElementById('skillConfirmDialog').style.display = 'none';
            window.skillCreateState.materials = [];
            window.closeSkillCreateWindow();
            if (typeof window.renderInventory === 'function') window.renderInventory();
        });

        // プレビューのリアルタイム更新イベント
        document.getElementById('scIconInput').addEventListener('input', window.updateSkillUI);
        document.getElementById('scNameInput').addEventListener('input', window.updateSkillUI);
    };

    // --- 5. 公開関数群 ---
    window.openSkillCreateWindow = function(chipItem) {
        window.skillCreateState.isOpen = true;
        window.skillCreateState.baseChip = chipItem;
        
        const limits = { 'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Epic': 4, 'Legend': 5 };
        const maxSlots = limits[chipItem.rarity] || 1;
        window.skillCreateState.materials = Array(maxSlots).fill(null);
        
        document.getElementById('scTitleText').innerText = `スキル作成 (${chipItem.name})`;
        document.getElementById('scIconInput').value = '';
        document.getElementById('scNameInput').value = '';
        
        const win = document.getElementById('skillCreateWindow');
        if(win) {
            win.style.display = 'flex';
            win.style.left = '50%'; 
            win.style.top = '10%'; 
            win.style.transform = 'translateX(-50%)'; 
        }
        
        if(window.bringToFront) window.bringToFront('skillCreateWindow');
        window.renderSkillCreateSlots();
        window.updateSkillUI();
        
        const invWindow = document.getElementById('invWindow');
        if (invWindow && invWindow.style.display !== 'flex') {
            if(typeof window.toggleInventory === 'function') window.toggleInventory();
        }
        if(typeof window.switchTab === 'function') window.switchTab(3); 
    };

    window.closeSkillCreateWindow = function() {
        window.skillCreateState.isOpen = false;
        const win = document.getElementById('skillCreateWindow');
        if(win) win.style.display = 'none';
        const dlg = document.getElementById('skillConfirmDialog');
        if(dlg) dlg.style.display = 'none';
        const overlay = document.getElementById('skillConfirmOverlay');
        if(overlay) overlay.style.display = 'none';
        window.skillCreateState.materials = [];
        if(typeof window.renderInventory === 'function') window.renderInventory();
    };

    window.renderSkillCreateSlots = function() {
        const list = document.getElementById('scMaterialList');
        if(!list) return;
        list.innerHTML = '';
        
        window.skillCreateState.materials.forEach((mat, idx) => {
            const slot = document.createElement('div');
            slot.dataset.slotIdx = idx;
            
            if (mat) {
                slot.className = 'sc-slot filled';
                const rColor = window.RARITY && window.RARITY[mat.rarity] ? window.RARITY[mat.rarity].color : '#fff';
                slot.style.cssText = 'display:flex; border:1px solid #0f0; padding:5px; margin-bottom:5px; align-items:center; background:rgba(0,255,0,0.15); cursor:pointer; touch-action:none; border-radius:4px;';
                slot.innerHTML = `
                    <div style="width:24px; height:24px; background:${mat.color}; border:2px solid ${rColor}; border-radius:50%; margin-right:10px; flex-shrink:0;"></div>
                    <div style="color:#fff; font-size:11px; flex-grow:1; line-height:1.3;">
                        <div style="font-weight:bold; font-size:12px;">${mat.name}</div>
                        <div style="color:#ccc; white-space:pre-wrap;">${mat.desc}</div>
                    </div>
                `;
                slot.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    if(window.bringToFront) window.bringToFront('skillCreateWindow');
                    window.skillCreateState.materials[idx] = null;
                    window.renderSkillCreateSlots();
                    window.updateSkillUI();
                });
            } else {
                slot.className = 'sc-slot empty';
                slot.style.cssText = 'display:flex; border:1px dashed #777; padding:5px; margin-bottom:5px; align-items:center; background:rgba(0,0,0,0.4); border-radius:4px;';
                slot.innerHTML = `
                    <div style="width:24px; height:24px; border:1px dashed #555; border-radius:50%; margin-right:10px; flex-shrink:0;"></div>
                    <div style="color:#777; font-size:11px; font-weight:bold;">ETC素材をドロップ...</div>
                `;
            }
            list.appendChild(slot);
        });
    };

    window.updateSkillUI = function() {
        const iconInput = document.getElementById('scIconInput');
        const nameInput = document.getElementById('scNameInput');
        if(!iconInput || !nameInput || !window.skillCreateState.baseChip) return;

        const icon = iconInput.value.trim();
        const name = nameInput.value.trim();
        const chip = window.skillCreateState.baseChip;
        const capacity = chip.chipData.capacity;
        const dep = chip.chipData.dependency;
        
        let totalCost = 0;
        let mergedEffects = {};
        window.skillCreateState.materials.forEach(mat => {
            if (mat && mat.materialData) {
                totalCost += mat.materialData.cost;
                if(mat.materialData.effects) {
                    mat.materialData.effects.forEach(eff => {
                        if(!mergedEffects[eff.type]) mergedEffects[eff.type] = 0;
                        mergedEffects[eff.type] += eff.value; 
                    });
                }
            }
        });
        
        const createBtn = document.getElementById('scCreateBtn');
        let errorMsg = '';
        
        const isEmojiOnly = /^[\p{Extended_Pictographic}]+$/u.test(icon);
        if (!icon || !isEmojiOnly) {
            errorMsg = '※アイコン(絵文字)を正しく入力してください。';
        } else if (!name) {
            errorMsg = '※スキル名を入力してください。';
        } else if (totalCost > capacity) {
            errorMsg = '※コストが容量をオーバーしています。';
        } else if (totalCost <= 0 && window.skillCreateState.materials.some(m => m !== null)) {
            errorMsg = '※合計コストは1以上必要です。';
        } else {
            // ★ マイナス値によるロック判定（バリデーション）
            for (let type in mergedEffects) {
                let val = mergedEffects[type];
                if (type === 'atk_up') {
                    if (100 + val < 0) { // 攻撃倍率は基本100%があるので合算してマイナスなら不可
                        errorMsg = '※攻撃倍率が0%未満になる組み合わせはできません。';
                        break;
                    }
                } else {
                    const dbData = window.SKILL_EFFECT_DB && window.SKILL_EFFECT_DB[type];
                    if (dbData && dbData.allowNegative === false && val < 0) {
                        errorMsg = `※${dbData.name}が0未満になる組み合わせはできません。`;
                        break;
                    }
                }
            }
        }
        
        document.getElementById('scDepText').innerText = dep === 'str' ? 'ちから' : dep === 'int' ? 'まりょく' : 'なし';
        const costTextElem = document.getElementById('scCostText');
        costTextElem.innerText = `${totalCost} / ${capacity}`;
        costTextElem.style.color = (totalCost > capacity || totalCost <= 0) ? '#ff5555' : '#55ff55';
        
        document.getElementById('scErrorText').innerText = errorMsg;
        
        if (errorMsg) {
            createBtn.disabled = true; createBtn.style.backgroundColor = '#555'; createBtn.style.cursor = 'not-allowed';
        } else {
            createBtn.disabled = false; createBtn.style.backgroundColor = '#4CAF50'; createBtn.style.cursor = 'pointer';
        }
    };

    window.validateSkillMaterials = function() {
        if (!window.skillCreateState || !window.skillCreateState.isOpen) return;
        
        const invCounts = {};
        for (const tab in window.player.inventory) {
            window.player.inventory[tab].items.forEach(item => {
                invCounts[item.id] = (invCounts[item.id] || 0) + item.count;
            });
        }
        
        const required = {};
        let changed = false;
        for (let i = window.skillCreateState.materials.length - 1; i >= 0; i--) {
            const mat = window.skillCreateState.materials[i];
            if (mat) {
                const id = mat.id;
                required[id] = (required[id] || 0) + 1;
                if ((invCounts[id] || 0) < required[id]) {
                    window.skillCreateState.materials[i] = null; 
                    required[id] -= 1;
                    changed = true;
                }
            }
        }
        if (changed) {
            window.renderSkillCreateSlots();
            window.updateSkillUI();
        }
    };
})();