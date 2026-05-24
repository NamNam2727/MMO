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

        for(let y=0; y<this.rows; y++){

            this.map[y] = [];

            for(let x=0; x<this.cols; x++){

                const worldX = x * game.gridSize;
                const worldY = y * game.gridSize;

                let blocked = false;

                for(const wall of walls){

                    // 動作していたHTMLと同じ正確なAABB（重なり）判定
                    if(
                        worldX < wall.x + wall.w &&
                        worldX + game.gridSize > wall.x &&
                        worldY < wall.y + wall.h &&
                        worldY + game.gridSize > wall.y
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

    const nextX = entity.x + moveX;
    const nextY = entity.y + moveY;

    // 両方移動
    if(!MovementSystem.isCollidingWithWall(nextX, nextY, entity.radius, walls)){
        entity.x = nextX;
        entity.y = nextY;
        return true;
    }

    // Xのみ
    if(!MovementSystem.isCollidingWithWall(nextX, entity.y, entity.radius, walls)){
        entity.x = nextX;
        return true;
    }

    // Yのみ
    if(!MovementSystem.isCollidingWithWall(entity.x, nextY, entity.radius, walls)){
        entity.y = nextY;
        return true;
    }

    return false;
};

/* =========================================================
   SAFE POSITION
========================================================= */

MovementSystem.getSafePosition =
function(x, y, radius, walls){

    let safeX = x;
    let safeY = y;

    for(const wall of walls){

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

            // 動作していたHTMLと同じく押し出し幅は +1
            const push = radius - dist + 1;

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

    if(!MovementSystem.Grid.isBlocked(gx, gy)){
        return {
            x: gx,
            y: gy
        };
    }

    // 動作していたHTMLと同じ maxRadius: 6 と即時リターン処理
    const maxRadius = 6;

    for(let r = 1; r <= maxRadius; r++){
        for(let y = -r; y <= r; y++){
            for(let x = -r; x <= r; x++){

                const nx = gx + x;
                const ny = gy + y;

                if(!MovementSystem.Grid.isBlocked(nx, ny)){
                    return {
                        x: nx,
                        y: ny
                    };
                }
            }
        }
    }

    return null;
};

/* =========================================================
   PATH SMOOTHING
========================================================= */

MovementSystem.hasLineOfSight =
function(x1, y1, x2, y2, walls){

    const dx = x2 - x1;
    const dy = y2 - y1;

    const distance = Math.hypot(dx, dy);

    // 動作していたHTMLと同じ step: 16
    const step = 16;
    const steps = Math.ceil(distance / step);

    for(let i = 0; i <= steps; i++){

        // 開始地点付近は無視
        if(i <= 1){
            continue;
        }

        const t = i / steps;

        const x = x1 + dx * t;
        const y = y1 + dy * t;

        // 動作していたHTMLと同じ 判定半径: 10
        if(MovementSystem.isCollidingWithWall(x, y, 10, walls)){
            return false;
        }
    }

    return true;
};

MovementSystem.smoothPath =
function(path, walls){

    if(path.length <= 2){
        return path;
    }

    const result = [];
    let current = 0;

    result.push(path[0]);

    while(current < path.length - 1){

        // 動作していたHTMLと同じロジック
        let next = path.length - 1;

        for(let i = path.length - 1; i > current; i--){

            const a = path[current];
            const b = path[i];

            if(MovementSystem.hasLineOfSight(a.x, a.y, b.x, b.y, walls)){
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
function(startX, startY, goalX, goalY, game, walls){

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
        [ 1, 0],
        [-1, 0],
        [ 0, 1],
        [ 0,-1],
        [ 1, 1],
        [ 1,-1],
        [-1, 1],
        [-1,-1]
    ];

    let loop = 0;
    // 動作していたHTMLと同じく maxLoop: 3000
    const maxLoop = 3000;

    while(open.length > 0 && loop < maxLoop){

        loop++;

        open.sort((a,b) => a.f - b.f);

        const current = open.shift();

        const key = current.x + "," + current.y;

        closed[key] = true;

        const goalDist = Math.hypot(goalGX - current.x, goalGY - current.y);

        if(goalDist < closestDist){
            closestDist = goalDist;
            closestNode = current;
        }

        if(
            current.x === goalGX &&
            current.y === goalGY
        ){
            return MovementSystem.smoothPath(buildPath(current, game), walls);
        }

        for(const dir of dirs){

            const nx = current.x + dir[0];
            const ny = current.y + dir[1];

            const nkey = nx + "," + ny;

            if(closed[nkey]) continue;

            if(MovementSystem.Grid.isBlocked(nx, ny)) continue;

            // 斜めすり抜け禁止
            if(dir[0] !== 0 && dir[1] !== 0){
                if(
                    MovementSystem.Grid.isBlocked(current.x + dir[0], current.y) ||
                    MovementSystem.Grid.isBlocked(current.x, current.y + dir[1])
                ){
                    continue;
                }
            }

            const g = current.g + ((dir[0] !== 0 && dir[1] !== 0) ? 1.4 : 1);

            // 動作していたHTMLと同じ「マンハッタン距離」による計算式
            const h = Math.abs(goalGX - nx) + Math.abs(goalGY - ny);

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
        return MovementSystem.smoothPath(buildPath(closestNode, game), walls);
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
