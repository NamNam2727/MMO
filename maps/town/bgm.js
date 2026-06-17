// =========================================================
// maps/town/bgm.js
// はじまりの街 BGM: Town Square Waltz (3/4拍子)
// （audio.js によって管理・再生される楽譜データモジュール）
// =========================================================

window.TownBGM = (function() {
    // audio.js から渡される接続先
    let ctx = null;
    let masterGain = null;
    
    let scheduleTimer = null;
    let nextStartTime = 0;
    let currentLoopIndex = 0;

    const BPM = 115;
    const BEAT = 60 / BPM;         
    const BAR = BEAT * 3;          
    const LOOP_LENGTH = BAR * 16;  

    // --- 各楽器の音色定義 ---

    function playLead(freq, startTime, duration, vol, instrumentType) {
        if (!ctx || !masterGain) return;
        if (instrumentType === 'piano') {
            const oscFundamental = ctx.createOscillator(); 
            const oscHarmonic = ctx.createOscillator();    
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            oscFundamental.type = 'sine'; oscHarmonic.type = 'triangle';
            oscFundamental.frequency.value = freq; oscHarmonic.frequency.value = freq;
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(6000, startTime); filter.frequency.exponentialRampToValueAtTime(1200, startTime + 0.3);
            
            gain.gain.setValueAtTime(0, startTime); gain.gain.linearRampToValueAtTime(vol * 1.5, startTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(vol * 0.4, startTime + 0.5); gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); 
            
            oscFundamental.connect(filter); oscHarmonic.connect(filter); filter.connect(gain); gain.connect(masterGain);
            oscFundamental.start(startTime); oscHarmonic.start(startTime);
            oscFundamental.stop(startTime + duration); oscHarmonic.stop(startTime + duration);
        } else if (instrumentType === 'accordion') {
            const osc1 = ctx.createOscillator(); const osc2 = ctx.createOscillator(); 
            osc1.type = 'square'; osc2.type = 'sawtooth'; osc1.frequency.value = freq; osc2.frequency.value = freq; 
            
            const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 3000; 
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, startTime); gain.gain.linearRampToValueAtTime(vol * 0.7, startTime + 0.05);
            gain.gain.setValueAtTime(vol * 0.7, startTime + duration * 0.8); gain.gain.linearRampToValueAtTime(0.001, startTime + duration);
            
            osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(masterGain);
            osc1.start(startTime); osc2.start(startTime); osc1.stop(startTime + duration); osc2.stop(startTime + duration);
        }
    }

    function playPluckChord(freqs, startTime, vol) {
        if (!ctx || !masterGain) return;
        freqs.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(4000, startTime); 
            filter.frequency.exponentialRampToValueAtTime(600, startTime + 0.3);
            
            const timeOffset = startTime + index * 0.015;
            gain.gain.setValueAtTime(0, timeOffset);
            gain.gain.linearRampToValueAtTime(vol, timeOffset + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, timeOffset + 0.6); 
            
            osc.connect(filter); filter.connect(gain); gain.connect(masterGain);
            osc.start(timeOffset); osc.stop(timeOffset + 0.6);
        });
    }

    function playSmoothBass(freq, startTime, vol) {
        if (!ctx || !masterGain) return;
        const osc = ctx.createOscillator();
        const oscHarmonic = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine'; 
        oscHarmonic.type = 'triangle'; 
        osc.frequency.value = freq;
        oscHarmonic.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8); 
        
        const harmonicGain = ctx.createGain();
        harmonicGain.gain.value = 0.3;
        oscHarmonic.connect(harmonicGain);
        harmonicGain.connect(gain);
        osc.connect(gain);
        
        gain.connect(masterGain);
        osc.start(startTime); oscHarmonic.start(startTime);
        osc.stop(startTime + 0.8); oscHarmonic.stop(startTime + 0.8);
    }

    function playPercussion(type, startTime, vol) {
        if (!ctx || !masterGain) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        if (type === 'kick') { 
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, startTime);
            osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.1);
            gain.gain.setValueAtTime(vol, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
            osc.connect(gain); gain.connect(masterGain);
            osc.start(startTime); osc.stop(startTime + 0.2);
        } else if (type === 'snare') { 
            const bufferSize = ctx.sampleRate * 0.1;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass'; filter.frequency.value = 2500;
            gain.gain.setValueAtTime(vol, startTime); gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
            noise.connect(filter); filter.connect(gain); gain.connect(masterGain);
            noise.start(startTime); noise.stop(startTime + 0.15);
        }
    }

    // --- 楽譜データとスケジュール制御 ---

    function scheduleSixteenBars(t, loopIndex) {
        const activeInstrument = (loopIndex % 2 === 0) ? 'piano' : 'accordion';

        const bases = [
            130.81, 174.61, 98.00,  130.81, 110.00, 82.41,  174.61, 98.00,  
            174.61, 98.00,  164.81, 110.00, 146.83, 98.00,  130.81, 130.81  
        ];
        const chords = [
            [261.63, 329.63, 392.00], [261.63, 349.23, 440.00], [293.66, 392.00, 493.88], [261.63, 329.63, 392.00], 
            [261.63, 329.63, 440.00], [246.94, 329.63, 392.00], [261.63, 349.23, 440.00], [293.66, 392.00, 493.88], 
            [261.63, 349.23, 440.00], [293.66, 392.00, 493.88], [246.94, 329.63, 392.00], [261.63, 329.63, 440.00], 
            [261.63, 349.23, 440.00], [293.66, 392.00, 493.88], [261.63, 329.63, 392.00], [261.63, 329.63, 392.00]  
        ];

        const melody = [
            { f: 392.00, t: 0, d: 1.0 }, { f: 523.25, t: 1, d: 1.5 }, { f: 587.33, t: 2.5, d: 0.5 }, 
            { f: 659.25, t: 3, d: 2.0 }, { f: 523.25, t: 5, d: 1.0 }, 
            { f: 587.33, t: 6, d: 1.5 }, { f: 493.88, t: 7.5, d: 0.5 }, { f: 392.00, t: 8, d: 1.0 }, 
            { f: 523.25, t: 9, d: 3.0 }, 
            
            { f: 523.25, t: 12, d: 1.0 }, { f: 659.25, t: 13, d: 1.5 }, { f: 698.46, t: 14.5, d: 0.5 }, 
            { f: 783.99, t: 15, d: 2.0 }, { f: 659.25, t: 17, d: 1.0 }, 
            { f: 880.00, t: 18, d: 1.5 }, { f: 783.99, t: 19.5, d: 0.5 }, { f: 698.46, t: 20, d: 1.0 }, 
            { f: 783.99, t: 21, d: 3.0 }, 
            
            { f: 880.00, t: 24, d: 1.0 }, { f: 1046.50, t: 25, d: 1.5 }, { f: 987.77, t: 26.5, d: 0.5 }, 
            { f: 987.77, t: 27, d: 1.0 }, { f: 783.99, t: 28, d: 2.0 }, 
            { f: 783.99, t: 30, d: 1.0 }, { f: 987.77, t: 31, d: 1.5 }, { f: 880.00, t: 32.5, d: 0.5 }, 
            { f: 880.00, t: 33, d: 1.0 }, { f: 659.25, t: 34, d: 2.0 }, 
            
            { f: 698.46, t: 36, d: 1.0 }, { f: 880.00, t: 37, d: 1.5 }, { f: 783.99, t: 38.5, d: 0.5 }, 
            { f: 587.33, t: 39, d: 2.0 }, { f: 783.99, t: 41, d: 1.0 }, 
            { f: 523.25, t: 42, d: 3.0 }, 
            { f: 523.25, t: 45, d: 2.0 }  
        ];

        for (let i = 0; i < 16; i++) {
            const barStart = t + i * BAR;
            playSmoothBass(bases[i], barStart + 0 * BEAT, 0.45);
            playPercussion('kick', barStart + 0 * BEAT, 0.4);
            playPluckChord(chords[i], barStart + 1 * BEAT, 0.12);
            playPercussion('snare', barStart + 1 * BEAT, 0.05);
            playPluckChord(chords[i], barStart + 2 * BEAT, 0.12);
            playPercussion('snare', barStart + 2 * BEAT, 0.05);
        }

        melody.forEach(note => {
            playLead(note.f, t + note.t * BEAT, note.d * BEAT, 0.16, activeInstrument);
        });
    }

    function checkAndSchedule() {
        if (!ctx) return;
        if (ctx.currentTime + 0.5 > nextStartTime) {
            if (ctx.currentTime > nextStartTime + LOOP_LENGTH) {
                nextStartTime = ctx.currentTime + 0.1;
            }
            scheduleSixteenBars(nextStartTime, currentLoopIndex);
            nextStartTime += LOOP_LENGTH;
            currentLoopIndex++;
        }
        scheduleTimer = setTimeout(checkAndSchedule, 100);
    }

    return {
        // audio.js からシステム環境を受け取って再生を開始するインターフェース
        start: function(audioCtx, outNode) {
            ctx = audioCtx;
            masterGain = outNode;
            currentLoopIndex = 0;
            nextStartTime = ctx.currentTime + 0.1;
            checkAndSchedule();
        },
        
        // 再生スケジュールの停止
        stop: function() {
            clearTimeout(scheduleTimer);
            ctx = null;
            masterGain = null;
        }
    };
})();
