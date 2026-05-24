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
    if(e.target !== window && e.target !== document.body && e.target !== window.canvas) return;
    input.isDown = true; updateInputPos(e); pointerDownTime = performance.now();
    window.playerPath = []; window.player.isAutoAttacking = false; window.player.targetItem = null; 
});
window.addEventListener('pointermove', (e) => { if (input.isDown) updateInputPos(e); });

function handlePointerUp(e) {
    if (input.isDown) {
        const currentTime = performance.now();
        if (currentTime - pointerDownTime < 200) {
            const targetX = input.screenX + window.camera.x; const targetY = input.screenY + window.camera.y;
            
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
                window.player.targetEnemy = clickedEnemy; window.player.isAutoAttacking = true;
                window.player.targetItem = null;
                window.playerPath = window.findPath(window.player.x, window.player.y, clickedEnemy.x, clickedEnemy.y, window.player.radius);
            } else if (clickedItem) {
                if (clickedItem.ownerId === null || clickedItem.ownerId === window.player.id) {
                    window.player.targetEnemy = null; window.player.isAutoAttacking = false;
                    window.player.targetItem = clickedItem;
                    window.playerPath = window.findPath(window.player.x, window.player.y, clickedItem.x, clickedItem.y, window.player.radius);
                } else {
                    window.player.isAutoAttacking = false; window.player.targetItem = null;
                    window.playerPath = window.findPath(window.player.x, window.player.y, targetX, targetY, window.player.radius);
                }
            } else {
                window.player.isAutoAttacking = false; window.player.targetItem = null;
                window.playerPath = window.findPath(window.player.x, window.player.y, targetX, targetY, window.player.radius);
            }
        }
        input.isDown = false;
    }
}
window.addEventListener('pointerup', handlePointerUp); 
window.addEventListener('pointercancel', handlePointerUp); 
window.addEventListener('pointerout', handlePointerUp);

// --- UIボタンイベント ---
setTimeout(() => { // DOM読み込み待ちの簡易対策
    const attackBtn = document.getElementById('attackBtn');
    if(attackBtn) {
        attackBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); 
            window.player.targetItem = null; 
            if (window.player.targetEnemy && window.player.targetEnemy.state !== 'dead') {
                window.player.isAutoAttacking = true;
                window.playerPath = window.findPath(window.player.x, window.player.y, window.player.targetEnemy.x, window.player.targetEnemy.y, window.player.radius);
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
        attackBtn.addEventListener('pointerup', (e) => e.stopPropagation()); 
        attackBtn.addEventListener('pointercancel', (e) => e.stopPropagation());
    }

    const lootBtn = document.getElementById('lootBtn');
    if(lootBtn){
        lootBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            window.player.targetEnemy = null; window.player.isAutoAttacking = false;
            let closestItem = null; let minDist = Infinity;
            for (const item of window.droppedItems) {
                if (item.ownerId === null || item.ownerId === window.player.id) {
                    const dist = Math.hypot(item.x - window.player.x, item.y - window.player.y);
                    if (dist < minDist) { minDist = dist; closestItem = item; }
                }
            }
            if (closestItem) {
                window.player.targetItem = closestItem;
                window.playerPath = window.findPath(window.player.x, window.player.y, closestItem.x, closestItem.y, window.player.radius);
            }
        });
        lootBtn.addEventListener('pointerup', (e) => e.stopPropagation()); 
        lootBtn.addEventListener('pointercancel', (e) => e.stopPropagation());
    }
}, 500); // UIボタンのバインドは0.5秒遅延（確実なDOM描画後）


