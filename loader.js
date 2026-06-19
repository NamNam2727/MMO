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
        'inventory_ui.js',     // ★変更: 分割したUIファイル
        'inventory_action.js', // ★変更: 分割したアクションファイル
        'shortcut.js',     
        'status_ui.js',    
        'chat_system.js',  
        'ui.js',           
        'skill_create.js', 
        'skill.js',        
        'multiplayer.js',  
        'renderer.js',     // ★追加: 切り出した描画モジュール
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
        if (typeof window.initInventoryUI === 'function') window.initInventoryUI(); // ★念のためインベントリ初期化も確実に行う
        if (typeof window.initSkillCreateUI === 'function') window.initSkillCreateUI();

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
