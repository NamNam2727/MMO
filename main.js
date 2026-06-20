// =========================================================
// main.js
// 入力処理、メインループ(update)、ゲームの開始
// =========================================================

const input = { isDown: false, screenX: 0, screenY: 0 };
let pointerDownTime = 0;

function updateInputPos(e) {
    if (!window.canvas) return;
    const rect = window.canvas.getBoundingClientRect(); 
    input.screenX = e.clientX - rect.left; 
    input.screenY = e.clientY - rect.top;
}

window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

document.addEventListener('touchmove', function(e) {
    if (window.isDraggingItem) {
        e.preventDefault();
        return;
    }
    const isScrollable = e.target.closest('#invContent, #statusWindow, #fullLogContent, #chatLogContent, #debug-console, #partyListWindow, #otherPlayerStatusWindow, #settingWindow, #areaSelectWindow');
    if (!isScrollable) {
        e.preventDefault();
    }
}, { passive: false });

window.addEventListener('pointerdown', (e) => {
    const itemDetail = document.getElementById('itemDetail');
    const invWindow = document.getElementById('invWindow');
    const statWindow = document.getElementById('statusWindow');
    const areaSelect = document.getElementById('areaSelectWindow');
    
    if (itemDetail && itemDetail.style.display === 'flex' && !itemDetail.contains(e.target) && !e.target.closest('.inv-slot')) {
        itemDetail.style.display = 'none';
    }
    if (areaSelect && areaSelect.style.display === 'flex' && !areaSelect.contains(e.target)) {
        areaSelect.style.display = 'none';
    }

    if ((invWindow && e.target.closest('#invWindow')) || 
        (itemDetail && e.target.closest('#itemDetail')) || 
        (statWindow && e.target.closest('#statusWindow')) || 
        (areaSelect && e.target.closest('#areaSelectWindow')) ||
        e.target.closest('#playerWidget') || 
        e.target.closest('#bottomUIContainer') || 
        e.target.closest('#buffDetailWindow') ||
        e.target.closest('#partyListWindow') ||
        e.target.closest('#otherPlayerStatusWindow') ||
        e.target.closest('#settingWindow') ||
        e.target.closest('#settingBtn') ||
        e.target.tagName === 'BUTTON' || 
        e.target.tagName === 'SELECT' || 
        e.target.tagName === 'INPUT') return;
    
    input.isDown = true; updateInputPos(e); pointerDownTime = performance.now();
    
    // ★修正: タップ時にターゲットを一括クリア
    window.playerPath = []; window.player.isAutoAttacking = false; 
    window.player.targetItem = null; window.player.targetNpc = null;
});

window.addEventListener('pointermove', (e) => { 
    if (window.isScDragging) return; 
    if (input.isDown) updateInputPos(e); 
});

window.showAreaSelectUI = function(eventDef) {
    let ui = document.getElementById('areaSelectWindow');
    if (!ui) {
        ui = document.createElement('div');
        ui.id = 'areaSelectWindow';
        ui.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 280px; background-color: rgba(20,20,30,0.95); border: 2px solid #777; border-radius: 8px; display: none; flex-direction: column; pointer-events: auto; color: white; padding: 20px; box-sizing: border-box; z-index: 100; box-shadow: 0 10px 20px rgba(0,0,0,0.8); text-align: center;';
        document.getElementById('ui-layer').appendChild(ui);
    }
    
    ui.innerHTML = `
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #00ffff;">${eventDef.name || '不明なエリア'}</div>
        <div style="font-size: 13px; line-height: 1.5; color: #ddd; margin-bottom: 25px;">${eventDef.description || 'このエリアにはまだ入れません。'}</div>
        <div style="display: flex; justify-content: space-around; gap: 10px;">
            <button id="btnAreaEnter" style="flex: 1; padding: 12px; background-color: #e94560; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">進入する</button>
            <button id="btnAreaCancel" style="flex: 1; padding: 12px; background-color: #555; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">やめる</button>
        </div>
    `;
    
    ui.style.display = 'flex';
    
    document.getElementById('btnAreaCancel').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        ui.style.display = 'none';
    });
    
    document.getElementById('btnAreaEnter').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        ui.style.display = 'none';
        if (window.MapManager && eventDef.targetMap) {
            window.MapManager.changeMap(eventDef.targetMap, eventDef.targetId);
        }
    });
};

