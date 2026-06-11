// =========================================================
// utils.js
// 衝突判定、安全座標の探索、A*経路探索などの汎用関数群
// =========================================================

// --- 衝突・安全判定 ---

// 指定した円が壁にめり込んでいないか判定
window.isSafePosition = function(x, y, radius, isFlying = false) {
    if (isFlying) return true; 
    for (const obs of window.obstacles) {
        if (x < obs.x + obs.width + radius && x > obs.x - radius && y < obs.y + obs.height + radius && y > obs.y - radius) {
            return false; 
        }
    }
    return true; 
};

// 指定座標の周辺で安全なランダム座標を探す
window.getSafeRandomPosition = function(baseX, baseY, targetRadius, charRadius, isFlying = false) {
    let currentMaxRadius = targetRadius;
    for (let attemptLevel = 0; attemptLevel < 5; attemptLevel++) {
        for(let i = 0; i < 10; i++){ 
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * currentMaxRadius;
            const tx = baseX + Math.cos(angle) * dist;
            const ty = baseY + Math.sin(angle) * dist;
            // ワールド境界チェック
            if (tx < charRadius || tx > window.world.width - charRadius || ty < charRadius || ty > window.world.height - charRadius) continue;
            // 壁チェック
            if (window.isSafePosition(tx, ty, charRadius, isFlying)) return { x: tx, y: ty };
        }
        currentMaxRadius += 50; 
    }
    return { x: baseX, y: baseY }; // 見つからなければ元の位置を返す
};

// 2点間に壁がないか（視線が通るか）判定
window.hasLineOfSight = function(x1, y1, x2, y2) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(dist / 20)); 
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = x1 + (x2 - x1) * t;
        const cy = y1 + (y2 - y1) * t;
        for (const obs of window.obstacles) {
            if (cx > obs.x && cx < obs.x + obs.width && cy > obs.y && cy < obs.y + obs.height) {
                return false; 
            }
        }
    }
    return true; 
};

// 円と矩形の衝突判定（押し出しベクトルを返す）
window.checkCollision = function(circle, rect) {
    let testX = circle.x; let testY = circle.y;
    if (circle.x < rect.x) testX = rect.x; else if (circle.x > rect.x + rect.width) testX = rect.x + rect.width;
    if (circle.y < rect.y) testY = rect.y; else if (circle.y > rect.y + rect.height) testY = rect.y + rect.height;
    
    const distX = circle.x - testX; const distY = circle.y - testY; 
    const distance = Math.sqrt((distX * distX) + (distY * distY));
    
    if (distance <= circle.radius) {
        if (distance === 0) return { x: 0, y: -circle.radius };
        const overlap = circle.radius - distance; 
        return { x: (distX / distance) * overlap, y: (distY / distance) * overlap };
    }
    return null;
};

// --- A* 経路探索アルゴリズム ---

// ★修正: 経路探索のグリッドサイズを画像の半分(32)にし、細かい隙間を通れるようにする
window.pathGridSize = 32;
window.pathCols = Math.ceil(window.world.width / window.pathGridSize); 
window.pathRows = Math.ceil(window.world.height / window.pathGridSize);
window.pathGrid = [];

// マップのグリッドを構築（初期化時に1回呼ぶ想定）
window.initPathGrid = function(playerRadius) {
    // 余裕を持たせすぎると引っかかるため、実際の半径に合わせる
    const margin = playerRadius; 
    for (let y = 0; y < window.pathRows; y++) {
        window.pathGrid[y] = [];
        for (let x = 0; x < window.pathCols; x++) {
            let walkable = true;
            // ★修正: グリッドの「中心点」を基準に安全確認を行い、誤判定を防ぐ
            const cx = x * window.pathGridSize + window.pathGridSize / 2; 
            const cy = y * window.pathGridSize + window.pathGridSize / 2;
            
            for (const obs of window.obstacles) {
                if (cx < obs.x + obs.width + margin && cx > obs.x - margin && cy < obs.y + obs.height + margin && cy > obs.y - margin) {
                    walkable = false; break;
                }
            }
            window.pathGrid[y][x] = walkable;
        }
    }
};

