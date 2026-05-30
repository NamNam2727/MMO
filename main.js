// =========================================================
// main.js
// 入力処理、メインループ(update/draw)、ゲームの開始
// =========================================================

const input = { isDown: false, screenX: 0, screenY: 0 };
let pointerDownTime = 0;

function updateInputPos(e) {
    if (!window.canvas) return;
    const rect = window.canvas.getBoundingClientRect(); 
    input.screenX = e.clientX - rect.left; 
    input.screenY = e.clientY - rect.top;
}

// --- 入力イベント (タップ/長押し) ---
window.addEventListener('pointerdown', (e) => {
    const itemDetail = document.getElementById('itemDetail');
    const invWindow = document.getElementById('invWindow');
    const statWindow = document.getElementById('statusWindow');
    
    if (itemDetail && itemDetail.style.display === 'flex' && !itemDetail.contains(e.target) && !e.target.closest('.inv-slot')) {
        itemDetail.style.display = 'none';
    }
    // UIをタップした場合は移動キャンセル
    if ((invWindow && e.target.closest('#invWindow')) || 
        (itemDetail && e.target.closest('#itemDetail')) || 
        (statWindow && e.target.closest('#statusWindow')) || 
        e.target.closest('#playerWidget') || 
        e.target.closest('#bottomUIContainer') || 
        e.target.tagName === 'BUTTON' || 
        e.target.tagName === 'SELECT' || 
        e.target.tagName === 'INPUT') return;
    
    // ★ここでプレイヤーが自ら画面をタップした時のみ自動攻撃を解除
    input.isDown = true; updateInputPos(e); pointerDownTime = performance.now();
    window.playerPath = []; window.player.isAutoAttacking = false; window.player.targetItem = null; 
});

window.addEventListener('pointermove', (e) => { 
    if (window.isScDragging) return; 
    if (input.isDown) updateInputPos(e); 
});

