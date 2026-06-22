// =========================================================
// entities.js
// プレイヤー、敵、アイテムの定義と状態更新（AIロジック含む）
// =========================================================

// --- プレイヤーの定義 ---
window.player = {
    id: 'p1', 
    x: window.world.width / 2, y: window.world.height / 2, 
    targetX: window.world.width / 2, targetY: window.world.height / 2,
    speed: 240, radius: 15, color: '#00ffff',
    
    baseHp: 100, maxHp: 100, hp: 100,
    baseMp: 50, maxMp: 50, mp: 50,
    baseAtk: 10, atk: 10,
    baseMatk: 5, matk: 5,
    armor: 0,
    
    stats: { str: 0, int: 0, vit: 0 },
    level: 1, exp: 0, nextExp: 100, statPoints: 0,
    
    targetEnemy: null, isAutoAttacking: false, targetItem: null, 
    
    baseAttackRange: 50, attackRange: 50, 
    attackRate: 0.5, attackCooldown: 0, pickupRange: 20,
    
    gold: 0, 
    equipped: { weapon: null, armor: null, accessory: null },
    
    effects: [], effectCounts: {}, 
    
    inventory: {
        equip: { capacity: 20, items: [] }, consume: { capacity: 20, items: [] },
        skill: { capacity: 20, items: [] }, etc: { capacity: 20, items: [] }, important: { capacity: 20, items: [] }
    }
};

const initWeapons = ['sword_fire', 'sword_ice', 'sword_lightning', 'bow_wind'];
if (window.ITEM_DB) {
    initWeapons.forEach(id => { 
        if (window.ITEM_DB[id]) {
            let w = JSON.parse(JSON.stringify(window.ITEM_DB[id])); 
            w.count = 1; 
            window.player.inventory.equip.items.push(w); 
        }
    });
}

window.playerPath = [];

