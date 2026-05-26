// =========================================================
// entities.js
// プレイヤー、敵、アイテムの定義と状態更新（AIロジック含む）
// =========================================================

// --- プレイヤーの定義 ---
window.player = {
    id: 'p1', 
    x: window.world.width / 2, y: window.world.height / 2, 
    targetX: window.world.width / 2, targetY: window.world.height / 2,
    speed: 240, radius: 15, color: '#00ffff', hp: 100, maxHp: 100,
    targetEnemy: null, isAutoAttacking: false, targetItem: null, 
    
    // ★追加: 攻撃力等の基本ステータス
    baseAttackDamage: 10, attackDamage: 10, attackRange: 50, attackRate: 0.5, attackCooldown: 0, pickupRange: 20,
    
    // ★追加: 所持金
    gold: 0, 

    // ★追加: 装備とインベントリ
    equipped: { weapon: null, armor: null, accessory: null },
    inventory: {
        equip: { capacity: 20, items: [] }, consume: { capacity: 20, items: [] },
        skill: { capacity: 20, items: [] }, etc: { capacity: 20, items: [] }, important: { capacity: 20, items: [] }
    }
};

window.playerPath = [];

// ★追加: 装備変更時などのステータス再計算
window.updatePlayerStats = function() {
    window.player.attackDamage = window.player.baseAttackDamage;
    if (window.player.equipped.weapon && window.player.equipped.weapon.stats.atk) {
        window.player.attackDamage += window.player.equipped.weapon.stats.atk;
    }
};

// ★追加: インベントリへのアイテム追加処理
window.addItemToInventory = function(itemData) {
    const tab = window.player.inventory[itemData.type];
    if (!tab) return false;
    const addCount = itemData.count || 1;
    if (itemData.maxStack > 1) {
        let existingItem = tab.items.find(i => i.id === itemData.id && i.count < i.maxStack);
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
        window.player.x = window.world.width / 2; window.player.y = window.world.height / 2;
        window.player.targetX = window.player.x; window.player.targetY = window.player.y;
        window.player.hp = window.player.maxHp;
        window.player.targetEnemy = null; window.player.isAutoAttacking = false; window.player.targetItem = null;
        window.playerPath = [];
        for(let enemy of window.enemies) {
            enemy.hateTable = {};
            enemy.damageTable = {};
        }
    }
};

// --- 敵の定義と生成 ---
window.createEnemy = function(options) {
    const radius = options.radius || 15;
    const initialPos = window.getSafeRandomPosition(options.spawnX, options.spawnY, 50, radius, options.isFlying);

    return {
        id: options.id,
        spawnX: options.spawnX, spawnY: options.spawnY,
        x: initialPos.x, y: initialPos.y, 
        targetX: initialPos.x, targetY: initialPos.y,
        path: [], 
        radius: radius,
        color: options.color || '#ff0000',
        hp: options.hp || 50, maxHp: options.maxHp || 50,
        speed: options.speed !== undefined ? options.speed : 30,
        isFlying: options.isFlying || false, 
        baseRespawnTime: options.respawnTime !== undefined ? options.respawnTime : 10, 
        
        type: options.type || 'passive',
        state: 'idle', 
        roamRadius: options.roamRadius || 250, 
        sightRadius: options.sightRadius || 200, 
        attackRange: options.attackRange || 40,  
        attackDamage: options.attackDamage || 5, 
        attackRate: options.attackRate || 1.5,   
        attackCooldown: 0,
        hasBeenAttacked: false, 
        
        timers: { roam: Math.random() * 3, respawn: 0, pathCalc: 0 },
        hateTable: {},      
        damageTable: {}     
    };
};

window.enemies = [
    window.createEnemy({ id: 1, spawnX: window.world.width / 2 + 200, spawnY: window.world.height / 2 + 100, type: 'active', color: '#ff4444', speed: 80, sightRadius: 250, attackDamage: 10 }),
    window.createEnemy({ id: 2, spawnX: window.world.width / 2 - 150, spawnY: window.world.height / 2 + 250, type: 'passive', color: '#4444ff', speed: 60, roamRadius: 300, respawnTime: 5 }), 
    window.createEnemy({ id: 3, spawnX: window.world.width / 2 + 300, spawnY: window.world.height / 2 - 100, type: 'static', color: '#ffff44', speed: 40, attackDamage: 20 })
];