// ==========================================
// 更新処理 (Update)
// ==========================================
function update(dt, timestamp) {
    const moveDistance = window.player.speed * dt;
    if (window.player.attackCooldown > 0) window.player.attackCooldown -= dt;

    window.updateEnemies(dt);

    for (const item of window.droppedItems) {
        item.lifeTime += dt;
        if (item.ownerId !== null && item.lifeTime >= window.FREE_LOOT_TIME) {
            item.ownerId = null; 
        }
    }

    let initialDistanceToWaypoint = 0;
    if (window.playerPath.length > 0) initialDistanceToWaypoint = Math.hypot(window.playerPath[0].x - window.player.x, window.playerPath[0].y - window.player.y);

    let shouldMove = true;

    // 攻撃処理
    if (window.player.targetEnemy && window.player.targetEnemy.state !== 'dead' && window.player.isAutoAttacking) {
        const distToEnemy = Math.hypot(window.player.targetEnemy.x - window.player.x, window.player.targetEnemy.y - window.player.y);
        if (distToEnemy <= window.player.attackRange) {
            shouldMove = false; window.playerPath = []; 
            if (window.player.attackCooldown <= 0) {
                const actualDamage = Math.min(window.player.targetEnemy.hp, window.player.attackDamage);
                window.player.targetEnemy.hp -= actualDamage;
                window.player.targetEnemy.hasBeenAttacked = true;
                window.player.targetEnemy.hateTable[window.player.id] = (window.player.targetEnemy.hateTable[window.player.id] || 0) + window.player.attackDamage;
                window.player.targetEnemy.damageTable[window.player.id] = (window.player.targetEnemy.damageTable[window.player.id] || 0) + actualDamage;
                window.player.attackCooldown = window.player.attackRate; 
            }
        } else {
            if (window.playerPath.length === 0) {
                window.playerPath = window.findPath(window.player.x, window.player.y, window.player.targetEnemy.x, window.player.targetEnemy.y, window.player.radius);
            }
        }
    }
    
    // アイテム回収処理
    if (window.player.targetItem) {
        const itemIndex = window.droppedItems.findIndex(i => i.id === window.player.targetItem.id);
        if (itemIndex !== -1) {
            const item = window.droppedItems[itemIndex];
            if (item.ownerId === null || item.ownerId === window.player.id) {
                const distToItem = Math.hypot(item.x - window.player.x, item.y - window.player.y);
                if (distToItem <= window.player.pickupRange) {
                    shouldMove = false; window.playerPath = [];
                    if (item.type === 'potion') window.player.hp = Math.min(window.player.maxHp, window.player.hp + 30); 
                    window.droppedItems.splice(itemIndex, 1);
                    window.player.targetItem = null;
                } else {
                    if (window.playerPath.length === 0) window.playerPath = window.findPath(window.player.x, window.player.y, item.x, item.y, window.player.radius);
                }
            } else {
                window.player.targetItem = null; window.playerPath = [];
            }
        } else {
            window.player.targetItem = null; window.playerPath = [];
        }
    }

    // 座標移動
    if (input.isDown) {
        window.player.targetX = input.screenX + window.camera.x; window.player.targetY = input.screenY + window.camera.y;
        const dx = window.player.targetX - window.player.x; const dy = window.player.targetY - window.player.y; const distance = Math.hypot(dx, dy);
        if (distance > moveDistance) {
            const angle = Math.atan2(dy, dx); window.player.x += Math.cos(angle) * moveDistance; window.player.y += Math.sin(angle) * moveDistance;
        }
    } else if (shouldMove && window.playerPath.length > 0) {
        const wp = window.playerPath[0];
        if (initialDistanceToWaypoint <= moveDistance) {
            window.player.x = wp.x; window.player.y = wp.y; window.playerPath.shift();
        } else {
            const angle = Math.atan2(wp.y - window.player.y, wp.x - window.player.x);
            window.player.x += Math.cos(angle) * moveDistance; window.player.y += Math.sin(angle) * moveDistance;
        }
    }

    // 境界制限・衝突
    window.player.x = Math.max(window.player.radius, Math.min(window.player.x, window.world.width - window.player.radius));
    window.player.y = Math.max(window.player.radius, Math.min(window.player.y, window.world.height - window.player.radius));

    let isCollidingWithWall = false;
    for (const obs of window.obstacles) {
        const pushBack = window.checkCollision(window.player, obs);
        if (pushBack) {
            window.player.x += pushBack.x; window.player.y += pushBack.y; isCollidingWithWall = true;
        }
    }

    if (!input.isDown && window.playerPath.length > 0 && isCollidingWithWall) {
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
        
        if (window.player.targetItem && window.player.targetItem.id === item.id) {
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
            ctx.strokeRect(item.x - item.radius - 2, item.y - item.radius - 2, item.radius * 2 + 4, item.radius * 2 + 4);
        }
    }

    for (const enemy of window.enemies) {
        if (enemy.state === 'dead') continue; 

        if (window.player.targetEnemy === enemy) {
            ctx.beginPath(); ctx.ellipse(enemy.x, enemy.y + enemy.radius, enemy.radius * 1.5, enemy.radius * 0.5, 0, 0, Math.PI * 2);
            ctx.strokeStyle = 'red'; ctx.lineWidth = 2; ctx.stroke();
            if (window.player.isAutoAttacking) { ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; ctx.fill(); }
        }

        ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        
        if (enemy.state === 'chase' || enemy.state === 'attack') {
            ctx.fillStyle = 'red'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('!', enemy.x - 5, enemy.y - enemy.radius - 20);
        }

        const hpWidth = 40; const hpHeight = 5; const hpRatio = enemy.hp / enemy.maxHp;
        ctx.fillStyle = 'black'; ctx.fillRect(enemy.x - hpWidth / 2, enemy.y - enemy.radius - 15, hpWidth, hpHeight);
        ctx.fillStyle = 'red'; ctx.fillRect(enemy.x - hpWidth / 2, enemy.y - enemy.radius - 15, hpWidth * hpRatio, hpHeight);
    }

    if (window.playerPath.length > 0) {
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
    } else if (input.isDown) {
        ctx.beginPath(); ctx.arc(window.player.targetX, window.player.targetY, 5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.fill();
    }

    ctx.beginPath(); ctx.arc(window.player.x, window.player.y, window.player.radius, 0, Math.PI * 2);
    ctx.fillStyle = (window.player.attackCooldown > window.player.attackRate - 0.1 && window.player.targetEnemy && window.player.isAutoAttacking) ? '#ffffff' : window.player.color;
    ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    const phpWidth = 40; const phpHeight = 6; const phpRatio = window.player.hp / window.player.maxHp;
    ctx.fillStyle = 'black'; ctx.fillRect(window.player.x - phpWidth / 2, window.player.y - window.player.radius - 15, phpWidth, phpHeight);
    ctx.fillStyle = '#00ff00'; ctx.fillRect(window.player.x - phpWidth / 2, window.player.y - window.player.radius - 15, phpWidth * phpRatio, phpHeight);

    ctx.restore();
}

// ==========================================
// メインループの起動 (Loader側から呼ばれる想定)
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