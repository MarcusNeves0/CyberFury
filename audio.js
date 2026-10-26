// --- Áudio com Tone.js ---
// Efeitos sonoros sintetizados na hora. Uso: sfx.play('hit_heavy')

const sfx = (() => {
    // Cadeia final: compressor + limiter para os sons terem "peso" sem estourar
    const limiter = new Tone.Limiter(-1).toDestination();
    const master = new Tone.Compressor(-18, 4).connect(limiter);
    const reverb = new Tone.Reverb({ decay: 1.2, wet: 0.2 }).connect(master);

    // Várias vozes por tipo, usadas em rodízio, para sons poderem se sobrepor
    function pool(size, make) {
        const voices = Array.from({ length: size }, make);
        let i = 0;
        return () => voices[i++ % size];
    }

    // Ruído filtrado: whoosh de golpe, vento, explosão
    const noiseVoice = pool(5, () => {
        const filter = new Tone.Filter(1000, 'bandpass').connect(reverb);
        const synth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.05 } }).connect(filter);
        return { synth, filter };
    });
    // Batida grave: impacto do soco
    const kickVoice = pool(3, () => new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 6, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 } }).connect(master));
    // Metal: lâminas e bloqueio
    const metalVoice = pool(3, () => new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.15, release: 0.05 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).connect(reverb));
    // Tons: choques elétricos e efeitos
    const toneVoice = pool(3, () => new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.05 } }).connect(master));

    function whoosh(t, from, to, dur, vol, q = 1) {
        const v = noiseVoice();
        v.synth.volume.value = vol;
        v.synth.envelope.decay = dur;
        v.filter.Q.value = q;
        v.filter.frequency.cancelScheduledValues(t);
        v.filter.frequency.setValueAtTime(from, t);
        v.filter.frequency.exponentialRampToValueAtTime(to, t + dur);
        v.synth.triggerAttackRelease(dur, t);
    }

    function thump(t, note, vol, decay = 0.25) {
        const k = kickVoice();
        k.volume.value = vol;
        k.envelope.decay = decay;
        k.triggerAttackRelease(note, decay, t);
    }

    function clang(t, freq, vol, decay = 0.15) {
        const m = metalVoice();
        m.volume.value = vol;
        m.envelope.decay = decay;
        m.triggerAttackRelease(freq, decay, t);
    }

    function zap(t, from, to, dur, vol, type = 'square') {
        const s = toneVoice();
        s.oscillator.type = type;
        s.volume.value = vol;
        s.envelope.decay = dur;
        s.triggerAttackRelease(from, dur, t);
        s.frequency.exponentialRampToValueAtTime(to, t + dur);
    }

    const library = {
        // Golpes no ar
        swing: t => whoosh(t, 3000, 800, 0.12, -18, 0.8),
        swing_heavy: t => whoosh(t, 1500, 300, 0.25, -14, 0.8),
        blade_swing: t => whoosh(t, 6000, 2000, 0.15, -16, 1.5),

        // Acertos
        hit: t => { thump(t, 'C2', -6, 0.15); whoosh(t, 2500, 1000, 0.05, -10, 0.5); },
        hit_heavy: t => { thump(t, 'G1', -2, 0.35); whoosh(t, 1800, 300, 0.15, -8, 0.5); },
        blade_hit: t => { clang(t, 600, -14, 0.12); whoosh(t, 5000, 3000, 0.06, -12); },
        block: t => { clang(t, 250, -12, 0.08); thump(t, 'E2', -12, 0.08); },
        defense_break: t => { clang(t, 180, -6, 0.5); zap(t, 600, 80, 0.4, -14, 'sawtooth'); thump(t, 'C1', -4, 0.4); },
        explosion: t => { thump(t, 'A0', 0, 0.8); whoosh(t, 2000, 100, 1, -4, 0.3); },
        ko: t => { thump(t, 'A0', 0, 1.2); whoosh(t, 1200, 60, 1.5, -6, 0.3); },

        // Especiais
        titan_special: t => { whoosh(t, 400, 4000, 0.5, -10, 0.7); zap(t, 80, 300, 0.5, -18, 'sawtooth'); },
        hades_special: t => { thump(t, 'A0', 0, 0.6); whoosh(t, 800, 150, 0.8, -6, 0.4); },
        jack_special: t => { zap(t, 700, 90, 0.7, -16, 'sawtooth'); zap(t + 0.05, 705, 95, 0.7, -18, 'triangle'); },
        genji_special: t => { whoosh(t, 300, 3000, 0.4, -10, 2); whoosh(t + 0.4, 3000, 500, 0.5, -12, 2); },
        ryu_special: t => { thump(t, 'D1', -4, 0.3); whoosh(t, 500, 5000, 0.4, -10, 0.7); },
        spark_zap: t => { zap(t, 1200 + Math.random() * 1200, 200, 0.06, -22); whoosh(t, 8000, 4000, 0.04, -22); },
        lorenzo_kick: t => { thump(t, 'E2', -8, 0.1); whoosh(t, 4000, 1500, 0.03, -14, 0.5); },
        lorenzo_special: t => zap(t, 500, 1000, 0.12, -18, 'triangle'),
        malenia_special: t => { for (let i = 0; i < 3; i++) { whoosh(t + i * 0.08, 7000, 2500, 0.1, -14, 1.5); } clang(t, 900, -16, 0.3); },
        maliketh_special: t => { thump(t, 'B0', -2, 0.5); clang(t, 150, -10, 0.6); },
        kayn_special: t => { whoosh(t, 200, 2500, 0.4, -8, 1.5); zap(t, 300, 60, 0.4, -16, 'sawtooth'); },
        kayn_exit: t => { clang(t, 400, -8, 0.3); whoosh(t, 6000, 800, 0.25, -6, 1); thump(t, 'C1', -2, 0.4); },
        heal: t => { zap(t, 880, 1320, 0.15, -20, 'sine'); zap(t + 0.08, 1320, 1760, 0.18, -22, 'sine'); },
        celestia_special: t => { zap(t, 400, 1600, 0.8, -14, 'triangle'); whoosh(t, 2000, 8000, 0.8, -16, 0.5); zap(t + 0.2, 1046, 1568, 0.5, -20, 'sine'); },
        flora_special: t => { whoosh(t, 3000, 1500, 0.2, -16, 2); zap(t, 600, 900, 0.15, -20, 'sine'); },
        kayn_transform: t => { thump(t, 'A0', -2, 1); zap(t, 100, 900, 0.8, -12, 'sawtooth'); whoosh(t, 300, 6000, 0.9, -8, 0.8); },
    };

    return {
        // Volume geral de 0 a 1 (0 = mudo)
        setVolume(level) {
            Tone.Destination.mute = level <= 0;
            if (level > 0) Tone.Destination.volume.value = Tone.gainToDb(level);
        },
        play(name) {
            if (Tone.context.state !== 'running' || !library[name]) return;
            try {
                library[name](Tone.now() + 0.01);
            } catch (e) {
                // Um som falhar nunca deve travar o jogo
                console.warn(`Som "${name}" falhou:`, e);
            }
        }
    };
})();
