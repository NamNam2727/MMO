// =========================================================
// config.js
// ゲーム全体で共有する静的な設定、アセット定義、Canvas初期設定
// =========================================================

// アセット管理（将来的にBase64画像等を格納）
window.ASSETS = { player: null, enemy: null, item: null };

// ★修正: マップサイズは後で mapManager が上書きするので、最初は 0 にしておく
window.world = { width: 0, height: 0 };

// カメラ初期設定
window.camera = { x: 0, y: 0, width: 0, height: 0, deadZoneX: 0, deadZoneY: 0 };

// ★修正: 障害物（壁）の初期定義を空にしておく（一瞬テスト壁が見えるのを防ぐため）
window.obstacles = [];

// アイテム関連のグローバル変数
window.FREE_LOOT_TIME = 300; 
window.droppedItems = []; // フィールド上のドロップアイテムを管理する配列

// =========================================================
// Canvasとリサイズ処理 (高画質対応)
// =========================================================
window.canvas = document.getElementById('gameCanvas');
window.ctx = window.canvas ? window.canvas.getContext('2d') : null;

window.resizeCanvas = function() {
    if (!window.canvas) return;
    
    // 端末のディスプレイ解像度（DPR）を取得。取得できなければ通常の 1
    const dpr = window.devicePixelRatio || 1;
    
    // Canvasの「見た目のサイズ（CSS）」を画面いっぱいに設定
    window.canvas.style.width = window.innerWidth + 'px';
    window.canvas.style.height = window.innerHeight + 'px';
    
    // Canvasの「実際の解像度」をDPRの分だけ引き上げる（ぼやけ解消の要）
    window.canvas.width = window.innerWidth * dpr;
    window.canvas.height = window.innerHeight * dpr;
    
    // 描画する際もDPRに合わせてスケールを拡大する
    if (window.ctx) {
        window.ctx.scale(dpr, dpr);
    }
    
    // カメラの計算サイズは「見た目のサイズ」で扱う
    window.camera.width = window.innerWidth;
    window.camera.height = window.innerHeight;
    
    // 遊び（デッドゾーン）は画面サイズの10%
    window.camera.deadZoneX = window.innerWidth * 0.1;
    window.camera.deadZoneY = window.innerHeight * 0.1;
};

window.addEventListener('resize', window.resizeCanvas);
if (window.canvas) {
    window.resizeCanvas();
}