function handlePointerUp(e) {
    if (window.isScDragging) return; 
    if (input.isDown) {
        const currentTime = performance.now();
        if (currentTime - pointerDownTime < 200) {
            
            if (window.isMapLoading) {
                input.isDown = false;
                return;
            }

            const isWorldMap = window.MapManager && window.MapManager.currentMapId === 'worldMap';
            
            if (isWorldMap) {
                if (window.worldMapRect && window.currentEventMap) {
                    const rect = window.worldMapRect;
                    
                    if (input.screenX >= rect.x && input.screenX <= rect.x + rect.w &&
                        input.screenY >= rect.y && input.screenY <= rect.y + rect.h) {
                        
                        const relX = input.screenX - rect.x;
                        const relY = input.screenY - rect.y;

                        const gridRows = window.currentEventMap.length;
                        const gridCols = gridRows > 0 ? window.currentEventMap[0].length : 0;

                        if (gridCols > 0 && gridRows > 0) {
                            const cellW = rect.w / gridCols;
                            const cellH = rect.h / gridRows;

                            const gridX = Math.floor(relX / cellW);
                            const gridY = Math.floor(relY / cellH);

                            if (window.currentEventMap[gridY] && window.currentEventMap[gridY][gridX]) {
                                const eventId = window.currentEventMap[gridY][gridX];
                                if (eventId > 0 && window.currentEvents && window.currentEvents[eventId]) {
                                    const eventDef = window.currentEvents[eventId];
                                    if (eventDef.type === 'area_select') {
                                        window.showAreaSelectUI(eventDef);
                                    }
                                }
                            }
                        }
                    }
                }
                input.isDown = false;
                return; 
            }

            const targetX = input.screenX + window.camera.x; 
            const targetY = input.screenY + window.camera.y;
            
            // ★追加: 1.NPCのタップ判定を最優先で行う
            let clickedNpc = null;
            if (window.npcs) {
                for (const npc of window.npcs) {
                    const dist = Math.hypot(npc.x - targetX, npc.y - targetY);
                    if (dist <= npc.radius + 15) { clickedNpc = npc; break; }
                }
            }

            // 2.敵の判定
            let clickedEnemy = null;
            if (!clickedNpc) {
                for (const enemy of window.enemies) {
                    if (enemy.state !== 'dead') {
                        const dist = Math.hypot(enemy.x - targetX, enemy.y - targetY);
                        if (dist <= enemy.radius + 15) { clickedEnemy = enemy; break; }
                    }
                }
            }

            // 3.アイテムの判定
            let clickedItem = null;
            if (!clickedNpc && !clickedEnemy) {
                for (const item of window.droppedItems) {
                    const dist = Math.hypot(item.x - targetX, item.y - targetY);
                    if (dist <= item.radius + 15) { clickedItem = item; break; }
                }
            }

            // ★追加: 各ターゲットごとの動作振り分け
            if (clickedNpc) {
                window.player.targetEnemy = null; 
                window.player.isAutoAttacking = false;
                window.player.targetItem = null;
                window.player.targetNpc = clickedNpc; 
                if(typeof window.findPath === 'function') {
                    window.playerPath = window.findPath(window.player.x, window.player.y, clickedNpc.x, clickedNpc.y);
                }
            } else if (clickedEnemy) {
                window.player.targetNpc = null;
                window.player.targetEnemy = clickedEnemy; 
                window.player.isAutoAttacking = true;
                window.player.targetItem = null;
                if(typeof window.findPath === 'function') {
                    window.playerPath = window.findPath(window.player.x, window.player.y, clickedEnemy.x, clickedEnemy.y);
                }
            } else if (clickedItem) {
                window.player.targetNpc = null;
                if (clickedItem.ownerId === null || clickedItem.ownerId === window.player.id) {
                    window.player.targetEnemy = null; window.player.isAutoAttacking = false;
                    window.player.targetItem = clickedItem;
                    if(typeof window.findPath === 'function') {
                        window.playerPath = window.findPath(window.player.x, window.player.y, clickedItem.x, clickedItem.y);
                    }
                } else {
                    window.player.isAutoAttacking = false; window.player.targetItem = null;
                    if(typeof window.findPath === 'function') {
                        window.playerPath = window.findPath(window.player.x, window.player.y, targetX, targetY);
                    }
                }
            } else {
                window.player.targetNpc = null;
                window.player.isAutoAttacking = false; window.player.targetItem = null;
                if(typeof window.findPath === 'function') {
                    window.playerPath = window.findPath(window.player.x, window.player.y, targetX, targetY);
                }
            }
        }
        input.isDown = false;
    }
}

