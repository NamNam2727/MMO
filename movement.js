　(function(){

"use strict";

window.MovementSystem = {};

/* =========================================================
   GRID
========================================================= */

MovementSystem.Grid = {

    cols: 0,
    rows: 0,

    map: [],

    init(game, walls){

        this.cols =
            Math.ceil(game.worldWidth / game.gridSize);

        this.rows =
            Math.ceil(game.worldHeight / game.gridSize);

        this.map = [];

        // 【修正】壁がグリッドに少しだけはみ出している程度ではブロックしないためのマージン
        // グリッドサイズの35%未満の重なりは「歩ける場所」として許容します
        const margin = game.gridSize * 0.35;

        for(let y=0; y<this.rows; y++){

            this.map[y] = [];

            for(let x=0; x<this.cols; x++){

                const cellX = x * game.gridSize;
                const cellY = y * game.gridSize;
                const cellRight = cellX + game.gridSize;
                const cellBottom = cellY + game.gridSize;

                let blocked = false;

                for(const wall of walls){

                    // マージンを考慮した判定
                    if(
                        cellX < wall.x + wall.w - margin &&
                        cellRight > wall.x + margin &&
                        cellY < wall.y + wall.h - margin &&
                        cellBottom > wall.y + margin
                    ){
                        blocked = true;
                        break;
                    }
                }

                this.map[y][x] = blocked ? 1 : 0;
            }
        }
    },

    isBlocked(x, y){

        if(
            x < 0 ||
            y < 0 ||
            x >= this.cols ||
            y >= this.rows
        ){
            return true;
        }

        return this.map[y][x] === 1;
    }
};

/* =========================================================
   COLLISION
========================================================= */

MovementSystem.isCollidingWithWall =
function(x, y, radius, walls){

    for(const wall of walls){

        const nearestX = Math.max(
            wall.x,
            Math.min(x, wall.x + wall.w)
        );

        const nearestY = Math.max(
            wall.y,
            Math.min(y, wall.y + wall.h)
        );

        const dx = x - nearestX;
        const dy = y - nearestY;

        const dist = Math.hypot(dx, dy);

        if(dist < radius){
            return true;
        }
    }

    return false;
};

MovementSystem.moveWithCollision =
function(entity, moveX, moveY, walls){

    // 【修正】移動前に「すでにめり込んでいないか」をチェックし、入っていれば押し出す（スタック防止）
    const safePos = MovementSystem.getSafePosition(
        entity.x,
        entity.y,
        entity.radius,
        walls
    );
    entity.x = safePos.x;
    entity.y = safePos.y;

    // 押し出し後の安全な座標を起点に移動先を計算
    const nextX = entity.x + moveX;
    const nextY = entity.y + moveY;

    // XY移動
    if(
        !MovementSystem.isCollidingWithWall(
            nextX,
            nextY,
            entity.radius,
            walls
        )
    ){
        entity.x = nextX;
        entity.y = nextY;
        return true;
    }

    // Xのみ
    if(
        !MovementSystem.isCollidingWithWall(
            nextX,
            entity.y,
            entity.radius,
            walls
        )
    ){
        entity.x = nextX;
        return true;
    }

    // Yのみ
    if(
        !MovementSystem.isCollidingWithWall(
            entity.x,
            nextY,
            entity.radius,
            walls
        )
    ){
        entity.y = nextY;
        return true;
    }

    return false;
};

/* =========================================================
   SAFE POSITION (めり込み解消ロジックの強化)
========================================================= */

MovementSystem.getSafePosition =
function(x, y, radius, walls){

    let safeX = x;
    let safeY = y;

    for(const wall of walls){

        // 【修正】中心が壁の「完全に内側」に入ってしまった場合の強制押し出し
        if(
            safeX > wall.x && safeX < wall.x + wall.w &&
            safeY > wall.y && safeY < wall.y + wall.h
        ){
            const distLeft = safeX - wall.x;
            const distRight = (wall.x + wall.w) - safeX;
            const distTop = safeY - wall.y;
            const distBottom = (wall.y + wall.h) - safeY;

            const minDist = Math.min(distLeft, distRight, distTop, distBottom);

            if(minDist === distLeft) safeX = wall.x - radius;
            else if(minDist === distRight) safeX = wall.x + wall.w + radius;
            else if(minDist === distTop) safeY = wall.y - radius;
            else if(minDist === distBottom) safeY = wall.y + wall.h + radius;
        }

        // 通常の円形押し出し処理（かすっている時の処理）
        const nearestX = Math.max(
            wall.x,
            Math.min(safeX, wall.x + wall.w)
        );

        const nearestY = Math.max(
            wall.y,
            Math.min(safeY, wall.y + wall.h)
        );

        const dx = safeX - nearestX;
        const dy = safeY - nearestY;

        const dist = Math.hypot(dx, dy);

        if(dist < radius){

            const push = radius - dist + 0.1; // +0.1の余裕を持たせて確実に外へ出す

            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            safeX += nx * push;
            safeY += ny * push;
        }
    }

    return {
        x: safeX,
        y: safeY
    };
};

/* =========================================================
   PATH HELPERS
========================================================= */

MovementSystem.findNearestWalkable =
function(gx, gy){

    if(
        !MovementSystem.Grid.isBlocked(gx, gy)
    ){
        return { x: gx, y: gy };
    }

    const maxRadius = 12;

    let best = null;
    let bestDist = Infinity;

    for(let r = 1; r <= maxRadius; r++){
        for(let y = -r; y <= r; y++){
            for(let x = -r; x <= r; x++){

                const nx = gx + x;
                const ny = gy + y;

                if(MovementSystem.Grid.isBlocked(nx, ny)){
                    continue;
                }

                const dist = Math.hypot(x, y);

                if(dist < bestDist){
                    bestDist = dist;
                    best = { x: nx, y: ny };
                }
            }
        }
    }

    return best;
};

MovementSystem.hasLineOfSight =
function(x1, y1, x2, y2, walls, game){

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const step = 8;
    const steps = Math.ceil(distance / step);

    // 【修正】レイキャストの太さを45%にし、エンティティが確実に通れる道だけをショートカットさせる
    const rayRadius = game ? (game.gridSize * 0.45) : 12;

    for(let i = 0; i <= steps; i++){
        if(i <= 1) continue;

        const t = i / steps;
        const x = x1 + dx * t;
        const y = y1 + dy * t;

        if(MovementSystem.isCollidingWithWall(x, y, rayRadius, walls)){
            return false;
        }
    }

    return true;
};

MovementSystem.smoothPath =
function(path, walls, game){

    if(path.length <= 2){
        return path;
    }

    const result = [];
    let current = 0;
    result.push(path[0]);

    while(current < path.length - 1){
        let next = current + 1;

        for(let i = path.length - 1; i > current; i--){
            const a = path[current];
            const b = path[i];

            if(MovementSystem.hasLineOfSight(a.x, a.y, b.x, b.y, walls, game)){
                next = i;
                break;
            }
        }

        result.push(path[next]);
        current = next;
    }

    return result;
};

/* =========================================================
   PATHFIND
========================================================= */

MovementSystem.findPath =
function(startX, startY, goalX, goalY, game){

    const gridSize = game.gridSize;

    const rawStartGX = Math.floor(startX / gridSize);
    const rawStartGY = Math.floor(startY / gridSize);
    const rawGoalGX = Math.floor(goalX / gridSize);
    const rawGoalGY = Math.floor(goalY / gridSize);

    const startNode = MovementSystem.findNearestWalkable(rawStartGX, rawStartGY);
    const goalNode = MovementSystem.findNearestWalkable(rawGoalGX, rawGoalGY);

    if(!startNode || !goalNode){
        return [];
    }

    const startGX = startNode.x;
    const startGY = startNode.y;
    const goalGX = goalNode.x;
    const goalGY = goalNode.y;

    const open = [];
    const closed = {};
    let closestNode = null;
    let closestDist = Infinity;

    open.push({
        x: startGX,
        y: startGY,
        g: 0,
        h: 0,
        f: 0,
        parent: null
    });

    const dirs = [
        [ 1, 0], [-1, 0], [ 0, 1], [ 0,-1],
        [ 1, 1], [ 1,-1], [-1, 1], [-1,-1]
    ];

    let loop = 0;
    const maxLoop = 4000;

    while(open.length > 0 && loop < maxLoop){
        loop++;
        open.sort((a,b)=>a.f-b.f);
        const current = open.shift();
        const key = current.x + "," + current.y;
        closed[key] = true;

        const goalDist = Math.hypot(goalGX - current.x, goalGY - current.y);
        if(goalDist < closestDist){
            closestDist = goalDist;
            closestNode = current;
        }

        if(current.x === goalGX && current.y === goalGY){
            return MovementSystem.smoothPath(
                buildPath(current, game),
                window.walls,
                game
            );
        }

        for(const dir of dirs){
            const nx = current.x + dir[0];
            const ny = current.y + dir[1];
            const nkey = nx + "," + ny;

            if(closed[nkey]) continue;
            if(MovementSystem.Grid.isBlocked(nx, ny)) continue;

            if(dir[0] !== 0 && dir[1] !== 0){
                if(
                    MovementSystem.Grid.isBlocked(current.x + dir[0], current.y) ||
                    MovementSystem.Grid.isBlocked(current.x, current.y + dir[1])
                ){
                    continue;
                }
            }

            const g = current.g + ((dir[0] !== 0 && dir[1] !== 0) ? 1.4 : 1);
            const h = Math.hypot(goalGX - nx, goalGY - ny);
            const f = g + h;

            let exists = false;
            for(const node of open){
                if(node.x === nx && node.y === ny){
                    exists = true;
                    if(g < node.g){
                        node.g = g;
                        node.f = f;
                        node.parent = current;
                    }
                    break;
                }
            }

            if(!exists){
                open.push({
                    x: nx,
                    y: ny,
                    g,
                    h,
                    f,
                    parent: current
                });
            }
        }
    }

    if(closestNode){
        return MovementSystem.smoothPath(
            buildPath(closestNode, game),
            window.walls,
            game
        );
    }

    return [];
};

/* =========================================================
   BUILD PATH
========================================================= */

function buildPath(node, game){
    const path = [];
    while(node){
        path.push({
            x: node.x * game.gridSize + game.gridSize / 2,
            y: node.y * game.gridSize + game.gridSize / 2
        });
        node = node.parent;
    }
    path.reverse();
    return path;
}

})();
