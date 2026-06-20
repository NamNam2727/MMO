// =========================================================
// loader.js
// 外部JSファイルを順番に読み込み、ゲームを初期化・起動する
// =========================================================

(function() {
    const baseURL = 'https://namnam2727.github.io/MMO/';
    
    // 依存関係を考慮したファイルの読み込み順序
    const scriptsToLoad = [
        'config.js',
        'audio.js',        
        'skill_db.js',     
        'itemDB.js',
        'utils.js',
        'mapManager.js',   
        'entities.js',
        'enemy/plains.js',
        'maps/town/npc1.js',   // ★追加: 街のNPCデータ
        'inventory_ui.js',     
        'inventory_action.js', 
        'shop_ui.js',          // ★追加: 次回作成するショップUI
        'shortcut.js',     
        'status_ui.js',    
        'chat_system.js',  
        'ui.js',           
        'skill_create.js', 
        'skill.js',        
        'multiplayer.js',  
        'renderer.js',     
        'main.js'          
    ];

    let loadedCount = 0;

    function loadScript(src, callback) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        // キャッシュ回避
        script.src = baseURL + src + '?v=' + new Date().getTime(); 
        
        script.onload = () => {
            console.log(`Loaded: ${src}`);
            callback();
        };
        
        script.onerror = () => {
            console.error(`Failed to load: ${src}`);
            // ※開発中はアラートを出すと止まる場合があるのでコンソールエラーのみにしておくのが無難です
            // alert(`スクリプトの読み込みに失敗しました: ${src}`);
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
            console.log('All scripts loaded. Initializing game...');
            startGame();
        }
    }

    function startGame() {
        if (typeof window.gameLoop !== 'function') {
            console.error('Game initialization functions are missing.');
            return;
        }

        // UI関連の初期化を実行
        if (typeof window.initUI === 'function') window.initUI();
        if (typeof window.initInventoryUI === 'function') window.initInventoryUI(); 
        if (typeof window.initSkillCreateUI === 'function') window.initSkillCreateUI();
        if (typeof window.initShopUI === 'function') window.initShopUI(); // ★追加: ショップUI初期化

        // メインループの開始
        requestAnimationFrame(window.gameLoop);

        // 初期マップの読み込み 
        if (window.MapManager) {
            window.MapManager.changeMap('town');
        }
    }

    // 読み込み開始
    loadNext();
})();