function handlePointerUp(e) {
    if (window.isScDragging) return; 
    if (input.isDown) {
        const currentTime = performance.now();
        if (currentTime - pointerDownTime < 200) {
            const targetX = input.screenX + window.camera.x; 
            const targetY = input.screenY + window.camera.y;
            
            let clickedEnemy = null;
            for (const enemy of window.enemies) {
                if (enemy.state !== 'dead') {
                    const dist = Math.hypot(enemy.x - targetX, enemy.y - targetY);
                    if (dist <= enemy.radius + 15) { clickedEnemy = enemy; break; }
                }
            }

            let clickedItem = null;
            if (!clickedEnemy) {
                for (const item of window.droppedItems) {
                    const dist = Math.hypot(item.x - targetX, item.y - targetY);
                    if (dist <= item.radius + 15) { clickedItem = item; break; }
                }
            }

            if (clickedEnemy) {
                window.player.targetEnemy = clickedEnemy; 
                window.player.isAutoAttacking = true;
                window.player.targetItem = null;
                if(typeof window.findPath === 'function') {
                    window.playerPath = window.findPath(window.player.x, window.player.y, clickedEnemy.x, clickedEnemy.y);
                }
            } else if (clickedItem) {
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


// ==========================================
// 更新処理 (Update)
// ==========================================
function update(dt, timestamp) {
    if (window.player.attackCooldown > 0) window.player.attackCooldown -= dt;
    
    // 凍結と感電の判定
    let pIsFrozen = window.player.effects.some(e => e.type === 'ice' && e.duration > 0);
    let pIsShocked = window.player.effects.some(e => e.type === 'lightning' && e.duration > 0);
    
    // 凍結中、または攻撃直後のクールダウン中は移動不可
    let isMovementBlocked = pIsFrozen || window.player.attackCooldown > 0;

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
    
    if (pIsFrozen) {
        shouldMove = false; 
        // ★修正: 凍結しても自動攻撃フラグは落とさない（解除後に再開させるため）
    }

    // 攻撃処理
    if (!pIsFrozen && window.player.targetEnemy && window.player.targetEnemy.state !== 'dead' && window.player.isAutoAttacking) {
        const distToEnemy = Math.hypot(window.player.targetEnemy.x - window.player.x, window.player.targetEnemy.y - window.player.y);
        if (distToEnemy <= window.player.attackRange) {
            shouldMove = false; window.playerPath = []; 
            if (window.player.attackCooldown <= 0) {
                const actualDamage = Math.min(window.player.targetEnemy.hp, window.player.atk);
                window.player.targetEnemy.hp -= actualDamage;
                window.player.targetEnemy.hasBeenAttacked = true;
                window.player.targetEnemy.hateTable[window.player.id] = (window.player.targetEnemy.hateTable[window.player.id] || 0) + window.player.atk;
                window.player.targetEnemy.damageTable[window.player.id] = (window.player.targetEnemy.damageTable[window.player.id] || 0) + actualDamage;
                
                // 与ダメージログの出力
                if (typeof window.addLog === 'function' && typeof window.getEntityName === 'function') {
                    window.addLog(`${window.getEntityName(window.player)} は ${window.getEntityName(window.player.targetEnemy)} に <span class='color-damage'>${Math.floor(actualDamage)}</span> ダメージを与えた！`, 'damage');
                }

                // 感電時はクールダウン1.5倍
                let pCdRate = window.player.attackRate; 
                if (pIsShocked) pCdRate *= 1.5;
                window.player.attackCooldown = pCdRate; 
                isMovementBlocked = true; // 攻撃した瞬間から移動不可
                
                // 属性攻撃の適用
                if (window.player.equipped.weapon && window.player.equipped.weapon.element) {
                    if(typeof window.applyElementEffect === 'function') {
                        window.applyElementEffect(window.player, window.player.targetEnemy, window.player.equipped.weapon.element, window.player.equipped.weapon.elementParams);
                    }
                }
            }
        } else {
            if (window.playerPath.length === 0 && typeof window.findPath === 'function') {
                window.playerPath = window.findPath(window.player.x, window.player.y, window.player.targetEnemy.x, window.player.targetEnemy.y);
            }
        }
    }
    
    // アイテム回収処理
    if (window.player.targetItem && !pIsFrozen) {
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
                            window.addLog(`<span class='color-item'>${item.name}</span> を獲得した！`, 'item');
                        }
                        const invWindow = document.getElementById('invWindow');
                        if (invWindow && invWindow.style.display === 'flex' && typeof window.renderInventory === 'function') {
                            window.renderInventory();
                        }
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

    // 感電中は移動速度半減
    let currentSpeed = window.player.speed;
    if (pIsShocked) currentSpeed *= 0.5;
    const moveDistance = currentSpeed * dt;

    // 硬直中でなければ移動を適用
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

    // 境界制限・衝突
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

    // カメラ追従
    const screenX = window.player.x - window.camera.x; const screenY = window.player.y - window.camera.y;
    const centerX = window.camera.width / 2; const centerY = window.camera.height / 2;
    if (screenX < centerX - window.camera.deadZoneX) window.camera.x -= (centerX - window.camera.deadZoneX) - screenX;
    else if (screenX > centerX + window.camera.deadZoneX) window.camera.x += screenX - (centerX + window.camera.deadZoneX);
    if (screenY < centerY - window.camera.deadZoneY) window.camera.y -= (centerY - window.camera.deadZoneY) - screenY;
    else if (screenY > centerY + window.camera.deadZoneY) window.camera.y += screenY - (centerY + window.camera.deadZoneY);
    window.camera.x = Math.max(0, Math.min(window.camera.x, window.world.width - window.camera.width));
    window.camera.y = Math.max(0, Math.min(window.camera.y, window.world.height - window.camera.height));
}

// ==========================================
// 描画処理 (Draw)
// ==========================================

// 状態異常のアイコン描画関数
function drawStatusIcons(entity, ctx) {
    if (!entity.effects || entity.effects.length === 0) return;
    const icons = { 'fire':'🔥', 'ice':'🧊', 'lightning':'⚡️', 'wind':'🌪️' };
    const iconSize = 16;
    let y = entity.y - entity.radius - 28; 
    let startX = entity.x - ((entity.effects.length * (iconSize + 2)) / 2) + (iconSize / 2);
    
    ctx.font = `${iconSize}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    entity.effects.forEach((e, idx) => {
        let x = startX + idx * (iconSize + 2);
        let ratio = e.duration > 0 ? e.duration / e.maxDuration : 0;
        const iconStr = icons[e.type] || '';
        
        ctx.globalAlpha = 0.3;
        ctx.fillText(iconStr, x, y);
        
        if (e.duration > 0) {
            ctx.globalAlpha = 1.0;
            ctx.save(); ctx.beginPath();
            let h = iconSize * ratio;
            ctx.rect(x - iconSize, (y + iconSize/2) - h, iconSize*2, h);
            ctx.clip();
            ctx.fillText(iconStr, x, y);
            ctx.restore();
        }
        ctx.globalAlpha = 1.0;
    });
}

// 状態異常エフェクトの描画関数
function drawStatusEffects(entity, ctx) {
    if (entity.state === 'dead' || !entity.effects) return;
    let isFrozen = entity.effects.some(e => e.type === 'ice' && e.duration > 0);
    let isBurned = entity.effects.some(e => e.type === 'fire' && e.duration > 0);
    let isShocked = entity.effects.some(e => e.type === 'lightning' && e.duration > 0);

    if (isFrozen) { 
        ctx.fillStyle = 'rgba(0, 255, 255, 0.4)'; 
        ctx.fillRect(entity.x - entity.radius, entity.y - entity.radius, entity.radius*2, entity.radius*2); 
    }
    if (isBurned) { 
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; 
        ctx.beginPath(); ctx.arc(entity.x, entity.y, entity.radius + 5, 0, Math.PI*2); ctx.fill(); 
    }
    if (isShocked) { 
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; ctx.lineWidth = 2; 
        ctx.beginPath(); ctx.moveTo(entity.x - entity.radius, entity.y - entity.radius); 
        ctx.lineTo(entity.x + entity.radius, entity.y + entity.radius); ctx.stroke(); 
    }
    
    drawStatusIcons(entity, ctx);
}

function draw() {
    if(!window.ctx) return;
    const ctx = window.ctx;
    ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
    ctx.save(); ctx.translate(-window.camera.x, -window.camera.y);

    ctx.strokeStyle = '#333'; ctx.lineWidth = 1; const gridSize = 50;
    const startX = Math.max(0, Math.floor(window.camera.x / gridSize) * gridSize); const startY = Math.max(0, Math.floor(window.camera.y / gridSize) * gridSize);
    const endX = Math.min(window.world.width, startX + window.camera.width + gridSize); const endY = Math.min(window.world.height, startY + window.camera.height + gridSize);
    ctx.beginPath();
    for(let x = startX; x <= endX; x += gridSize) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
    for(let y = startY; y <= endY; y += gridSize) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
    ctx.stroke();

    ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, window.world.width, window.world.height);

    for (const obs of window.obstacles) {
        ctx.fillStyle = obs.color; ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#114a11'; ctx.lineWidth = 2; ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }

    for (const item of window.droppedItems) {
        ctx.globalAlpha = (item.ownerId !== null && item.ownerId !== window.player.id) ? 0.3 : 1.0;
        ctx.fillStyle = (item.ownerId !== null && item.ownerId !== window.player.id) ? '#888888' : item.color;
        
        if (item.type === 'potion') {
            ctx.beginPath(); ctx.moveTo(item.x, item.y - item.radius); ctx.lineTo(item.x + item.radius, item.y); ctx.lineTo(item.x, item.y + item.radius); ctx.lineTo(item.x - item.radius, item.y); ctx.closePath(); ctx.fill();
        } else {
            ctx.beginPath(); ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1.0; 
        
        if (window.player.targetItem && window.player.targetItem.uid === item.uid) {
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
            ctx.strokeRect(item.x - item.radius - 2, item.y - item.radius - 2, item.radius * 2 + 4, item.radius * 2 + 4);
        }
    }

    for (const enemy of window.enemies) {
        if (enemy.state === 'dead') continue; 
        
        let eIsFrozen = enemy.effects && enemy.effects.some(ef => ef.type === 'ice' && ef.duration > 0);
        
        if (window.player.targetEnemy === enemy) {
            ctx.beginPath(); ctx.ellipse(enemy.x, enemy.y + enemy.radius, enemy.radius * 1.5, enemy.radius * 0.5, 0, 0, Math.PI * 2);
            ctx.strokeStyle = 'red'; ctx.lineWidth = 2; ctx.stroke();
            if (window.player.isAutoAttacking && !eIsFrozen) { ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; ctx.fill(); }
        }

        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        
        drawStatusEffects(enemy, ctx); 
        
        if (enemy.state === 'chase' || enemy.state === 'attack') {
            ctx.fillStyle = 'red'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('!', enemy.x - 5, enemy.y - enemy.radius - 20);
        }

        const hpWidth = 40; const hpHeight = 5; const hpRatio = enemy.hp / enemy.maxHp;
        ctx.fillStyle = 'black'; ctx.fillRect(enemy.x - hpWidth / 2, enemy.y - enemy.radius - 15, hpWidth, hpHeight);
        ctx.fillStyle = 'red'; ctx.fillRect(enemy.x - hpWidth / 2, enemy.y - enemy.radius - 15, hpWidth * hpRatio, hpHeight);
    }

    let pIsFrozen = window.player.effects.some(e => e.type === 'ice' && e.duration > 0);

    if (window.playerPath.length > 0 && !pIsFrozen) {
        ctx.beginPath(); ctx.moveTo(window.player.x, window.player.y);
        for (const wp of window.playerPath) ctx.lineTo(wp.x, wp.y);
        if (window.player.targetItem) { ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)'; } 
        else { ctx.strokeStyle = window.player.isAutoAttacking ? 'rgba(255, 100, 100, 0.4)' : 'rgba(0, 255, 255, 0.4)'; }
        ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        const lastWp = window.playerPath[window.playerPath.length - 1];
        ctx.beginPath(); ctx.arc(lastWp.x, lastWp.y, 5, 0, Math.PI * 2); 
        if (window.player.targetItem) ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
        else ctx.fillStyle = window.player.isAutoAttacking ? 'rgba(255, 100, 100, 0.6)' : 'rgba(0, 255, 255, 0.6)'; 
        ctx.fill();
    } else if (input.isDown && !pIsFrozen) {
        ctx.beginPath(); ctx.arc(window.player.targetX, window.player.targetY, 5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.fill();
    }

    ctx.beginPath(); ctx.arc(window.player.x, window.player.y, window.player.radius, 0, Math.PI * 2);
    ctx.fillStyle = (window.player.attackCooldown > window.player.attackRate - 0.1 && window.player.targetEnemy && window.player.isAutoAttacking && !pIsFrozen) ? '#ffffff' : window.player.color;
    ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    drawStatusEffects(window.player, ctx); 

    const phpWidth = 40; const phpHeight = 6; const phpRatio = window.player.hp / window.player.maxHp;
    ctx.fillStyle = 'black'; ctx.fillRect(window.player.x - phpWidth / 2, window.player.y - window.player.radius - 15, phpWidth, phpHeight);
    ctx.fillStyle = '#00ff00'; ctx.fillRect(window.player.x - phpWidth / 2, window.player.y - window.player.radius - 15, phpWidth * phpRatio, phpHeight);

    ctx.restore();
}

// ==========================================
// メインループの起動
// ==========================================
let lastTime = 0;
window.gameLoop = function(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;
    update(dt, timestamp); 
    draw(); 
    requestAnimationFrame(window.gameLoop);
};

// 初期化時の実行処理
if (typeof window.addLog === 'function') {
    window.addLog("<span class='color-sys'>システム: システムを起動しました。</span>", 'sys'); 
}
if (typeof window.updatePlayerStats === 'function') window.updatePlayerStats();
if (typeof window.updateWidgetUI === 'function') window.updateWidgetUI();