// --- 敵の更新（AIロジック） ---
window.updateEnemies = function(dt) {
    for (let i = 0; i < window.enemies.length; i++) {
        let e = window.enemies[i];

        // 1. 死亡判定とドロップ処理
        if (e.hp <= 0 && e.state !== 'dead') {
            e.state = 'dead';
            e.timers.respawn = e.baseRespawnTime; 
            
            let topDamage = 0; let ownerId = null;
            for (let id in e.damageTable) {
                if (e.damageTable[id] > topDamage) {
                    topDamage = e.damageTable[id];
                    ownerId = id;
                }
            }
            
            // ★変更: itemDB.js のマスターデータを参照してドロップ
            if (Math.random() > 0.3) { 
                const keys = Object.keys(window.ITEM_DB);
                const randomKey = keys[Math.floor(Math.random() * keys.length)];
                const baseItem = window.ITEM_DB[randomKey];
                
                window.droppedItems.push({
                    uid: Date.now() + Math.random(),
                    id: baseItem.id, 
                    type: baseItem.type, equipSlot: baseItem.equipSlot, name: baseItem.name, rarity: baseItem.rarity,
                    color: baseItem.color, desc: baseItem.desc, stats: baseItem.stats, restore: baseItem.restore,
                    maxStack: baseItem.maxStack, count: 1, 
                    x: e.x, y: e.y, radius: 8, ownerId: ownerId, lifeTime: 0       
                });
            }

            if (window.player.targetEnemy === e) {
                window.player.targetEnemy = null;
                window.player.isAutoAttacking = false;
            }
            continue; 
        }

        // 2. リスポーン待機
        if (e.state === 'dead') {
            e.timers.respawn -= dt;
            if (e.timers.respawn <= 0) {
                const safePos = window.getSafeRandomPosition(e.spawnX, e.spawnY, 50, e.radius, e.isFlying);
                e.x = safePos.x; e.y = safePos.y; e.targetX = e.x; e.targetY = e.y;
                e.hp = e.maxHp; e.state = 'idle'; e.hasBeenAttacked = false; 
                e.hateTable = {}; e.damageTable = {}; e.path = [];
            }
            continue; 
        }

        if (e.attackCooldown > 0) e.attackCooldown -= dt;

        // 3. ヘイト管理（タゲ決定）
        let highestHate = 0; let targetId = null;
        for (let id in e.hateTable) {
            if (e.hateTable[id] > highestHate) { highestHate = e.hateTable[id]; targetId = id; }
        }
        let currentTarget = null;
        if (targetId === window.player.id) currentTarget = window.player;

        // 4. 追跡解除（見失い判定）
        if (currentTarget) {
            const distToTarget = Math.hypot(currentTarget.x - e.x, currentTarget.y - e.y);
            if (!e.hasBeenAttacked && distToTarget > e.sightRadius * 2) {
                delete e.hateTable[targetId]; currentTarget = null;
                e.state = 'return'; e.path = [];
                const returnTarget = window.getSafeRandomPosition(e.spawnX, e.spawnY, e.roamRadius * 0.5, e.radius, e.isFlying);
                e.targetX = returnTarget.x; e.targetY = returnTarget.y;
            }
        }

        // 5. アクティブ索敵
        if (!currentTarget && e.type === 'active') {
            const distToPlayer = Math.hypot(window.player.x - e.x, window.player.y - e.y);
            if (distToPlayer <= e.sightRadius && window.hasLineOfSight(e.x, e.y, window.player.x, window.player.y)) {
                e.hateTable[window.player.id] = 10; currentTarget = window.player;
            }
        }

        // 6. ステート実行
        if (currentTarget) {
            const distToTarget = Math.hypot(currentTarget.x - e.x, currentTarget.y - e.y);
            if (distToTarget <= e.attackRange) {
                e.state = 'attack'; e.path = [];
                if (e.attackCooldown <= 0) {
                    currentTarget.hp -= e.attackDamage; e.attackCooldown = e.attackRate; window.checkPlayerDeath(); 
                }
            } else {
                e.state = 'chase'; e.timers.pathCalc -= dt;
                if (e.timers.pathCalc <= 0) {
                    e.path = window.findPath(e.x, e.y, currentTarget.x, currentTarget.y, e.radius); e.timers.pathCalc = 0.5;
                }
                if (e.path && e.path.length > 0) {
                    const wp = e.path[0]; const dx = wp.x - e.x; const dy = wp.y - e.y; const distToWp = Math.hypot(dx, dy); const moveDist = e.speed * dt;
                    if (distToWp <= moveDist) { e.x = wp.x; e.y = wp.y; e.path.shift(); } 
                    else { const angle = Math.atan2(dy, dx); e.x += Math.cos(angle) * moveDist; e.y += Math.sin(angle) * moveDist; }
                }
            }
        } else {
            if (e.state === 'chase' || e.state === 'attack') { e.state = 'idle'; e.path = []; }
            
            if (e.state === 'return') {
                const dx = e.targetX - e.x; const dy = e.targetY - e.y; const dist = Math.hypot(dx, dy); const moveDist = e.speed * dt;
                if (dist > moveDist) { const angle = Math.atan2(dy, dx); e.x += Math.cos(angle) * moveDist; e.y += Math.sin(angle) * moveDist; } 
                else { e.x = e.targetX; e.y = e.targetY; e.state = 'idle'; }
            } else if (e.type !== 'static') {
                e.timers.roam -= dt;
                if (e.timers.roam <= 0) {
                    e.timers.roam = 3 + Math.random() * 2;
                    let roamTarget = window.getSafeRandomPosition(e.x, e.y, 100, e.radius, e.isFlying);
                    const distFromSpawn = Math.hypot(roamTarget.x - e.spawnX, roamTarget.y - e.spawnY);
                    if (distFromSpawn > e.roamRadius) { roamTarget = window.getSafeRandomPosition(e.spawnX, e.spawnY, e.roamRadius * 0.5, e.radius, e.isFlying); }
                    e.targetX = roamTarget.x; e.targetY = roamTarget.y; e.state = 'roam';
                }
                if (e.state === 'roam') {
                    const dx = e.targetX - e.x; const dy = e.targetY - e.y; const dist = Math.hypot(dx, dy); const moveDist = (e.speed * 0.6) * dt; 
                    if (dist > moveDist) { const angle = Math.atan2(dy, dx); e.x += Math.cos(angle) * moveDist; e.y += Math.sin(angle) * moveDist; } 
                    else { e.x = e.targetX; e.y = e.targetY; e.state = 'idle'; }
                }
            }
        }
        
        // 7. 衝突判定 (飛んでない場合)
        if (!e.isFlying) {
            for (const obs of window.obstacles) {
                const pushBack = window.checkCollision(e, obs);
                if (pushBack) {
                    e.x += pushBack.x; e.y += pushBack.y;
                    if (e.state === 'roam' || e.state === 'return') { e.targetX = e.x; e.targetY = e.y; e.state = 'idle'; }
                }
            }
        }
    }
};
