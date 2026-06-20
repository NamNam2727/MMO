// =========================================================
// maps/world/bgm.js
// ワールドマップ用BGM (Synth Sub Ambient)
// （audio.js によって管理・再生される楽譜データモジュール）
// =========================================================

window.WorldMapBGM = (function() {
    let ctx = null;
    let masterGain = null;
    let isPlaying = false;
    let nextStartTime = 0;
    let scheduleTimer = null;

    const BPM = 125;
    const BEAT = 60 / BPM;         
    const BAR = BEAT * 4;          
    const LOOP_LENGTH = BAR * 16;  

    // --- ベース音源 (シンセ・サブに固定) ---
    function playSubBass(freq, startTime, duration, vol) {
        if (!ctx || !masterGain) return;
        const osc = ctx.createOscillator(); 
        const gain = ctx.createGain();
        osc.type = 'sine'; 
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, startTime); 
        gain.gain.linearRampToValueAtTime(vol * 1.3, startTime + 0.05); 
        gain.gain.setValueAtTime(vol * 1.3, startTime + duration - 0.1); 
        gain.gain.linearRampToValueAtTime(0.001, startTime + duration); 
        
        osc.connect(gain); 
        gain.connect(masterGain);
        osc.start(startTime); 
        osc.stop(startTime + duration);
    }

    // --- その他の伴奏 (ドラムとハープ、パッド) ---
    function playStrongDrum(type, startTime, vol) {
        if (!ctx || !masterGain) return;
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        if (type === 'kick') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(120, startTime); osc.frequency.exponentialRampToValueAtTime(30, startTime + 0.1);
            gain.gain.setValueAtTime(vol, startTime); gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
            osc.connect(gain); gain.connect(masterGain); osc.start(startTime); osc.stop(startTime + 0.2);
        } else if (type === 'snare') {
            const bufferSize = ctx.sampleRate * 0.15; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate); const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1; const noise = ctx.createBufferSource(); noise.buffer = buffer;
            const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 2000; filter.Q.value = 0.5;
            gain.gain.setValueAtTime(vol, startTime); gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
            noise.connect(filter); filter.connect(gain); gain.connect(masterGain); noise.start(startTime); noise.stop(startTime + 0.2);
        }
    }

    function playTimpani(startTime, vol) {
        if (!ctx || !masterGain) return;
        const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(100, startTime); osc.frequency.exponentialRampToValueAtTime(50, startTime + 0.4); 
        const gain = ctx.createGain(); gain.gain.setValueAtTime(vol, startTime); gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
        osc.connect(gain); gain.connect(masterGain); osc.start(startTime); osc.stop(startTime + 0.6);
    }

    function playWoodPercussion(startTime, vol, isHigh) {
        if (!ctx || !masterGain) return;
        const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; 
        if (isHigh) { osc.frequency.setValueAtTime(600, startTime); osc.frequency.exponentialRampToValueAtTime(300, startTime + 0.05); } 
        else { osc.frequency.setValueAtTime(250, startTime); osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.05); }
        gain.gain.setValueAtTime(vol, startTime); gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1); 
        
        const noise = ctx.createBufferSource(); const bufferSize = ctx.sampleRate * 0.05; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate); const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1; noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = isHigh ? 2000 : 800; 
        const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(vol * 0.1, startTime); noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);
        
        noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGain); osc.connect(gain); gain.connect(masterGain);
        osc.start(startTime); osc.stop(startTime + 0.1); noise.start(startTime); noise.stop(startTime + 0.1);
    }

    function playEarthPad(freqs, startTime, duration, vol) {
        if (!ctx || !masterGain) return;
        freqs.forEach(freq => {
            const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = freq;
            const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 350; 
            const gain = ctx.createGain(); gain.gain.setValueAtTime(0, startTime); gain.gain.linearRampToValueAtTime(vol, startTime + 0.5); gain.gain.setValueAtTime(vol, startTime + duration - 0.5); gain.gain.linearRampToValueAtTime(0.001, startTime + duration);
            osc.connect(filter); filter.connect(gain); gain.connect(masterGain); osc.start(startTime); osc.stop(startTime + duration);
        });
    }

    function playSubduedHarp(freq, startTime, vol) {
        if (!ctx || !masterGain) return;
        const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.value = freq;
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(1200, startTime); filter.frequency.exponentialRampToValueAtTime(400, startTime + 0.6);
        gain.gain.setValueAtTime(0, startTime); gain.gain.linearRampToValueAtTime(vol, startTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.0); 
        osc.connect(filter); filter.connect(gain); gain.connect(masterGain); osc.start(startTime); osc.stop(startTime + 1.0);
    }

    // --- 楽曲データ ---
    function scheduleSixteenBars(t) {
        const chords = [
            [174.61, 261.63, 329.63, 440.00], 
            [130.81, 196.00, 261.63, 329.63], 
            [174.61, 261.63, 329.63, 440.00], 
            [130.81, 196.00, 261.63, 329.63], 
            [146.83, 261.63, 349.23, 440.00], 
            [164.81, 246.94, 329.63, 392.00], 
            [174.61, 261.63, 349.23, 440.00], 
            [196.00, 293.66, 392.00, 493.88], 
            
            [174.61, 261.63, 329.63, 440.00], 
            [130.81, 196.00, 261.63, 329.63], 
            [174.61, 261.63, 329.63, 440.00], 
            [130.81, 196.00, 261.63, 329.63], 
            [146.83, 261.63, 349.23, 440.00], 
            [164.81, 246.94, 329.63, 392.00], 
            [174.61, 261.63, 349.23, 440.00], 
            [196.00, 293.66, 392.00, 493.88]  
        ];
        
        const bases = [
            87.31, 65.41, 87.31, 65.41, 73.42, 82.41, 87.31, 98.00, 
            87.31, 65.41, 87.31, 65.41, 73.42, 82.41, 87.31, 98.00  
        ];

        for (let i = 0; i < 16; i++) {
            const barStart = t + i * BAR;
            const isChorus = (i >= 8); 
            
            playEarthPad(chords[i], barStart, BAR, 0.08); 

            for (let j = 0; j < 8; j++) {
                const noteIndex = [0, 1, 2, 3, 1, 2, 3, 2][j];
                playSubduedHarp(chords[i][noteIndex], barStart + j * (BEAT / 2), 0.07); 
            }

            if (!isChorus) {
                for (let j = 0; j < 4; j++) {
                    playSubBass(bases[i], barStart + j * BEAT, BEAT * 0.8, 0.5);
                }
            } else {
                for (let j = 0; j < 8; j++) {
                    playSubBass(bases[i], barStart + j * (BEAT / 2), (BEAT / 2) * 0.8, 0.55);
                }
            }

            if (!isChorus) {
                playStrongDrum('kick', barStart + 0 * BEAT, 0.5);
                playStrongDrum('kick', barStart + 2 * BEAT, 0.5);
                
                for (let j = 0; j < 4; j++) {
                    const beatStart = barStart + j * BEAT;
                    playWoodPercussion(beatStart, 0.1, false); 
                    playWoodPercussion(beatStart + BEAT * 0.5, 0.05, true);  
                    playWoodPercussion(beatStart + BEAT * 0.75, 0.03, true); 
                }
            } else {
                playStrongDrum('kick', barStart + 0 * BEAT, 0.6);
                playStrongDrum('kick', barStart + 2 * BEAT, 0.6);
                playStrongDrum('snare', barStart + 1 * BEAT, 0.35); 
                playStrongDrum('snare', barStart + 3 * BEAT, 0.35); 
                
                playTimpani(barStart + 0 * BEAT, 0.5);
                
                for (let j = 0; j < 4; j++) {
                    const beatStart = barStart + j * BEAT;
                    playWoodPercussion(beatStart + BEAT * 0.25, 0.05, true);
                    playWoodPercussion(beatStart + BEAT * 0.5, 0.08, true);
                    playWoodPercussion(beatStart + BEAT * 0.75, 0.05, true);
                }
            }
        }
    }

    function checkAndSchedule() {
        if (!isPlaying) return;
        if (ctx.currentTime + 0.5 > nextStartTime) {
            if (ctx.currentTime > nextStartTime + LOOP_LENGTH) {
                nextStartTime = ctx.currentTime + 0.1;
            }
            scheduleSixteenBars(nextStartTime);
            nextStartTime += LOOP_LENGTH;
        }
        scheduleTimer = setTimeout(checkAndSchedule, 100);
    }

    return {
        // audio.js からシステム環境を受け取って再生を開始するインターフェース
        start: function(audioCtx, outNode) {
            if (isPlaying) return;
            ctx = audioCtx;
            masterGain = outNode; // audio.js側で用意されたエフェクトノードに直接繋ぐ
            isPlaying = true;
            nextStartTime = ctx.currentTime + 0.1;
            checkAndSchedule();
        },
        
        // 再生スケジュールの停止
        stop: function() {
            if (!isPlaying) return;
            isPlaying = false;
            clearTimeout(scheduleTimer);
            ctx = null;
            masterGain = null;
        }
    };
})();
