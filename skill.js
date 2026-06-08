// =========================================================
// skill.js
// スキルのターゲット指定、発動ロジック、バフ管理、描画への介入
// =========================================================

(function() {
    window.player.skillEffects = {}; 
    window.targetingSkill = null;
    
    // --- 1. スキルの準備とターゲット判定 ---
    window.prepareSkill = function(skillItem) {
        const cost = skillItem.skillData.cost;
        const dep = skillItem.skillData.dependency;
        
        if (dep === 'int' && window.player.mp < cost) {
            window.addLog("<span class='color-sys'>MPが不足しています。</span>", 'sys'); return;
        }
        
        const effects = skillItem.skillData.effects;
        const hasTargetSelf = effects.some(e => e.type === 'target_self');
        const hasAreaSelf = effects.some(e => e.type === 'area_self');
        
        if (hasTargetSelf || hasAreaSelf) {
            executeSkill(skillItem, window.player, hasTargetSelf, hasAreaSelf); 
        } else if (window.player.targetEnemy && window.player.targetEnemy.state !== 'dead') {
            window.player.pendingSkill = skillItem;
            window.player.pendingSkillTarget = window.player.targetEnemy;
            window.targetingSkill = null;
        } else {
            window.targetingSkill = skillItem;
            window.addLog("<span class='color-sys'>ターゲットを選択してください。（画面内の敵をタップ）</span>", 'sys');
        }
    };

    // 画面タップによるターゲット指定（キャプチャフェーズで介入）
    window.addEventListener('pointerup', (e) => {
        if (window.targetingSkill) {
            e.stopPropagation(); e.stopImmediatePropagation();
            const rect = window.canvas.getBoundingClientRect(); 
            const targetX = (e.clientX - rect.left) + window.camera.x; 
            const targetY = (e.clientY - rect.top) + window.camera.y;
            
            let clickedTarget = null;
            for (const enemy of window.enemies) {
                if (enemy.state !== 'dead' && Math.hypot(enemy.x - targetX, enemy.y - targetY) <= enemy.radius + 15) {
                    clickedTarget = enemy; break; 
                }
            }
            
            if (clickedTarget) {
                window.player.pendingSkill = window.targetingSkill;
                window.player.pendingSkillTarget = clickedTarget;
                window.targetingSkill = null;
            } else {
                window.addLog("<span class='color-sys'>キャンセルしました。(敵をタップしてください)</span>", 'sys');
                window.targetingSkill = null;
            }
        }
    }, { capture: true });

    // --- 2. スキルの状態監視ループ ---
    let lastTimeSkill = performance.now();
    function skillWatchLoop() {
        let now = performance.now(); let dt = (now - lastTimeSkill) / 1000; lastTimeSkill = now;

        // バフ時間の更新
        if (window.player && window.player.skillEffects) {
            let statsChanged = false;
            for (let key in window.player.skillEffects) {
                let buff = window.player.skillEffects[key];
                if (buff.duration > 0) {
                    buff.duration -= dt;
                    if (buff.duration <= 0) { delete window.player.skillEffects[key]; statsChanged = true; }
                }
            }
            if (statsChanged) window.updatePlayerStats();
        }

        // ターゲットへの移動と発動距離の判定
        if (window.player && window.player.pendingSkill && window.player.pendingSkillTarget) {
            const target = window.player.pendingSkillTarget;
            const skill = window.player.pendingSkill;
            let pIsFrozen = window.player.effects.some(e => e.type === 'ice' && e.duration > 0);
            
            if (!pIsFrozen) {
                const dist = Math.hypot(target.x - window.player.x, target.y - window.player.y);
                let range = window.player.attackRange;
                let hasArea = false;
                
                skill.skillData.effects.forEach(e => {
                    if (e.type === 'range_up') range += (e.value * 10);
                    if (e.type === 'area_self') { range += (e.value * 10); hasArea = true; }
                });
                
                if (dist <= range || target === window.player) {
                    executeSkill(skill, target, target === window.player, hasArea);
                    window.player.pendingSkill = null; window.player.pendingSkillTarget = null; window.playerPath = []; 
                } else if (window.playerPath.length === 0 && typeof window.findPath === 'function') {
                    window.playerPath = window.findPath(window.player.x, window.player.y, target.x, target.y);
                }
            }
        }
        requestAnimationFrame(skillWatchLoop);
    }
    requestAnimationFrame(skillWatchLoop);

    // --- 3. スキルの実処理（効果適用） ---
    function executeSkill(skill, target, isTargetSelf, isArea) {
        const cost = skill.skillData.cost;
        const dep = skill.skillData.dependency;
        
        // コスト消費
        if (dep === 'int') {
            if (window.player.mp < cost) { window.addLog("<span class='color-sys'>MPが不足しています。</span>", 'sys'); return; }
            window.player.mp -= cost;
        } else if (dep === 'str') {
            const hpCost = window.player.hp * (cost / 100);
            window.player.hp = Math.max(1, window.player.hp - hpCost);
        }
        if(typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
        window.addLog(`<span class='color-status'>${skill.name} を発動！</span>`, 'sys');

        let targets = [];
        if (isArea) {
            let range = window.player.attackRange;
            skill.skillData.effects.forEach(e => { 
                if(e.type === 'range_up' || e.type === 'area_self') range += (e.value * 10); 
            });
            if (isTargetSelf) { targets.push(window.player); } 
            else {
                window.enemies.forEach(e => {
                    if (e.state !== 'dead' && Math.hypot(e.x - window.player.x, e.y - window.player.y) <= range) targets.push(e);
                });
            }
        } else { targets.push(target); }

        const durationTime = cost * 10;
        const freezeTime = cost * 0.1;

        targets.forEach(t => {
            let isAlly = (t === window.player);
            let effLogs = [];
            let damageMultiplier = isAlly ? 0 : 1.0; 

            // 各効果の計算
            skill.skillData.effects.forEach(eff => {
                if (eff.type === 'atk_up') {
                    if (isAlly) { 
                        window.player.skillEffects['atk_up'] = { value: eff.value, duration: durationTime }; 
                        effLogs.push(`攻撃倍率+${eff.value}%`); 
                    } else { 
                        damageMultiplier += (eff.value / 100); 
                    }
                } else if (eff.type === 'range_up') {
                    if (isAlly) { effLogs.push(`支援射程延長`); }
                } else if (eff.type === 'heal') {
                    let healAmount = t.maxHp * (eff.value / 100); 
                    t.hp = Math.min(t.maxHp, t.hp + healAmount); 
                    effLogs.push(`${Math.floor(healAmount)}回復`);
                } else if (eff.type === 'ice') {
                    if (isAlly) { 
                        window.player.skillEffects['ice_enchant'] = { value: freezeTime, duration: durationTime }; 
                        effLogs.push(`氷属性付与＆凍結無効化`); 
                    } else { 
                        window.applyElementEffect(window.player, t, 'ice', { duration: freezeTime }); 
                        effLogs.push(`凍結`); 
                    }
                }
            });

            // ダメージ計算
            if (!isAlly && damageMultiplier > 0) {
                let dmg = window.player.atk * damageMultiplier;
                const actualDamage = Math.min(t.hp, dmg * (100 / (100 + (t.armor || 0)))); 
                t.hp -= actualDamage;
                t.hasBeenAttacked = true;
                t.hateTable[window.player.id] = (t.hateTable[window.player.id] || 0) + window.player.atk;
                t.damageTable[window.player.id] = (t.damageTable[window.player.id] || 0) + actualDamage;
                effLogs.unshift(`${Math.floor(actualDamage)}ダメージ`);
            }

            if (effLogs.length > 0) window.addLog(`-> ${window.getEntityName(t)} : ${effLogs.join(', ')}`, 'sys');
        });
        window.updatePlayerStats();
    }

    // --- 4. 既存関数のオーバーライド（フック） ---
    // main.js や entities.js の読み込み完了を待ってから上書きする
    const waitBaseFunctions = setInterval(() => {
        if (window.updatePlayerStats && window.applyElementEffect && window.renderInventory && window.renderShortcutPages) {
            clearInterval(waitBaseFunctions);
            overrideBaseFunctions();
        }
    }, 100);

    function overrideBaseFunctions() {
        const origUpdatePlayerStats = window.updatePlayerStats;
        window.updatePlayerStats = function() {
            origUpdatePlayerStats();
            if (window.player && window.player.skillEffects) {
                if (window.player.skillEffects.atk_up) {
                    const multiplier = 1 + (window.player.skillEffects.atk_up.value / 100);
                    window.player.atk = Math.floor(window.player.atk * multiplier);
                }
                if (window.player.skillEffects.ice_enchant) {
                    if (!window.player.equipped.weapon) window.player.equipped.weapon = { dummy: true };
                    window.player._origElement = window.player.equipped.weapon.element;
                    window.player.equipped.weapon.element = 'ice';
                    window.player.equipped.weapon.elementParams = { duration: window.player.skillEffects.ice_enchant.value };
                } else {
                    if (window.player.equipped.weapon && window.player.equipped.weapon.dummy) window.player.equipped.weapon = null;
                    else if (window.player.equipped.weapon && window.player._origElement !== undefined) {
                        window.player.equipped.weapon.element = window.player._origElement; delete window.player._origElement;
                    }
                }
            }
            if(typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
            const statusWindow = document.getElementById('statusWindow');
            if (statusWindow && statusWindow.style.display === 'flex' && typeof window.updateStatusUI === 'function') window.updateStatusUI();
        };

        const origApplyElementEffect = window.applyElementEffect;
        window.applyElementEffect = function(attacker, target, element, params, skillId) {
            if (target.id === 'p1' && target.skillEffects && target.skillEffects.ice_enchant && element === 'ice') return;
            origApplyElementEffect(attacker, target, element, params, skillId);
        };

        const origRenderInventory = window.renderInventory;
        window.renderInventory = function() {
            origRenderInventory();
            for (const tab in window.player.inventory) {
                window.player.inventory[tab].items.forEach((item, idx) => {
                    if (item.type === 'skill' && item.icon) {
                        if (window.tabsList[window.currentTabIndex] === tab) {
                            const slot = document.querySelector(`.inv-slot[data-idx="${idx}"] .item-icon`);
                            if (slot && !slot.querySelector('.emoji-icon')) {
                                slot.innerHTML += `<span class="emoji-icon" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:24px; line-height:1;">${item.icon}</span>`;
                            }
                        }
                    }
                });
            }
        };

        const origRenderShortcutPages = window.renderShortcutPages;
        window.renderShortcutPages = function() {
            origRenderShortcutPages();
            if (!window.player || !window.player.shortcuts) return;
            window.player.shortcuts.forEach((scData, globalIdx) => {
                if (scData && scData.type === 'skill') {
                    let actualItem = null;
                    for (const tab in window.player.inventory) {
                        actualItem = window.player.inventory[tab].items.find(i => i.uid === scData.uid);
                        if(actualItem) break;
                    }
                    if (actualItem && actualItem.icon) {
                        const slot = document.querySelector(`.shortcut-slot[data-sc-idx="${globalIdx}"] .item-icon`);
                        if (slot && !slot.querySelector('.emoji-icon')) {
                            slot.innerHTML += `<span class="emoji-icon" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:24px; line-height:1;">${actualItem.icon}</span>`;
                        }
                    }
                }
            });
        };
    }
})();