window.addEventListener('pointerup', handlePointerUp); 
window.addEventListener('pointercancel', handlePointerUp); 
window.addEventListener('pointerout', handlePointerUp);

function loadAvatarImages() {
    if (window.GameState && window.GameState.userInfo) {
        const myUrl = window.GameState.userInfo.portrait || window.GameState.userInfo.portait;
        if (myUrl && !window.playerAvatarImage) {
            window.playerAvatarImage = new Image();
            window.playerAvatarImage.crossOrigin = "anonymous";
            window.playerAvatarImage.src = myUrl;
        }
    }
}

let lastMapId = null; 

function update(dt, timestamp) {
    loadAvatarImages(); 

    if (window.isMapLoading) {
        if (window.MultiplayerManager) {
            window.MultiplayerManager.update(dt, timestamp);
        }
        return; 
    }

    const currentMapId = window.MapManager ? window.MapManager.currentMapId : null;
    const isWorldMap = currentMapId === 'worldMap';
    
    if (lastMapId !== currentMapId) {
        lastMapId = currentMapId;
        
        const pWidget = document.getElementById('playerWidget');
        if (pWidget) pWidget.style.display = isWorldMap ? 'none' : 'flex';
        
        const attackBtn = document.getElementById('attackBtn');
        if (attackBtn) attackBtn.style.display = isWorldMap ? 'none' : 'flex';
        
        const lootBtn = document.getElementById('lootBtn');
        if (lootBtn) lootBtn.style.display = isWorldMap ? 'none' : 'flex';
        
        if (isWorldMap) {
            window.camera.x = 0;
            window.camera.y = 0;
            window.playerPath = [];
            window.player.targetEnemy = null;
            window.player.targetItem = null;
            window.player.targetNpc = null; // ★NPCターゲットも解除
            input.isDown = false;
        }
    }

    if (isWorldMap) {
        if (window.MultiplayerManager) {
            window.MultiplayerManager.update(dt, timestamp);
        }
        return; 
    }

    if (window.MultiplayerManager) {
        window.MultiplayerManager.update(dt, timestamp);
    }

    if (window.player.attackCooldown > 0) window.player.attackCooldown -= dt;
    if (window.player.chatTimer > 0) window.player.chatTimer -= dt;
    
    let pIsFrozen = window.player.effects && window.player.effects.some(e => e.type === 'ice' && e.duration > 0);
    let pIsShocked = window.player.effects && window.player.effects.some(e => e.type === 'lightning' && e.duration > 0);
    
    let isMovementBlocked = pIsFrozen || window.player.attackCooldown > 0 || window.player.castingSkill;

    if(typeof window.updateEffects === 'function') window.updateEffects(window.player, dt);
    if(typeof window.updateEnemies === 'function') window.updateEnemies(dt);

    for (const item of window.droppedItems) {
        item.lifeTime += dt;
        if (item.ownerId !== null && item.lifeTime >= window.FREE_LOOT_TIME) {
            item.ownerId = null; 
        }
    }

    let initialDistanceToWaypoint = 0;
    if (window.playerPath.length > 0) {
        initialDistanceToWaypoint = Math.hypot(window.playerPath[0].x - window.player.x, window.playerPath[0].y - window.player.y);
    }

    let shouldMove = true;
    if (pIsFrozen) shouldMove = false; 

    // =========================================================
    // ★追加: 友好的なNPCへの接近・インタラクト処理
    // =========================================================
    if (window.player.targetNpc && !pIsFrozen) {
        if (window.player.castingSkill) {
            shouldMove = false; 
            window.playerPath = [];
        } else {
            const npc = window.player.targetNpc;
            const distToNpc = Math.hypot(npc.x - window.player.x, npc.y - window.player.y);
            // 敵への攻撃射程と同じ距離で話しかけられるようにする
            if (distToNpc <= window.player.attackRange + 20) {
                shouldMove = false; window.playerPath = [];
                // 接近したらインタラクト関数（お店を開くなど）を実行
                if (npc.interact && typeof npc.interact === 'function') {
                    npc.interact(npc, window.player);
                }
                // 一度話しかけたらターゲットを解除する（何度も開き直すのを防ぐため）
                window.player.targetNpc = null;
            } else {
                if (window.playerPath.length === 0 && typeof window.findPath === 'function') {
                    window.playerPath = window.findPath(window.player.x, window.player.y, npc.x, npc.y);
                }
            }
        }
    }

    // 敵への攻撃処理
    if (!window.player.targetNpc && !pIsFrozen && window.player.targetEnemy && window.player.targetEnemy.state !== 'dead' && window.player.isAutoAttacking) {
        if (window.player.castingSkill) {
            shouldMove = false; 
            window.playerPath = []; 
        } else {
            const distToEnemy = Math.hypot(window.player.targetEnemy.x - window.player.x, window.player.targetEnemy.y - window.player.y);
            if (distToEnemy <= window.player.attackRange) {
                shouldMove = false; window.playerPath = []; 
                if (window.player.attackCooldown <= 0) {
                    const actualDamage = Math.min(window.player.targetEnemy.hp, window.player.atk);
                    window.player.targetEnemy.hp -= actualDamage;
                    window.player.targetEnemy.hasBeenAttacked = true;
                    window.player.targetEnemy.hateTable[window.player.id] = (window.player.targetEnemy.hateTable[window.player.id] || 0) + window.player.atk;
                    window.player.targetEnemy.damageTable[window.player.id] = (window.player.targetEnemy.damageTable[window.player.id] || 0) + actualDamage;
                    
                    if (typeof window.addLog === 'function' && typeof window.getEntityName === 'function') {
                        window.addLog(`${window.getEntityName(window.player)} は ${window.getEntityName(window.player.targetEnemy)} に <span class='color-damage'>${Math.floor(actualDamage)}</span> ダメージを与えた！`, 'damage');
                    }

                    let pCdRate = window.player.attackRate; 
                    if (pIsShocked) pCdRate *= 1.5;
                    window.player.attackCooldown = pCdRate; 
                    isMovementBlocked = true; 
                    
                    if (window.player.equipped.weapon && window.player.equipped.weapon.element) {
                        if(typeof window.applyElementEffect === 'function') window.applyElementEffect(window.player, window.player.targetEnemy, window.player.equipped.weapon.element, window.player.equipped.weapon.elementParams);
                    }
                }
            } else {
                if (window.playerPath.length === 0 && typeof window.findPath === 'function') {
                    window.playerPath = window.findPath(window.player.x, window.player.y, window.player.targetEnemy.x, window.player.targetEnemy.y);
                }
            }
        }
    }
    
    // アイテム回収処理
    if (!window.player.targetNpc && window.player.targetItem && !pIsFrozen) {
        if (window.player.castingSkill) {
            shouldMove = false; 
            window.playerPath = [];
        } else {
            const itemIndex = window.droppedItems.findIndex(i => i.uid === window.player.targetItem.uid);
            if (itemIndex !== -1) {
                const item = window.droppedItems[itemIndex];
                if (item.ownerId === null || item.ownerId === window.player.id) {
                    const distToItem = Math.hypot(item.x - window.player.x, item.y - window.player.y);
                    if (distToItem <= window.player.pickupRange) {
                        shouldMove = false; window.playerPath = [];
                        const added = window.addItemToInventory(item);
                        if (added) {
                            window.droppedItems.splice(itemIndex, 1);
                            
                            if (typeof window.addLog === 'function') {
                                let itemNameDisplay = item.name;
                                if (item.maxStack > 1) itemNameDisplay += ` x ${item.count}`;
                                window.addLog(`<span class='color-item'>${itemNameDisplay}</span> を獲得した！`, 'item');
                            }
                            
                            const invWindow = document.getElementById('invWindow');
                            if (invWindow && invWindow.style.display === 'flex' && typeof window.renderInventory === 'function') window.renderInventory();
                        }
                        window.player.targetItem = null;
                    } else {
                        if (window.playerPath.length === 0 && typeof window.findPath === 'function') {
                            window.playerPath = window.findPath(window.player.x, window.player.y, item.x, item.y);
                        }
                    }
                } else {
                    window.player.targetItem = null; window.playerPath = [];
                }
            } else {
                window.player.targetItem = null; window.playerPath = [];
            }
        }
    }

    let currentSpeed = window.player.speed;
    if (pIsShocked) currentSpeed *= 0.5;
    const moveDistance = currentSpeed * dt;

    if (!isMovementBlocked && shouldMove) {
        if (input.isDown) {
            window.player.targetX = input.screenX + window.camera.x; window.player.targetY = input.screenY + window.camera.y;
            const dx = window.player.targetX - window.player.x; const dy = window.player.targetY - window.player.y; const distance = Math.hypot(dx, dy);
            if (distance > moveDistance) {
                const angle = Math.atan2(dy, dx); 
                window.player.x += Math.cos(angle) * moveDistance; 
                window.player.y += Math.sin(angle) * moveDistance;
            }
        } else if (window.playerPath.length > 0) {
            const wp = window.playerPath[0];
            if (initialDistanceToWaypoint <= moveDistance) {
                window.player.x = wp.x; window.player.y = wp.y; window.playerPath.shift();
            } else {
                const angle = Math.atan2(wp.y - window.player.y, wp.x - window.player.x);
                window.player.x += Math.cos(angle) * moveDistance; 
                window.player.y += Math.sin(angle) * moveDistance;
            }
        }
    }

    window.player.x = Math.max(window.player.radius, Math.min(window.player.x, window.world.width - window.player.radius));
    window.player.y = Math.max(window.player.radius, Math.min(window.player.y, window.world.height - window.player.radius));

    let isCollidingWithWall = false;
    for (const obs of window.obstacles) {
        if(typeof window.checkCollision === 'function') {
            const pushBack = window.checkCollision(window.player, obs);
            if (pushBack) {
                window.player.x += pushBack.x; window.player.y += pushBack.y; isCollidingWithWall = true;
            }
        }
    }

    if (!input.isDown && window.playerPath.length > 0 && isCollidingWithWall && !isMovementBlocked) {
        const currentDistanceToWaypoint = Math.hypot(window.playerPath[0].x - window.player.x, window.playerPath[0].y - window.player.y);
        if (currentDistanceToWaypoint >= initialDistanceToWaypoint - 0.5) window.playerPath.shift();
    }

    if (!window.player.isWarping && window.currentEventMap && window.currentEvents) {
        const gridX = Math.floor(window.player.x / 32);
        const gridY = Math.floor(window.player.y / 32);
        if (window.currentEventMap[gridY] && window.currentEventMap[gridY][gridX]) {
            const eventId = window.currentEventMap[gridY][gridX];
            if (eventId > 0) {
                const eventDef = window.currentEvents[eventId];
                if (eventDef && eventDef.type === 'warp') {
                    window.player.isWarping = true;
                    window.playerPath = [];
                    input.isDown = false;
                    
                    if (window.MapManager) {
                        window.MapManager.changeMap(eventDef.targetMap, eventDef.targetId);
                    }
                    setTimeout(() => { if (window.player) window.player.isWarping = false; }, 1000);
                }
            }
        }
    }

    const screenX = window.player.x - window.camera.x; const screenY = window.player.y - window.camera.y;
    const centerX = window.camera.width / 2; const centerY = window.camera.height / 2;
    if (screenX < centerX - window.camera.deadZoneX) window.camera.x -= (centerX - window.camera.deadZoneX) - screenX;
    else if (screenX > centerX + window.camera.deadZoneX) window.camera.x += screenX - (centerX + window.camera.deadZoneX);
    if (screenY < centerY - window.camera.deadZoneY) window.camera.y -= (centerY - window.camera.deadZoneY) - screenY;
    else if (screenY > centerY + window.camera.deadZoneY) window.camera.y += screenY - (centerY + window.camera.deadZoneY);
    window.camera.x = Math.max(0, Math.min(window.camera.x, window.world.width - window.camera.width));
    window.camera.y = Math.max(0, Math.min(window.camera.y, window.world.height - window.camera.height));
}

let lastTime = 0;
window.gameLoop = function(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;
    
    update(dt, timestamp); 
    
    if (window.GameRenderer) {
        window.GameRenderer.draw();
    }

    if (window.isMapLoading && window.ctx && window.canvas) {
        const ctx = window.ctx;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, window.canvas.width, window.canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const bounce = Math.sin(timestamp / 150) * 5;
        ctx.fillText('マップ読み込み中...', window.canvas.width / 2, window.canvas.height / 2 + bounce);
        ctx.restore();
    }
    
    requestAnimationFrame(window.gameLoop);
};

if (typeof window.addLog === 'function') {
    window.addLog("<span class='color-sys'>システム: システムを起動しました。</span>", 'sys'); 
}
if (typeof window.updatePlayerStats === 'function') window.updatePlayerStats();
if (typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