// --- プレイヤーステータス再計算 ---
window.updatePlayerStats = function() {
    window.player.maxHp = window.player.baseHp + (window.player.stats.vit * 10);
    window.player.maxMp = window.player.baseMp + (window.player.stats.int * 5);
    
    if (window.player.equipped.armor && window.player.equipped.armor.stats && window.player.equipped.armor.stats.hp) {
        window.player.maxHp += window.player.equipped.armor.stats.hp;
    }
    
    if (window.player.hp > window.player.maxHp) window.player.hp = window.player.maxHp;
    if (window.player.mp > window.player.maxMp) window.player.mp = window.player.maxMp;

    window.player.atk = window.player.baseAtk + (window.player.stats.str * 2);
    window.player.matk = window.player.baseMatk + (window.player.stats.int * 2);
    
    if (window.player.equipped.weapon && window.player.equipped.weapon.stats && window.player.equipped.weapon.stats.atk) {
        window.player.atk += window.player.equipped.weapon.stats.atk;
    }

    window.player.attackRange = window.player.baseAttackRange;
    if (window.player.equipped.weapon && window.player.equipped.weapon.stats && window.player.equipped.weapon.stats.attackRange) {
        window.player.attackRange = window.player.equipped.weapon.stats.attackRange;
    }

    window.player.armor = 0;
    if (window.player.equipped.armor && window.player.equipped.armor.stats && window.player.equipped.armor.stats.armor) {
        window.player.armor += window.player.equipped.armor.stats.armor;
    }

    if (typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
    const statusWindow = document.getElementById('statusWindow');
    if (statusWindow && statusWindow.style.display === 'flex' && typeof window.updateStatusUI === 'function') {
        window.updateStatusUI();
    }
};

window.addExp = function(amount) {
    window.player.exp += amount; 
    let leveledUp = false;
    while (window.player.exp >= window.player.nextExp) {
        window.player.exp -= window.player.nextExp; 
        window.player.level++; 
        window.player.nextExp = window.player.level * 100;
        window.player.statPoints += 5; 
        leveledUp = true;
        
        if(typeof window.addLog === 'function') {
            window.addLog(`<span class='color-sys'>レベルが <span class='color-player'>${window.player.level}</span> に上がった！ステータスポイントを獲得！</span>`, 'exp');
        }
    }
    if (leveledUp) { 
        window.updatePlayerStats(); 
        window.player.hp = window.player.maxHp; 
        window.player.mp = window.player.maxMp; 
    }
    if (typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
    const statusWindow = document.getElementById('statusWindow');
    if (statusWindow && statusWindow.style.display === 'flex' && typeof window.updateStatusUI === 'function') {
        window.updateStatusUI();
    }
};

window.addItemToInventory = function(itemData) {
    const tab = window.player.inventory[itemData.type];
    if (!tab) return false;
    const addCount = itemData.count || 1;
    if (itemData.maxStack > 1) {
        // ★修正: id だけでなく rarity(レアリティ) も一致するかを厳密にチェック
        let existingItem = tab.items.find(i => i.id === itemData.id && i.rarity === itemData.rarity && i.count < i.maxStack);
        if (existingItem) {
            if (existingItem.count + addCount <= existingItem.maxStack) { existingItem.count += addCount; return true; }
        }
    }
    if (tab.items.length < tab.capacity) {
        let newItem = JSON.parse(JSON.stringify(itemData));
        newItem.count = addCount; 
        tab.items.push(newItem);
        return true;
    }
    return false; 
};

window.checkPlayerDeath = function() {
    if (window.player.hp <= 0) {
        if(typeof window.addLog === 'function' && typeof window.getEntityName === 'function') {
            window.addLog(`<span class='color-sys'>${window.getEntityName(window.player)} は力尽きた...</span>`, 'sys');
        }

        window.player.x = window.world.width / 2; window.player.y = window.world.height / 2;
        window.player.targetX = window.player.x; window.player.targetY = window.player.y;
        window.player.hp = window.player.maxHp;
        window.player.targetEnemy = null; window.player.isAutoAttacking = false; window.player.targetItem = null;
        window.playerPath = [];
        window.player.effects = []; 
        window.player.effectCounts = {}; 
        
        for(let enemy of window.enemies) {
            enemy.hateTable = {};
            enemy.damageTable = {};
        }
        if (typeof window.updateWidgetUI === 'function') window.updateWidgetUI();
    }
};

window.transElement = { 'fire':'炎上', 'ice':'凍結', 'lightning':'感電', 'wind':'風圧', 'earth':'地' };

window.applyElementEffect = function(attacker, target, element, params = {}, skillId = 'basic') {
    if (!element) return;
    
    if (target.id === 'p1') { 
        if (target.equipped.armor && target.equipped.armor.resists && target.equipped.armor.resists.includes(element)) return; 
    } else { 
        if (target.element && target.element === element) return; 
        if (target.resists && target.resists.includes(element)) return; 
    }

    const effectId = element + '_' + attacker.id + '_' + skillId;
    let existing = target.effects.find(e => e.id === effectId);

    if (existing) {
        if (existing.immune > 0 || existing.duration > 0) return; 
        target.effects = target.effects.filter(e => e.id !== effectId);
    }

    let duration = params.duration || 0;
    let dmg = 0;
    let distance = params.distance || 30; 
    const atkVal = attacker.atk !== undefined ? attacker.atk : attacker.attackDamage;

    if (element === 'fire') { duration = duration || 3.0; dmg = atkVal * (params.dmgRatio || 0.2); }
    else if (element === 'ice') { duration = duration || 2.0; }
    else if (element === 'lightning') { duration = duration || 3.0; }
    else if (element === 'wind') { duration = duration || 0.5; }
    else if (element === 'earth') { duration = duration || 0; }

    target.effectCounts[effectId] = (target.effectCounts[effectId] || 0) + 1;
    let immuneTime = duration * target.effectCounts[effectId];

    if(typeof window.addLog === 'function' && typeof window.getEntityName === 'function') {
        window.addLog(`${window.getEntityName(attacker)} は ${window.getEntityName(target)} に <span class='color-status'>【${window.transElement[element]}】</span> を与えた！`, 'damage');
    }

    if (element === 'ice' || element === 'lightning') {
        let sameTypeExisting = target.effects.find(e => e.type === element && e.duration > 0);
        if (sameTypeExisting) {
            if (duration > sameTypeExisting.duration) {
                sameTypeExisting.duration = duration; 
                sameTypeExisting.maxDuration = duration; 
                sameTypeExisting.id = effectId;
                sameTypeExisting.maxImmune = immuneTime;
            }
            return; 
        }
    }

    if (element === 'wind') {
        const dx = target.x - attacker.x; const dy = target.y - attacker.y; const dist = Math.hypot(dx, dy) || 1;
        target.x += (dx / dist) * distance; target.y += (dy / dist) * distance;
        target.x = Math.max(target.radius, Math.min(target.x, window.world.width - target.radius));
        target.y = Math.max(target.radius, Math.min(target.y, window.world.height - target.radius));
        if (target.id !== 'p1') { target.path = []; target.targetX = target.x; target.targetY = target.y; }
    }

    target.effects.push({ 
        id: effectId, type: element, duration: duration, maxDuration: duration, 
        immune: 0, maxImmune: immuneTime, tick: 1.0, dmg: dmg 
    });
};

window.updateEffects = function(entity, dt) {
    if (entity.state === 'dead' || entity.hp <= 0) return;
    
    for (let i = entity.effects.length - 1; i >= 0; i--) {
        let e = entity.effects[i];
        if (e.duration > 0) {
            e.duration -= dt;
            if (e.type === 'fire') {
                e.tick -= dt;
                if (e.tick <= 0) {
                    e.tick += 1.0;
                    entity.hp -= Math.max(1, e.dmg);
                    if (entity.id === 'p1') {
                        if (typeof window.updateWidgetUI === 'function') window.updateWidgetUI(); 
                        window.checkPlayerDeath();
                        const statusWindow = document.getElementById('statusWindow');
                        if (statusWindow && statusWindow.style.display === 'flex' && typeof window.updateStatusUI === 'function') {
                            window.updateStatusUI();
                        }
                    }
                }
            }
            if (e.duration <= 0) { e.duration = 0; e.immune = e.maxImmune; }
        } else if (e.immune > 0) {
            e.immune -= dt;
            if (e.immune <= 0) entity.effects.splice(i, 1);
        }
    }
};

window.ENEMY_DB = window.ENEMY_DB || {}; 

window.spawnEnemy = function(enemyId, level, spawnX, spawnY) {
    if (!window.ENEMY_DB || !window.ENEMY_DB[enemyId]) return null;
    
    const base = window.ENEMY_DB[enemyId];
    const lvl = level || 1;
    
    const statMultiplier = 1 + (lvl - 1) * 0.2;
    const hp = Math.floor((base.baseHp || 50) * statMultiplier);
    const atk = Math.floor((base.baseAtk || 5) * statMultiplier);
    const exp = Math.floor((base.baseExp || 20) * statMultiplier);

    const radius = base.radius || 15;
    const initialPos = window.getSafeRandomPosition(spawnX, spawnY, 50, radius, base.isFlying);

    let imgObj = null;
    if (base.imageUrl) {
        imgObj = new Image();
        const baseURL = (window.MapManager && window.MapManager.baseURL) ? window.MapManager.baseURL : 'https://namnam2727.github.io/MMO/';
        imgObj.src = baseURL + base.imageUrl;
    }

    return {
        uid: Date.now() + Math.random(),
        id: enemyId,
        name: base.name || 'Unknown',
        level: lvl,
        spawnX: spawnX, spawnY: spawnY,
        x: initialPos.x, y: initialPos.y, targetX: initialPos.x, targetY: initialPos.y,
        path: [], radius: radius, color: base.color || '#ff0000',
        
        image: imgObj, 
        
        hp: hp, maxHp: hp,
        armor: base.baseArmor || 0, 
        
        speed: base.speed !== undefined ? base.speed : 30,
        isFlying: base.isFlying || false, 
        baseRespawnTime: base.respawnTime !== undefined ? base.respawnTime : 10, 
        
        type: base.type || 'passive', state: 'idle', 
        roamRadius: base.roamRadius || 250, sightRadius: base.sightRadius || 200, 
        attackRange: base.attackRange || 40, attackDamage: atk, 
        attackRate: base.attackRate || 1.5, attackCooldown: 0,
        
        hasBeenAttacked: false, timers: { roam: Math.random() * 3, respawn: 0, pathCalc: 0 },
        hateTable: {}, damageTable: {}, 
        expReward: exp,
        
        element: base.element || null, elementParams: base.elementParams || {}, resists: base.resists || [], 
        effects: [], effectCounts: {},
        dropTable: base.dropTable || [],
        
        customUpdate: base.customUpdate || null
    };
};

window.enemies = [];

window.updateEnemies = function(dt) {
    for (let i = 0; i < window.enemies.length; i++) {
        let e = window.enemies[i];

        if (e.hp <= 0 && e.state !== 'dead') {
            e.state = 'dead'; e.timers.respawn = e.baseRespawnTime; 
            
            let totalDamage = 0; let ownerId = null; let topDamage = 0;
            for (let id in e.damageTable) { 
                totalDamage += e.damageTable[id]; 
                if (e.damageTable[id] > topDamage) { topDamage = e.damageTable[id]; ownerId = id; } 
            }
            
            if (e.damageTable[window.player.id]) { 
                const myShare = e.damageTable[window.player.id] / totalDamage; 
                const expGain = Math.ceil(e.expReward * myShare);
                window.addExp(expGain); 
                
                if(typeof window.addLog === 'function' && typeof window.getEntityName === 'function') {
                    window.addLog(`${window.getEntityName(e)} を倒し、<span class='color-exp'>${expGain} EXP</span> を獲得した！`, 'exp');
                }
            }
            
            if (e.dropTable && e.dropTable.length > 0 && window.ITEM_DB) {
                e.dropTable.forEach(drop => {
                    if (Math.random() <= drop.chance) {
                        const baseItem = window.ITEM_DB[drop.id];
                        if (baseItem) {
                            window.droppedItems.push({ 
                                uid: Date.now() + Math.random(), id: baseItem.id, type: baseItem.type, equipSlot: baseItem.equipSlot, 
                                name: baseItem.name, rarity: baseItem.rarity, color: baseItem.color, desc: baseItem.desc, 
                                stats: baseItem.stats, resists: baseItem.resists, element: baseItem.element, elementParams: baseItem.elementParams, 
                                restore: baseItem.restore, maxStack: baseItem.maxStack, count: 1, 
                                x: e.x, y: e.y, radius: 8, ownerId: ownerId, lifeTime: 0 
                            });
                        }
                    }
                });
            }

            if (window.player.targetEnemy === e) { window.player.targetEnemy = null; window.player.isAutoAttacking = false; }
            continue; 
        }

        if (e.state === 'dead') {
            e.timers.respawn -= dt;
            if (e.timers.respawn <= 0) {
                const safePos = window.getSafeRandomPosition(e.spawnX, e.spawnY, 50, e.radius, e.isFlying);
                e.x = safePos.x; e.y = safePos.y; e.targetX = e.x; e.targetY = e.y; 
                e.hp = e.maxHp; e.state = 'idle'; e.hasBeenAttacked = false; 
                e.hateTable = {}; e.damageTable = {}; e.path = []; e.effects = []; e.effectCounts = {};
                if (window.ENEMY_DB && window.ENEMY_DB[e.id]) {
                    e.armor = window.ENEMY_DB[e.id].baseArmor || 0;
                }
            }
            continue; 
        }

        window.updateEffects(e, dt);
        let isFrozen = e.effects.some(ef => ef.type === 'ice' && ef.duration > 0);
        let isShocked = e.effects.some(ef => ef.type === 'lightning' && ef.duration > 0);
        
        let isMovementBlocked = isFrozen || e.attackCooldown > 0;

        if (e.attackCooldown > 0) e.attackCooldown -= dt;
        
        let highestHate = 0; let targetId = null;
        for (let id in e.hateTable) { if (e.hateTable[id] > highestHate) { highestHate = e.hateTable[id]; targetId = id; } }
        let currentTarget = null; if (targetId === window.player.id) currentTarget = window.player;

        if (currentTarget && !isFrozen) {
            const distToTarget = Math.hypot(currentTarget.x - e.x, currentTarget.y - e.y);
            if (!e.hasBeenAttacked && distToTarget > e.sightRadius * 2) { 
                delete e.hateTable[targetId]; currentTarget = null; e.state = 'return'; e.path = []; 
                const returnTarget = window.getSafeRandomPosition(e.spawnX, e.spawnY, e.roamRadius * 0.5, e.radius, e.isFlying); 
                e.targetX = returnTarget.x; e.targetY = returnTarget.y; 
            }
        }
        if (!currentTarget && e.type === 'active') { 
            const distToPlayer = Math.hypot(window.player.x - e.x, window.player.y - e.y); 
            if (distToPlayer <= e.sightRadius && window.hasLineOfSight(e.x, e.y, window.player.x, window.player.y)) { 
                e.hateTable[window.player.id] = 10; currentTarget = window.player; 
            } 
        }

        if (currentTarget) {
            const distToTarget = Math.hypot(currentTarget.x - e.x, currentTarget.y - e.y);
            if (distToTarget <= e.attackRange) {
                e.state = 'attack'; e.path = [];
                if (e.attackCooldown <= 0 && !isFrozen) { 
                    const actualDamage = Math.max(1, e.attackDamage * (100 / (100 + window.player.armor))); 
                    currentTarget.hp -= actualDamage; 
                    
                    if(typeof window.addLog === 'function' && typeof window.getEntityName === 'function') {
                        window.addLog(`${window.getEntityName(e)} は ${window.getEntityName(currentTarget)} に <span class='color-damage'>${Math.floor(actualDamage)}</span> ダメージを与えた！`, 'damage');
                    }
                    
                    let cdRate = e.attackRate; if (isShocked) cdRate *= 1.5; 
                    e.attackCooldown = cdRate; 
                    isMovementBlocked = true;
                    
                    if (e.element) window.applyElementEffect(e, currentTarget, e.element, e.elementParams);
                    window.checkPlayerDeath(); 
                    if (typeof window.updateWidgetUI === 'function') window.updateWidgetUI(); 
                }
            } else {
                e.state = 'chase'; e.timers.pathCalc -= dt;
                if (e.timers.pathCalc <= 0) { 
                    if (typeof window.findPath === 'function') {
                        e.path = window.findPath(e.x, e.y, currentTarget.x, currentTarget.y); 
                    }
                    e.timers.pathCalc = 0.5; 
                }
                if (!isMovementBlocked && e.path && e.path.length > 0) { 
                    const wp = e.path[0]; const dx = wp.x - e.x; const dy = wp.y - e.y; const distToWp = Math.hypot(dx, dy); 
                    let currentSpeed = e.speed; if (isShocked) currentSpeed *= 0.5;
                    const moveDist = currentSpeed * dt; 
                    if (distToWp <= moveDist) { e.x = wp.x; e.y = wp.y; e.path.shift(); } 
                    else { const angle = Math.atan2(dy, dx); e.x += Math.cos(angle) * moveDist; e.y += Math.sin(angle) * moveDist; } 
                }
            }
        } else {
            if (e.state === 'chase' || e.state === 'attack') { e.state = 'idle'; e.path = []; }
            if (e.state === 'return') { 
                const dx = e.targetX - e.x; const dy = e.targetY - e.y; const dist = Math.hypot(dx, dy); 
                let currentSpeed = e.speed; if (isShocked) currentSpeed *= 0.5; const moveDist = currentSpeed * dt; 
                if (!isMovementBlocked) {
                    if (dist > moveDist) { const angle = Math.atan2(dy, dx); e.x += Math.cos(angle) * moveDist; e.y += Math.sin(angle) * moveDist; } 
                    else { e.x = e.targetX; e.y = e.targetY; e.state = 'idle'; }
                }
            } else if (e.type !== 'static') {
                e.timers.roam -= dt;
                if (e.timers.roam <= 0) { 
                    e.timers.roam = 3 + Math.random() * 2; 
                    let roamTarget = window.getSafeRandomPosition(e.x, e.y, 100, e.radius, e.isFlying); 
                    const distFromSpawn = Math.hypot(roamTarget.x - e.spawnX, roamTarget.y - e.spawnY); 
                    if (distFromSpawn > e.roamRadius) { roamTarget = window.getSafeRandomPosition(e.spawnX, e.spawnY, e.roamRadius * 0.5, e.radius, e.isFlying); } 
                    e.targetX = roamTarget.x; e.targetY = roamTarget.y; e.state = 'roam'; 
                }
                if (e.state === 'roam' && !isMovementBlocked) { 
                    const dx = e.targetX - e.x; const dy = e.targetY - e.y; const dist = Math.hypot(dx, dy); 
                    let currentSpeed = e.speed * 0.6; if (isShocked) currentSpeed *= 0.5; const moveDist = currentSpeed * dt; 
                    if (dist > moveDist) { const angle = Math.atan2(dy, dx); e.x += Math.cos(angle) * moveDist; e.y += Math.sin(angle) * moveDist; } 
                    else { e.x = e.targetX; e.y = e.targetY; e.state = 'idle'; } 
                }
            }
        }
        
        if (!e.isFlying) { 
            for (const obs of window.obstacles) { 
                const pushBack = window.checkCollision(e, obs); 
                if (pushBack) { 
                    e.x += pushBack.x; e.y += pushBack.y; 
                    if (e.state === 'roam' || e.state === 'return') { e.targetX = e.x; e.targetY = e.y; e.state = 'idle'; } 
                } 
            } 
        }

        if (e.customUpdate && typeof e.customUpdate === 'function') {
            e.customUpdate(e, dt, window.player);
        }
    }
};
