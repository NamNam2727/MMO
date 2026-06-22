// =========================================================
// skill.js
// スキルのターゲット指定、発動ロジック、バフ管理、描画への介入
// =========================================================

(function() {
    window.player.skillEffects = {}; 
    window.targetingSkill = null;
    window.itemCooldowns = window.itemCooldowns || {};
    window.itemMaxCooldowns = window.itemMaxCooldowns || {};
    
    // --- UI（詠唱バー・バフコンテナ・CSS）の自動生成 ---
    function initSkillUI() {
        if (!document.getElementById('skillStyle')) {
            const style = document.createElement('style');
            style.id = 'skillStyle';
            // ★変更: #buffContainer の絶対座標(top, left)指定を削除し、動的配置に任せる
            style.innerHTML = `
                #buffContainer { position: absolute; display: flex; gap: 8px; pointer-events: auto; z-index: 55; }
                .buff-slot { width: 32px; height: 32px; background: rgba(20,20,20,0.8); border: 1px solid #777; border-radius: 4px; position: relative; cursor: pointer; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.5); }
                .buff-time { position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%); font-size: 10px; color: white; text-shadow: 1px 1px 1px black, -1px -1px 1px black, 1px -1px 1px black, -1px 1px 1px black; font-weight: bold; }
                .buff-icon-emoji { font-size: 20px; line-height: 1; }
                @keyframes buffBlink { 0% { opacity: 1; border-color: #f55; } 50% { opacity: 0.3; border-color: #555; } 100% { opacity: 1; border-color: #f55; } }
                .buff-blink { animation: buffBlink 1s infinite; }

                #buffDetailWindow { position: absolute; background: rgba(10,10,10,0.95); border: 1px solid #777; border-radius: 6px; padding: 10px; z-index: 100; pointer-events: none; display: none; color: white; min-width: 140px; box-shadow: 0 4px 8px rgba(0,0,0,0.8); }
                #bdHeader { display: flex; align-items: center; border-bottom: 1px solid #555; padding-bottom: 5px; margin-bottom: 5px; }
                #bdIcon { font-size: 18px; margin-right: 5px; }
                #bdName { font-weight: bold; font-size: 14px; color: #fff; }
                #bdEffectList { font-size: 11px; line-height: 1.4; }

                #castBarContainer { position: absolute; display: none; left: 50%; top: 25%; transform: translateX(-50%); width: 160px; height: 14px; background: rgba(0,0,0,0.6); border: 2px solid #aaa; border-radius: 6px; z-index: 90; pointer-events: none; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.5); }
                #castBarFill { width: 0%; height: 100%; background: linear-gradient(90deg, #0088ff, #00ffff); transition: width 0.1s linear; }
                #castBarText { position: absolute; top: 0; left: 0; width: 100%; text-align: center; font-size: 10px; color: #fff; line-height: 14px; font-weight: bold; text-shadow: 1px 1px 1px #000; }
            `;
            document.head.appendChild(style);
        }

        const uiLayer = document.getElementById('ui-layer');
        if (!uiLayer) return;

        if (!document.getElementById('castBarContainer')) {
            const castBar = document.createElement('div');
            castBar.id = 'castBarContainer';
            castBar.innerHTML = `<div id="castBarFill"></div><div id="castBarText">詠唱中...</div>`;
            uiLayer.appendChild(castBar);
        }

        if (!document.getElementById('buffContainer')) {
            const buffCont = document.createElement('div');
            buffCont.id = 'buffContainer';
            uiLayer.appendChild(buffCont);
        }

        if (!document.getElementById('buffDetailWindow')) {
            const buffDet = document.createElement('div');
            buffDet.id = 'buffDetailWindow';
            buffDet.innerHTML = `<div id="bdHeader"><span id="bdIcon"></span><span id="bdName"></span></div><div id="bdEffectList"></div>`;
            uiLayer.appendChild(buffDet);
        }
    }
    
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSkillUI);
    else initSkillUI();

    // --- 1. スキルの準備とターゲット判定 ---
    window.prepareSkill = function(skillItem) {
        if (window.itemCooldowns && window.itemCooldowns[skillItem.id] > 0) {
            if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>まだ使用できません。</span>", 'sys');
            return;
        }

        const calcData = window.getCalculatedSkillData(skillItem);
        const cost = calcData.cost;
        
        if (calcData.dependency === 'int' && window.player.mp < cost) {
            if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>MPが不足しています。</span>", 'sys'); 
            return;
        }
        
        // 自身対象スキルは即詠唱開始
        if (calcData.targetType === 'self') {
            startCasting(skillItem, window.player); 
        } else {
            // 敵対象スキルで、現在ターゲットしている敵がいればそれを対象にする
            let validTarget = null;
            if (calcData.targetType === 'enemy' && window.player.targetEnemy && window.player.targetEnemy.state !== 'dead') {
                validTarget = window.player.targetEnemy;
            }

            if (validTarget) {
                window.player.pendingSkill = skillItem;
                window.player.pendingSkillTarget = validTarget;
                window.targetingSkill = null;
            } else {
                window.targetingSkill = skillItem;
                const targetName = calcData.targetType === 'enemy' ? '敵' : '味方';
                if (typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>ターゲットを選択してください。（画面内の${targetName}をタップ）</span>`, 'sys');
            }
        }
    };

    function startCasting(skill, target) {
        const calcData = window.getCalculatedSkillData(skill);
        const cost = calcData.cost;
        const castTime = cost * 0.1;
        
        if (castTime <= 0) {
            executeSkill(skill, target);
        } else {
            window.player.castingSkill = skill;
            window.player.castingTarget = target;
            window.player.castTimer = castTime;
            window.player.maxCastTime = castTime;
            
            window.player.wasAutoAttacking = window.player.isAutoAttacking;
            window.player.isAutoAttacking = false;
            window.playerPath = []; 
            if (typeof window.addLog === 'function') window.addLog(`<span class='color-sys'>${skill.name} の詠唱を開始...</span>`, 'sys');
        }
    }

    window.addEventListener('pointerdown', (e) => {
        if (e.target.closest('#ui-layer')) return;
        if (window.player && window.player.castingSkill) {
            window.player.castingSkill = null;
            window.player.castingTarget = null;
            window.player.castTimer = 0;
            if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>詠唱がキャンセルされました。</span>", 'sys');
        }
    }, { capture: true });

    // スキル用ターゲット選択（タップ時）
    window.addEventListener('pointerup', (e) => {
        if (window.targetingSkill) {
            e.stopPropagation(); e.stopImmediatePropagation();
            const rect = window.canvas.getBoundingClientRect(); 
            const targetX = (e.clientX - rect.left) + window.camera.x; 
            const targetY = (e.clientY - rect.top) + window.camera.y;
            
            const calcData = window.getCalculatedSkillData(window.targetingSkill);
            let clickedTarget = null;
            
            if (calcData.targetType === 'enemy') {
                for (const enemy of window.enemies) {
                    if (enemy.state !== 'dead' && Math.hypot(enemy.x - targetX, enemy.y - targetY) <= enemy.radius + 15) {
                        clickedTarget = enemy; break; 
                    }
                }
            } else if (calcData.targetType === 'ally') {
                if (Math.hypot(window.player.x - targetX, window.player.y - targetY) <= window.player.radius + 15) {
                    clickedTarget = window.player;
                }
            }

            if (clickedTarget) {
                window.player.pendingSkill = window.targetingSkill;
                window.player.pendingSkillTarget = clickedTarget;
                window.targetingSkill = null;
            } else {
                if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>キャンセルしました。</span>", 'sys');
                window.targetingSkill = null;
            }
        }
    }, { capture: true });

    // --- 2. スキルの状態監視ループ ---
    let lastTimeSkill = performance.now();
    function skillWatchLoop() {
        let now = performance.now(); let dt = (now - lastTimeSkill) / 1000; lastTimeSkill = now;

        if (window.player && window.player.skillEffects) {
            let statsChanged = false;
            for (let key in window.player.skillEffects) {
                let buff = window.player.skillEffects[key];
                if (buff.duration > 0) {
                    buff.duration -= dt;
                    if (buff.duration <= 0) { delete window.player.skillEffects[key]; statsChanged = true; }
                }
            }
            if (statsChanged) {
                if(typeof window.updatePlayerStats === 'function') window.updatePlayerStats();
            }
        }

        const castBarContainer = document.getElementById('castBarContainer');
        const castBarFill = document.getElementById('castBarFill');
        
        if (window.player && window.player.castingSkill) {
            window.player.castTimer -= dt;
            
            if (castBarContainer && castBarFill) {
                castBarContainer.style.display = 'block';
                const ratio = 1.0 - (window.player.castTimer / window.player.maxCastTime);
                castBarFill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
            }

            if (window.player.castTimer <= 0) {
                const skill = window.player.castingSkill;
                const target = window.player.castingTarget;
                
                window.player.castingSkill = null;
                window.player.castingTarget = null;
                
                if (castBarContainer) castBarContainer.style.display = 'none';
                executeSkill(skill, target);
                
                if (window.player.wasAutoAttacking) {
                    window.player.isAutoAttacking = true;
                    window.player.wasAutoAttacking = false;
                }
            }
        } else {
            if (castBarContainer) castBarContainer.style.display = 'none';
        }

        // ターゲットへの移動と発動距離の判定
        if (window.player && window.player.pendingSkill && window.player.pendingSkillTarget && !window.player.castingSkill) {
            const target = window.player.pendingSkillTarget;
            const skill = window.player.pendingSkill;
            let pIsFrozen = window.player.effects && window.player.effects.some(e => e.type === 'ice' && e.duration > 0);
            
            if (!pIsFrozen) {
                const dist = Math.hypot(target.x - window.player.x, target.y - window.player.y);
                let range = window.player.attackRange;
                
                const calcData = window.getCalculatedSkillData(skill);
                // 射程延長（range_up）のみを判定
                calcData.effects.forEach(e => {
                    if (e.type === 'range_up') range += (e.value * 10);
                });
                
                if (dist <= range || target === window.player) {
                    startCasting(skill, target);
                    window.player.pendingSkill = null; window.player.pendingSkillTarget = null; window.playerPath = []; 
                } else if (window.playerPath.length === 0 && typeof window.findPath === 'function') {
                    window.playerPath = window.findPath(window.player.x, window.player.y, target.x, target.y);
                }
            }
        }

        document.querySelectorAll('.ct-overlay, .ct-overlay-sc').forEach(overlay => {
            const id = overlay.getAttribute('data-ct-id');
            if (window.itemCooldowns && window.itemCooldowns[id] > 0) {
                const maxCt = (window.itemMaxCooldowns && window.itemMaxCooldowns[id]) ? window.itemMaxCooldowns[id] : 3.0;
                const ratio = window.itemCooldowns[id] / maxCt;
                overlay.style.height = `${ratio * 100}%`;
            } else {
                overlay.style.height = `0%`;
            }
        });

        if (window.player && window.player.activeBuffs) {
            let buffsChanged = false;
            let uiNeedsUpdate = false;

            for (let i = window.player.activeBuffs.length - 1; i >= 0; i--) {
                let buff = window.player.activeBuffs[i];
                let hasActiveEffect = false;
                for (let j = 0; j < buff.effects.length; j++) {
                    if (buff.effects[j].isActive) {
                        hasActiveEffect = true;
                        break;
                    }
                }
                
                if (buff.effects.length > 0 && !hasActiveEffect) {
                    window.player.activeBuffs.splice(i, 1);
                    buffsChanged = true;
                    continue;
                }

                if (buff.duration > 0) {
                    buff.duration -= dt;
                    uiNeedsUpdate = true;
                    if (buff.duration <= 0) {
                        window.player.activeBuffs.splice(i, 1);
                        buffsChanged = true;
                    }
                }
            }

            if (uiNeedsUpdate && !buffsChanged) {
                const container = document.getElementById('buffContainer');
                if (container && container.children.length === window.player.activeBuffs.length) {
                    window.player.activeBuffs.forEach((buff, idx) => {
                        const slot = container.children[idx];
                        if (slot) {
                            const timeElem = slot.querySelector('.buff-time');
                            if (timeElem) timeElem.innerText = Math.ceil(buff.duration);
                            
                            if (buff.duration <= 5.0) slot.classList.add('buff-blink');
                            else slot.classList.remove('buff-blink');
                        }
                    });
                } else {
                    buffsChanged = true;
                }
            }

            if (buffsChanged) {
                if (typeof window.updatePlayerStats === 'function') window.updatePlayerStats();
                window.renderBuffsUI();
            }
        }

        requestAnimationFrame(skillWatchLoop);
    }

    setTimeout(() => { requestAnimationFrame(skillWatchLoop); }, 200);

    // --- 3. スキルの実処理（効果適用） ---
    window.renderBuffsUI = function() {
        const container = document.getElementById('buffContainer');
        if (!container) return;

        // ★変更: プレイヤーウィジェットの現在の座標から相対位置でバフを配置
        const pWidget = document.getElementById('playerWidget');
        if (pWidget) {
            const rect = pWidget.getBoundingClientRect();
            // playerWidget の左上角を基準に配置 (例: 下に65px, 右に5px)
            container.style.top = (rect.top + 65) + 'px';
            container.style.left = (rect.left + 5) + 'px';
        }

        container.innerHTML = '';
        if (!window.player || !window.player.activeBuffs) return;

        window.player.activeBuffs.forEach((buff, idx) => {
            const slot = document.createElement('div');
            slot.className = 'buff-slot';
            if (buff.duration <= 5.0) slot.classList.add('buff-blink');
            
            slot.innerHTML = `
                <div class="buff-time">${Math.ceil(buff.duration)}</div>
                <div class="buff-icon-emoji">${buff.icon}</div>
            `;
            
            slot.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                const rect = slot.getBoundingClientRect();
                window.showBuffDetail(buff, rect);
            });
            container.appendChild(slot);
        });
    };

    window.showBuffDetail = function(buff, rect) {
        const win = document.getElementById('buffDetailWindow');
        if (!win) return;
        document.getElementById('bdIcon').innerText = buff.icon;
        document.getElementById('bdName').innerText = buff.skillName;
        
        const list = document.getElementById('bdEffectList');
        list.innerHTML = '';
        
        if (buff.effects.length === 0) {
            list.innerHTML = '<div style="color:#777;">効果なし</div>';
        } else {
            buff.effects.forEach(e => {
                const text = (typeof window.getEffectText === 'function') ? window.getEffectText(e) : `${e.type}+${e.value}`;
                const div = document.createElement('div');
                div.innerText = '・' + text;
                
                if (!e.isActive) {
                    div.style.color = '#777';
                    div.style.textDecoration = 'line-through';
                } else {
                    div.style.color = '#ddd';
                }
                list.appendChild(div);
            });
        }
        win.style.display = 'block';
        win.style.top = (rect.bottom + 10) + 'px';
        win.style.left = Math.max(10, rect.left) + 'px';
    };

    window.addEventListener('pointerdown', (e) => {
        const win = document.getElementById('buffDetailWindow');
        if (win && win.style.display === 'block') {
            if (!e.target.closest('.buff-slot') && !e.target.closest('#buffDetailWindow')) win.style.display = 'none';
        }
    });

    function invalidateOldBuffs(type) {
        if(!window.player.activeBuffs) return;
        window.player.activeBuffs.forEach(b => {
            b.effects.forEach(e => { if (e.type === type) e.isActive = false; });
        });
    }

    function executeSkill(skill, target) {
        const calcData = window.getCalculatedSkillData(skill);
        const cost = calcData.cost;
        const dep = calcData.dependency;
        const targetType = calcData.targetType;
        const areaType = calcData.areaType;
        const effects = calcData.effects;
        
        const coolTime = cost * 0.2;
        window.itemCooldowns[skill.id] = coolTime;
        window.itemMaxCooldowns[skill.id] = coolTime;
        
        if (dep === 'int') {
            if (window.player.mp < cost) { 
                if (typeof window.addLog === 'function') window.addLog("<span class='color-sys'>MPが不足しています。</span>", 'sys'); 
                return; 
            }
            window.player.mp -= cost;
        } else if (dep === 'str') {
            const hpCost = window.player.hp * (cost / 100);
            window.player.hp = Math.max(1, window.player.hp - hpCost);
        }
        if(typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
        if (typeof window.addLog === 'function') window.addLog(`<span class='color-status'>${skill.name} を発動！</span>`, 'sys');

        let targets = [];
        if (targetType === 'self') {
            targets.push(window.player);
        } else {
            if (areaType === 'circle') {
                let areaRadius = 50; 
                effects.forEach(e => { if(e.type === 'area_up') areaRadius += (e.value * 10); });
                
                if (targetType === 'enemy') {
                    window.enemies.forEach(e => {
                        if (e.state !== 'dead' && Math.hypot(e.x - target.x, e.y - target.y) <= areaRadius) targets.push(e);
                    });
                } else if (targetType === 'ally') {
                    if (Math.hypot(window.player.x - target.x, window.player.y - target.y) <= areaRadius) targets.push(window.player);
                }
            } else {
                targets.push(target);
            }
        }

        const durationTime = cost * 10;
        const freezeTime = cost * 0.1;

        targets.forEach(t => {
            let isAlly = (t === window.player);
            let effLogs = [];
            let damageMultiplier = isAlly ? 0 : 1.0; 

            if (isAlly) {
                let hasBuff = false;
                let newBuff = {
                    uid: 'buff_' + Date.now() + '_' + Math.floor(Math.random()*1000),
                    skillName: skill.name,
                    icon: skill.icon || '✨',
                    duration: durationTime,
                    maxDuration: durationTime,
                    effects: []
                };

                effects.forEach(eff => {
                    if (eff.type === 'atk_up') {
                        hasBuff = true;
                        invalidateOldBuffs('atk_up');
                        newBuff.effects.push({ type: 'atk_up', value: eff.value, isActive: true });
                        effLogs.push(typeof window.getEffectText === 'function' ? window.getEffectText(eff) : `攻撃倍率${eff.value > 0 ? '+' : ''}${eff.value}%`);
                    } else if (eff.type === 'range_up' || eff.type === 'area_up') {
                        effLogs.push(typeof window.getEffectText === 'function' ? window.getEffectText(eff) : `${eff.type}+${eff.value}`);
                    } else if (eff.type === 'ice') {
                        hasBuff = true;
                        invalidateOldBuffs('ice');
                        newBuff.effects.push({ type: 'ice', value: freezeTime, isActive: true });
                        effLogs.push(`氷属性付与＆凍結無効化`);
                    } else if (eff.type === 'heal') {
                        let healAmount = t.maxHp * (eff.value / 100); 
                        t.hp = Math.min(t.maxHp, t.hp + healAmount); 
                        effLogs.push(`${Math.floor(healAmount)}回復`);
                    }
                });

                if (hasBuff) {
                    window.player.activeBuffs = window.player.activeBuffs || [];
                    window.player.activeBuffs.push(newBuff);
                    window.renderBuffsUI();
                }
            } else {
                effects.forEach(eff => {
                    if (eff.type === 'atk_up') damageMultiplier += (eff.value / 100); 
                    else if (eff.type === 'ice') {
                        if (typeof window.applyElementEffect === 'function') window.applyElementEffect(window.player, t, 'ice', { duration: freezeTime }); 
                        effLogs.push(`凍結`); 
                    }
                });

                if (damageMultiplier > 0) {
                    let baseDamage = window.player.atk;
                    if (dep === 'int') {
                        baseDamage = (window.player.matk !== undefined) ? window.player.matk : Math.floor(window.player.atk * 0.5);
                    }
                    let dmg = baseDamage * damageMultiplier;
                    const actualDamage = Math.min(t.hp, dmg * (100 / (100 + (t.armor || 0)))); 
                    t.hp -= actualDamage;
                    t.hasBeenAttacked = true;
                    t.hateTable[window.player.id] = (t.hateTable[window.player.id] || 0) + window.player.atk;
                    t.damageTable[window.player.id] = (t.damageTable[window.player.id] || 0) + actualDamage;
                    effLogs.unshift(`${Math.floor(actualDamage)}ダメージ`);
                }
            }

            if (effLogs.length > 0 && typeof window.addLog === 'function') {
                window.addLog(`-> ${typeof window.getEntityName === 'function' ? window.getEntityName(t) : '対象'} : ${effLogs.join(', ')}`, 'sys');
            }
        });
        if (typeof window.updatePlayerStats === 'function') window.updatePlayerStats();
    }

    // --- 4. 既存関数のオーバーライド（フック） ---
    const waitBaseFunctions = setInterval(() => {
        if (window.updatePlayerStats && window.applyElementEffect && window.renderInventory && window.renderShortcutPages) {
            clearInterval(waitBaseFunctions);
            overrideBaseFunctions();
        }
    }, 100);

    function overrideBaseFunctions() {
        const origUpdatePlayerStats = window.updatePlayerStats;
        window.updatePlayerStats = function() {
            if (origUpdatePlayerStats) origUpdatePlayerStats();
            
            if (window.player && window.player.activeBuffs) {
                let totalAtkUp = 0;
                let hasIceEnchant = false;
                let iceDuration = 0;

                window.player.activeBuffs.forEach(buff => {
                    buff.effects.forEach(e => {
                        if (e.isActive) {
                            if (e.type === 'atk_up') totalAtkUp += e.value;
                            if (e.type === 'ice') {
                                hasIceEnchant = true;
                                iceDuration = e.value; 
                            }
                        }
                    });
                });

                if (totalAtkUp > 0 || totalAtkUp < 0) {
                    const multiplier = 1 + (totalAtkUp / 100);
                    window.player.atk = Math.floor(window.player.atk * multiplier);
                    if (window.player.matk !== undefined) window.player.matk = Math.floor(window.player.matk * multiplier);
                }

                if (hasIceEnchant) {
                    if (!window.player.equipped.weapon) window.player.equipped.weapon = { dummy: true };
                    window.player._origElement = window.player.equipped.weapon.element;
                    window.player.equipped.weapon.element = 'ice';
                    window.player.equipped.weapon.elementParams = { duration: iceDuration };
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
            let hasIceImmune = false;
            if (target.id === 'p1' && target.activeBuffs) {
                target.activeBuffs.forEach(b => {
                    b.effects.forEach(e => {
                        if (e.type === 'ice' && e.isActive) hasIceImmune = true;
                    });
                });
            }
            if (hasIceImmune && element === 'ice') return;
            if (origApplyElementEffect) origApplyElementEffect(attacker, target, element, params, skillId);
        };

        const origRenderInventory = window.renderInventory;
        window.renderInventory = function() {
            if (origRenderInventory) origRenderInventory();
            for (const tab in window.player.inventory) {
                window.player.inventory[tab].items.forEach((item, idx) => {
                    if (item.type === 'skill' && item.icon) {
                        if (window.tabsList[window.currentTabIndex] === tab) {
                            const slot = document.querySelector(`.inv-slot[data-idx="${idx}"] .item-icon`);
                            if (slot) {
                                if (!slot.querySelector('.ct-overlay')) {
                                    slot.innerHTML = `<div class="ct-overlay" data-ct-id="${item.id}" style="position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.7); height: 0%;"></div>` + slot.innerHTML;
                                }
                                if (!slot.querySelector('.emoji-icon')) {
                                    slot.innerHTML += `<span class="emoji-icon" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:24px; line-height:1;">${item.icon}</span>`;
                                }
                            }
                        }
                    }
                });
            }
        };

        const origRenderShortcutPages = window.renderShortcutPages;
        window.renderShortcutPages = function() {
            if (origRenderShortcutPages) origRenderShortcutPages();
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