window.findPath = function(startX, startY, endX, endY, charRadius = 15) {
    const sCol = Math.max(0, Math.min(window.pathCols - 1, Math.floor(startX / window.pathGridSize)));
    const sRow = Math.max(0, Math.min(window.pathRows - 1, Math.floor(startY / window.pathGridSize)));
    const eCol = Math.max(0, Math.min(window.pathCols - 1, Math.floor(endX / window.pathGridSize)));
    const eRow = Math.max(0, Math.min(window.pathRows - 1, Math.floor(endY / window.pathGridSize)));

    const getH = (x1, y1, x2, y2) => { const dx = Math.abs(x1 - x2); const dy = Math.abs(y1 - y2); return Math.max(dx, dy) + (Math.sqrt(2) - 1) * Math.min(dx, dy); };
    
    const openList = []; const closedList = new Set(); const nodes = {};
    const startKey = `${sCol},${sRow}`;
    nodes[startKey] = { x: sCol, y: sRow, g: 0, h: getH(sCol, sRow, eCol, eRow), parent: null };
    nodes[startKey].f = nodes[startKey].g + nodes[startKey].h;
    openList.push(nodes[startKey]);
    
    let closestNode = nodes[startKey]; let minHeuristic = nodes[startKey].h;
    const neighbors = [{x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}, {x: -1, y: -1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: 1, y: 1}];
    
    let loopCount = 0; 
    // ★修正: グリッドを半分にしたためマス目が4倍に増える。長距離探索が途切れないようループ上限を引き上げ
    const maxLoops = 4000;

    while (openList.length > 0 && loopCount < maxLoops) {
        loopCount++;
        let currentIndex = 0;
        for (let i = 1; i < openList.length; i++) { if (openList[i].f < openList[currentIndex].f) currentIndex = i; }
        const current = openList[currentIndex]; openList.splice(currentIndex, 1); closedList.add(`${current.x},${current.y}`);
        
        if (current.x === eCol && current.y === eRow) return window.reconstructPath(current, endX, endY, charRadius);
        if (current.h < minHeuristic) { minHeuristic = current.h; closestNode = current; }

        for (const dir of neighbors) {
            const nx = current.x + dir.x; const ny = current.y + dir.y;
            if (nx < 0 || nx >= window.pathCols || ny < 0 || ny >= window.pathRows) continue;
            const nKey = `${nx},${ny}`;
            if (closedList.has(nKey)) continue; if (!window.pathGrid[ny][nx]) continue;
            if (dir.x !== 0 && dir.y !== 0) { if (!window.pathGrid[current.y][nx] && !window.pathGrid[ny][current.x]) continue; }
            const gCost = current.g + (dir.x === 0 || dir.y === 0 ? 1 : 1.414);
            let neighbor = nodes[nKey];
            if (!neighbor) {
                neighbor = { x: nx, y: ny, parent: current }; neighbor.h = getH(nx, ny, eCol, eRow); neighbor.g = gCost; neighbor.f = neighbor.g + neighbor.h;
                nodes[nKey] = neighbor; openList.push(neighbor);
            } else if (gCost < neighbor.g) {
                neighbor.parent = current; neighbor.g = gCost; neighbor.f = neighbor.g + neighbor.h;
            }
        }
    }
    return window.reconstructPath(closestNode, endX, endY, charRadius);
};

window.reconstructPath = function(node, exactEndX, exactEndY, charRadius) {
    const path = []; let curr = node;
    while(curr) { 
        if (curr.parent) { 
            path.unshift({ x: curr.x * window.pathGridSize + window.pathGridSize / 2, y: curr.y * window.pathGridSize + window.pathGridSize / 2 }); 
        } 
        curr = curr.parent; 
    }
    if (path.length > 0) { 
        if (window.isSafePosition(exactEndX, exactEndY, charRadius)) { 
            path[path.length - 1].x = exactEndX; path[path.length - 1].y = exactEndY; 
        } 
    }
    return path;
};
