// =========================================================
// loader.js
// 外部JSファイルを順番に読み込み、ゲームを初期化・起動する
// =========================================================

(function() {
    const baseURL = 'https://namnam2727.github.io/MMO/';
    
    // 依存関係を考慮した読み込み順序
    const scriptsToLoad = [
        'config.js',
        'utils.js',
        'entities.js',
        'main.js'
    ];

    let loadedCount = 0;

    function loadScript(src, callback) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        // キャッシュ対策（開発中用。本番稼働時は消してもOK）
        script.src = baseURL + src + '?v=' + new Date().getTime(); 
        
        script.onload = () => {
            console.log(`Loaded: ${src}`);
            callback();
        };
        
        script.onerror = () => {
            console.error(`Failed to load: ${src}`);
            alert(`スクリプトの読み込みに失敗しました: ${src}`);
        };

        document.head.appendChild(script);
    }

    function loadNext() {
        if (loadedCount < scriptsToLoad.length) {
            loadScript(scriptsToLoad[loadedCount], () => {
                loadedCount++;
                loadNext();
            });
        } else {
            // 全てのスクリプトが読み込まれた後の初期化処理
            console.log('All scripts loaded. Initializing game...');
            startGame();
        }
    }

    function startGame() {
        // config.js 等で定義された変数が window 上に存在するか確認
        if (typeof window.initPathGrid !== 'function' || typeof window.gameLoop !== 'function') {
            console.error('Game initialization functions are missing.');
            return;
        }

        // A*用のグリッドを初期化
        window.initPathGrid(window.player.radius);

        // UIボタンの初期化（main.js の setTimeout の代わりにより安全にバインド）
        const attackBtn = document.getElementById('attackBtn');
        const lootBtn = document.getElementById('lootBtn');
        
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

        // メインループの開始
        requestAnimationFrame(window.gameLoop);
    }

    // 読み込み開始
    loadNext();
})();
