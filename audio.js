// =========================================================
// audio.js
// 音楽・効果音の基盤システム（音量管理・マスターエフェクト）
// =========================================================

window.AudioManager = (function() {
    let ctx = null;
    let masterGain = null;
    let compressor = null;
    let isPlaying = false;
    let currentVolume = 0.5; // 音量の初期値 (0.0 〜 1.0)
    let currentBgmObj = null;

    // Web Audio APIの初期化
    function initAudio() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // 共通の空間エフェクト（リバーブ）の生成
    function createClearReverb() {
        const length = ctx.sampleRate * 1.2; 
        const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const channel = impulse.getChannelData(c);
            for (let i = 0; i < length; i++) {
                channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.5);
            }
        }
        const convolver = ctx.createConvolver();
        convolver.buffer = impulse;
        return convolver;
    }

    return {
        // システムの初期化（画面タップ時にui.jsから呼ばれる）
        init: function() {
            initAudio();
            if (ctx.state === 'suspended') ctx.resume();
        },
        
        // 全体の音量を設定する（設定ウィンドウから呼ばれる）
        setVolume: function(vol) {
            currentVolume = Math.max(0, Math.min(1, vol));
            if (masterGain && ctx) {
                // 音量の急な変化によるノイズを防ぐため、0.1秒かけて滑らかに変更
                masterGain.gain.setTargetAtTime(currentVolume, ctx.currentTime, 0.1);
            }
        },
        
        getVolume: function() {
            return currentVolume;
        },
        
        // BGMの再生（各マップのbgm.jsモジュールを引数に受け取る）
        playBGM: async function(bgmModule) {
            // ★追加: 現在再生中のBGMと同じ場合は、再起動せずそのまま流し続ける
            if (isPlaying && currentBgmObj === bgmModule) {
                return;
            }

            if (isPlaying) this.stopBGM();
            initAudio();
            
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            // マスターボリュームノードの作成
            masterGain = ctx.createGain();
            masterGain.gain.value = currentVolume;
            
            // 音圧を整えるコンプレッサー
            compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;
            
            // リバーブ（反響音）のルーティング
            const reverb = createClearReverb();
            const reverbWetGain = ctx.createGain();
            reverbWetGain.gain.value = 0.15; 
            
            masterGain.connect(compressor);
            compressor.connect(ctx.destination);
            
            masterGain.connect(reverb);
            reverb.connect(reverbWetGain);
            reverbWetGain.connect(compressor);
            
            isPlaying = true;
            currentBgmObj = bgmModule;
            
            // bgmModuleにコンテキストとマスターノードを渡して、実際の音作りと再生を委託する
            if (currentBgmObj && typeof currentBgmObj.start === 'function') {
                currentBgmObj.start(ctx, masterGain);
            }
        },
        
        // BGMの停止（マップ移動時などに呼ばれる）
        stopBGM: function() {
            if (!isPlaying) return;
            isPlaying = false;
            
            if (currentBgmObj && typeof currentBgmObj.stop === 'function') {
                currentBgmObj.stop();
            }
            currentBgmObj = null;
            
            // ★修正: 新しいBGMのmasterGainを消してしまわないよう、古いノードを一時変数に退避させる
            const oldMasterGain = masterGain;
            masterGain = null; // システム側の参照はここで切っておく
            
            // 古いBGMだけをフェードアウトして停止させる
            if (oldMasterGain) {
                try {
                    oldMasterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
                } catch(e) {}
                
                setTimeout(() => {
                    try {
                        oldMasterGain.disconnect();
                    } catch(e) {}
                }, 1500); 
            }
        },
        
        isPlaying: function() {
            return isPlaying;
        }
    };
})();
