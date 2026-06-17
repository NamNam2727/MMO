// =========================================================
// loader.js
// 外部JSファイルを順番に読み込み、ゲームを初期化・起動する
// =========================================================

(function() {
    const baseURL = 'https://namnam2727.github.io/MMO/';
    
    // 依存関係を考慮したファイルの読み込み順序
    const scriptsToLoad = [
        'config.js',
        'audio.js',        // 音楽の基盤システム
        'skill_db.js',     
        'itemDB.js',
        'utils.js',
        'mapManager.js',   
        'entities.js',
        'inventory.js',    
        'shortcut.js',     
        'status_ui.js',    // ★追加: ステータス画面制御
        'chat_system.js',  // ★追加: チャット・ログ制御
        'ui.js',           // ベースとなるUI制御（これらを呼び出す）
        'skill_create.js', 
        'skill.js',        
        'multiplayer.js',  // マルチプレイ・パーティUI
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
