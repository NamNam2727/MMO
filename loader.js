// =========================================================
// loader.js
// 外部JSファイルを順番に読み込み、ゲームを初期化・起動する
// =========================================================

(function() {
    const baseURL = 'https://namnam2727.github.io/MMO/';
    
    // 依存関係を考慮したファイルの読み込み順序
    const scriptsToLoad = [
        'config.js',
        'skill_db.js',     
        'itemDB.js',
        'utils.js',
        'mapManager.js',   // マップデータ管理と切り替え
        'entities.js',
        'inventory.js',    
        'shortcut.js',     
        'ui.js',           
        'skill_create.js', 
        'skill.js',        
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

        // UIボタンのイベントリスナー登録等を実行
        if (typeof window.initUI === 'function') window.initUI();
        if (typeof window.initSkillCreateUI === 'function') window.initSkillCreateUI();

        // メインループの開始
        requestAnimationFrame(window.gameLoop);

        // ★初期マップの読み込み 
        // 座標を指定しないことで、mapManagerが自動的にマップ内の「4」の位置を読み取って配置します
        if (window.MapManager) {
            window.MapManager.changeMap('town');
        }
    }

    // 読み込み開始
    loadNext();
})();
