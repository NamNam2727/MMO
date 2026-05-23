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

                const cellX =
                    x * game.gridSize;

                const cellY =
                    y * game.gridSize;

                const cellRight =
                    cellX + game.gridSize;

                const cellBottom =
                    cellY + game.gridSize;

                let blocked = false;

                for(const wall of walls){

                    // 【修正箇所1】完全に内包されているかではなく、1ピクセルでも重なっていれば（交差していれば）壁とする標準的なAABB判定
                    if(
                        cellX < wall.x + wall.w &&
                        cellRight > wall.x &&
                        cellY < wall.y + wall.h &&
                        cellBottom > wall.y
                    ){

                        blocked = true;
                        break;
                    }
                }

                this.map[y][x] =
                    blocked ? 1 : 0;
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
            Math.min(
                x,
                wall.x + wall.w
            )
        );

        const nearestY = Math.max(
            wall.y,
            Math.min(
                y,
                wall.y + wall.h
            )
        );

        const dx = x - nearestX;
        const dy = y - nearestY;

        const dist =
            Math.hypot(dx, dy);

        if(dist < radius){

            return true;
        }
    }

    return false;
};

MovementSystem.moveWithCollision =
function(entity, moveX, moveY, walls){

    const nextX =
        entity.x + moveX;

    const nextY =
        entity.y + moveY;

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
   SAFE POSITION
========================================================= */

MovementSystem.getSafePosition =
function(x, y, radius, walls){

    let safeX = x;
    let safeY = y;

    for(const wall of walls){

        const nearestX = Math.max(
            wall.x,
            Math.min(
                safeX,
                wall.x + wall.w
            )
        );

        const nearestY = Math.max(
            wall.y,
            Math.min(
                safeY,
                wall.y + wall.h
            )
        );

        const dx = safeX - nearestX;
        const dy = safeY - nearestY;

        const dist =
            Math.hypot(dx, dy);

        if(dist < radius){

            const push =
                radius - dist + 0.5;

            const nx =
                dx / (dist || 1);

            const ny =
                dy / (dist || 1);

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
        !MovementSystem.Grid.isBlocked(
            gx,
            gy
        )
    ){

        return {
            x: gx,
            y: gy
        };
    }

    const maxRadius = 12;

    let best = null;
    let bestDist = Infinity;

    for(let r = 1; r <= maxRadius; r++){

        for(let y = -r; y <= r; y++){

            for(let x = -r; x <= r; x++){

                const nx = gx + x;
                const ny = gy + y;

                if(
                    MovementSystem.Grid.isBlocked(
                        nx,
                        ny
                    )
                ){
                    continue;
                }

                const dist =
                    Math.hypot(x, y);

                if(dist < bestDist){

                    bestDist = dist;

                    best = {
                        x: nx,
                        y: ny
                    };
                }
            }
        }
    }

    return best;
};

// 【修正箇所2】引数に game を追加し、グリッドサイズから動的に半径を計算できるようにする
MovementSystem.hasLineOfSight =
function(x1, y1, x2, y2, walls, game){

    const dx = x2 - x1;
    const dy = y2 - y1;

    const distance =
        Math.hypot(dx, dy);

    const step = 8;

    const steps =
        Math.ceil(distance / step);

    // 【修正箇所2】ハードコードされた 10 をやめ、グリッドサイズの40%程度の太さのレイキャストにする
    // （もしgameが渡されなかった場合のフォールバックとして10を残す）
    const rayRadius = game ? (game.gridSize * 0.4) : 10;

    for(let i = 0; i <= steps; i++){

        // 開始地点付近は無視
        if(i <= 1){
            continue;
        }

        const t = i / steps;

        const x =
            x1 + dx * t;

        const y =
            y1 + dy * t;

        if(
            MovementSystem.isCollidingWithWall(
                x,
                y,
                rayRadius,
                walls
            )
        ){

            return false;
        }
    }

    return true;
};

// 【修正箇所2】hasLineOfSight に game を渡すため、引数に game を追加
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

        for(
            let i = path.length - 1;
            i > current;
            i--
        ){

            const a = path[current];
            const b = path[i];

            if(
                MovementSystem.hasLineOfSight(
                    a.x,
                    a.y,
                    b.x,
                    b.y,
                    walls,
                    game // 【修正箇所2】
                )
            ){

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

    const gridSize =
        game.gridSize;

    const rawStartGX =
        Math.floor(startX / gridSize);

    const rawStartGY =
        Math.floor(startY / gridSize);

    const rawGoalGX =
        Math.floor(goalX / gridSize);

    const rawGoalGY =
        Math.floor(goalY / gridSize);

    const startNode =
        MovementSystem.findNearestWalkable(
            rawStartGX,
            rawStartGY
        );

    const goalNode =
        MovementSystem.findNearestWalkable(
            rawGoalGX,
            rawGoalGY
        );

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

        x:startGX,
        y:startGY,

        g:0,
        h:0,
        f:0,

        parent:null
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
    const maxLoop = 4000;

    while(
        open.length > 0 &&
        loop < maxLoop
    ){

        loop++;

        open.sort((a,b)=>a.f-b.f);

        const current =
            open.shift();

        const key =
            current.x + "," + current.y;

        closed[key] = true;

        const goalDist =
            Math.hypot(
                goalGX - current.x,
                goalGY - current.y
            );

        if(goalDist < closestDist){

            closestDist = goalDist;
            closestNode = current;
        }

        if(
            current.x === goalGX &&
            current.y === goalGY
        ){
            
            // 【修正箇所2】smoothPath に game オブジェクトを渡す
            return MovementSystem.smoothPath(
                buildPath(current, game),
                window.walls,
                game
            );
        }

        for(const dir of dirs){

            const nx =
                current.x + dir[0];

            const ny =
                current.y + dir[1];

            const nkey =
                nx + "," + ny;

            if(closed[nkey]){

                continue;
            }

            if(
                MovementSystem.Grid.isBlocked(
                    nx,
                    ny
                )
            ){

                continue;
            }

            // 斜めすり抜け禁止
            if(
                dir[0] !== 0 &&
                dir[1] !== 0
            ){

                if(
                    MovementSystem.Grid.isBlocked(
                        current.x + dir[0],
                        current.y
                    ) ||

                    MovementSystem.Grid.isBlocked(
                        current.x,
                        current.y + dir[1]
                    )
                ){
                    continue;
                }
            }

            const g =
                current.g +
                (
                    (
                        dir[0] !== 0 &&
                        dir[1] !== 0
                    ) ? 1.4 : 1
                );

            const h =
                Math.hypot(
                    goalGX - nx,
                    goalGY - ny
                );

            const f = g + h;

            let exists = false;

            for(const node of open){

                if(
                    node.x === nx &&
                    node.y === ny
                ){

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

                    x:nx,
                    y:ny,

                    g,
                    h,
                    f,

                    parent:current
                });
            }
        }
    }

    if(closestNode){
        
        // 【修正箇所2】smoothPath に game オブジェクトを渡す
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

            x:
                node.x * game.gridSize +
                game.gridSize / 2,

            y:
                node.y * game.gridSize +
                game.gridSize / 2
        });

        node = node.parent;
    }

    path.reverse();

    return path;
}

})();
