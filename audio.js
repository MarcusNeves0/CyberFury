// --- Áudio ---
// Uso: sfx.play('hit_heavy'). Cada som pode ter uma versão gravada (arquivos em sounds/sfx, de Kenney.nl,
// StarNinjas e kurt, licença CC0) e uma sintetizada na hora com Tone.js. Com os sons gravados ligados, toca a gravação
// (e, nos marcados com synth, a síntese por cima, que dá o "sabor" do personagem); sem gravação, ou com eles
// desligados, toca só a síntese.

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
        kaze_special: t => { whoosh(t, 300, 3000, 0.4, -10, 2); whoosh(t + 0.4, 3000, 500, 0.5, -12, 2); },
        kenji_special: t => { thump(t, 'D1', -4, 0.3); whoosh(t, 500, 5000, 0.4, -10, 0.7); },
        spark_zap: t => { zap(t, 1200 + Math.random() * 1200, 200, 0.06, -22); whoosh(t, 8000, 4000, 0.04, -22); },
        craque_kick: t => { thump(t, 'E2', -8, 0.1); whoosh(t, 4000, 1500, 0.03, -14, 0.5); },
        craque_special: t => zap(t, 500, 1000, 0.12, -18, 'triangle'),
        akane_special: t => { for (let i = 0; i < 3; i++) { whoosh(t + i * 0.08, 7000, 2500, 0.1, -14, 1.5); } clang(t, 900, -16, 0.3); },
        fenris_special: t => { thump(t, 'B0', -2, 0.5); clang(t, 150, -10, 0.6); },
        zarek_special: t => { whoosh(t, 200, 2500, 0.4, -8, 1.5); zap(t, 300, 60, 0.4, -16, 'sawtooth'); },
        zarek_exit: t => { clang(t, 400, -8, 0.3); whoosh(t, 6000, 800, 0.25, -6, 1); thump(t, 'C1', -2, 0.4); },
        heal: t => { zap(t, 880, 1320, 0.15, -20, 'sine'); zap(t + 0.08, 1320, 1760, 0.18, -22, 'sine'); },
        celestia_special: t => { zap(t, 400, 1600, 0.8, -14, 'triangle'); whoosh(t, 2000, 8000, 0.8, -16, 0.5); zap(t + 0.2, 1046, 1568, 0.5, -20, 'sine'); },
        flora_special: t => { whoosh(t, 3000, 1500, 0.2, -16, 2); zap(t, 600, 900, 0.15, -20, 'sine'); },
        nyx_special: t => { zap(t, 220, 70, 0.6, -12, 'sawtooth'); whoosh(t, 400, 3000, 0.5, -12, 1.5); zap(t + 0.1, 880, 440, 0.4, -20, 'sine'); },
        mamba_shot: t => { zap(t, 1800, 400, 0.08, -18, 'square'); whoosh(t, 7000, 2000, 0.06, -20, 1); },
        mamba_special: t => { whoosh(t, 1200, 5000, 1.0, -8, 0.6); whoosh(t + 0.15, 4000, 900, 0.8, -12, 0.8); zap(t, 180, 90, 0.6, -18, 'sawtooth'); },
        gear_shot: t => { clang(t, 900, -24, 0.04); whoosh(t, 5000, 3000, 0.03, -22, 1); },
        gear_special: t => { clang(t, 300, -12, 0.2); thump(t, 'E2', -10, 0.15); zap(t + 0.1, 400, 1200, 0.2, -18, 'square'); },
        turret_shot: t => zap(t, 1400, 700, 0.05, -24, 'square'),
        pistol_shot: t => { zap(t, 2400, 1100, 0.05, -24, 'square'); whoosh(t, 6000, 3000, 0.03, -26, 1); },
        roxy_special: t => { for (let i = 0; i < 4; i++) zap(t + i * 0.06, 500 * (i + 1), 900 * (i + 1), 0.08, -18, 'square'); whoosh(t, 800, 6000, 0.4, -14, 0.8); },
        web_shot: t => { whoosh(t, 3500, 1200, 0.12, -14, 2); zap(t, 700, 350, 0.08, -24, 'triangle'); },
        spider_sense: t => { zap(t, 1500, 1500, 0.05, -20, 'sine'); zap(t + 0.06, 2000, 2000, 0.05, -20, 'sine'); },
        weaver_special: t => { whoosh(t, 5000, 800, 0.25, -10, 2); zap(t + 0.05, 300, 120, 0.3, -16, 'sawtooth'); },
        aegis_special: t => { zap(t, 120, 480, 0.5, -12, 'sawtooth'); whoosh(t, 600, 3000, 0.5, -12, 1.2); clang(t + 0.1, 220, -14, 0.4); },
        rhino_special: t => { thump(t, 'C1', -2, 0.5); whoosh(t, 300, 1800, 0.7, -8, 0.6); thump(t + 0.25, 'C1', -6, 0.3); },
        anchor_special: t => { clang(t, 320, -10, 0.3); whoosh(t, 1200, 4000, 0.35, -12, 1.5); for (let i = 0; i < 4; i++) clang(t + 0.08 + i * 0.05, 900 + i * 120, -22, 0.05); },
        thunder: t => { thump(t, 'A0', -4, 1.4); whoosh(t, 400, 60, 2.2, -8, 0.3); whoosh(t + 0.3, 900, 80, 1.6, -14, 0.4); },
        buzz: t => { for (let i = 0; i < 6; i++) zap(t + i * 0.07, 120 + Math.random() * 40, 90, 0.06, -22, 'sawtooth'); },
        laser: t => { zap(t, 1800, 2400, 0.9, -24, 'sine'); zap(t + 0.1, 900, 1200, 0.8, -26, 'square'); },
        chomp: t => { thump(t, 'E2', -8, 0.12); clang(t, 500, -20, 0.05); whoosh(t, 2500, 600, 0.08, -16, 1); },
        // Masmorra Dupla: pedra raspando (estátua erguendo a maça), a maça batendo e o colosso abrindo os olhos
        statue_raise: t => { for (let i = 0; i < 5; i++) zap(t + i * 0.08, 60 + Math.random() * 30, 45, 0.09, -18, 'sawtooth'); whoosh(t, 300, 900, 0.5, -20, 0.5); },
        stone_slam: t => { thump(t, 'A0', 0, 0.7); clang(t, 180, -10, 0.3); whoosh(t, 1800, 120, 0.7, -6, 0.5); },
        colossus_gaze: t => { zap(t, 55, 70, 1.4, -8, 'sawtooth'); thump(t, 'C1', -4, 1); zap(t + 0.4, 440, 880, 0.9, -22, 'sine'); },
        glass: t => { clang(t, 2400, -14, 0.15); clang(t + 0.03, 3200, -18, 0.2); whoosh(t, 8000, 3000, 0.2, -16, 2); },
        // Menus
        menu_move: t => clang(t, 2200, -30, 0.03),
        menu_confirm: t => { zap(t, 660, 990, 0.08, -18, 'square'); zap(t + 0.07, 990, 1320, 0.12, -18, 'square'); thump(t, 'C2', -14, 0.12); },

        // Capitã Sina
        sina_special: t => { for (let i = 0; i < 3; i++) clang(t + i * 0.05, 1800 + i * 400, -22, 0.08); whoosh(t, 900, 4000, 0.3, -16, 1); },
        sina_tick: t => clang(t, 2600, -28, 0.03),
        sina_parrot: t => { zap(t, 1800, 2600, 0.09, -20, 'sawtooth'); zap(t + 0.11, 2200, 1500, 0.12, -20, 'sawtooth'); },
        sina_shark: t => { whoosh(t, 600, 2500, 0.4, -10, 1); thump(t, 'G1', -8, 0.2); },
        sina_boat_warning: t => { whoosh(t, 200, 1200, 0.8, -10, 0.6); zap(t, 110, 220, 0.8, -22, 'sine'); },
        sina_boat: t => { thump(t, 'A0', 0, 0.9); whoosh(t, 3000, 200, 1.2, -4, 0.4); whoosh(t + 0.1, 6000, 1500, 0.8, -10, 0.6); },
        // Coleone: tênis cantando na quadra, agarrão e a enterrada com a rede
        coleone_special: t => { zap(t, 1900, 2600, 0.07, -18, 'sine'); zap(t + 0.09, 2100, 2900, 0.07, -18, 'sine'); whoosh(t, 500, 2500, 0.3, -12, 0.8); },
        coleone_grab: t => { thump(t, 'D2', -6, 0.15); whoosh(t + 0.05, 300, 3000, 0.6, -10, 0.7); },
        coleone_dunk: t => { thump(t, 'A0', 0, 0.8); clang(t, 260, -10, 0.4); whoosh(t, 2500, 150, 0.9, -4, 0.4); whoosh(t + 0.15, 7000, 3500, 0.35, -14, 2); },
        // Bershow: placas da armadura fechando (metal pesado) e o Corte Devastador
        bershow_armor: t => { for (let i = 0; i < 4; i++) clang(t + i * 0.09, 140 + i * 35, -8, 0.25); thump(t + 0.38, 'C1', -4, 0.4); zap(t + 0.3, 90, 40, 0.5, -16, 'sawtooth'); },
        bershow_slash: t => { whoosh(t, 400, 6000, 0.25, -4, 1.2); clang(t, 500, -10, 0.4); thump(t + 0.05, 'A0', -2, 0.6); whoosh(t + 0.1, 3000, 200, 0.6, -8, 0.5); },
        // Aspas the Darkness: passo na sombra e o exército saindo do chão
        aspas_step: t => { whoosh(t, 5000, 600, 0.18, -10, 2); zap(t, 400, 120, 0.15, -20, 'sine'); },
        aspas_army: t => { thump(t, 'A0', -4, 0.7); zap(t, 70, 140, 0.9, -12, 'sawtooth'); whoosh(t, 200, 2400, 0.9, -8, 0.8); zap(t + 0.2, 220, 110, 0.7, -18, 'triangle'); },
        // Cangeras: o tribunal abrindo (órgão grave) e a martelada seca na madeira
        court_open: t => { zap(t, 65, 65, 1.2, -10, 'sawtooth'); zap(t, 98, 98, 1.2, -14, 'sawtooth'); thump(t, 'C1', -4, 0.8); whoosh(t, 200, 1200, 0.8, -14, 0.5); },
        gavel: t => { thump(t, 'G2', -2, 0.12); clang(t, 900, -8, 0.06); clang(t, 1500, -16, 0.04); whoosh(t, 4000, 1500, 0.05, -18, 2); },
        // Locutor: tranco grave com um brilho subindo (chamada comum) e um impacto maior (abates em sequência, K.O.)
        announce: t => { thump(t, 'C2', -6, 0.25); zap(t, 400, 1600, 0.25, -18, 'square'); },
        announce_big: t => { thump(t, 'A0', -2, 0.6); clang(t, 220, -10, 0.3); zap(t, 200, 1800, 0.45, -14, 'sawtooth'); whoosh(t, 300, 5000, 0.5, -12, 0.8); },
        // Kairo: o quickhack travando (bipes de dados), o choque de pane e a fenda abrindo (grave rasgando + chiado)
        // Vex: o mundo desacelerando (grave descendo), voltando ao normal (estalo subindo) e o passo fantasma
        vex_special: t => { zap(t, 900, 60, 0.9, -10, 'sawtooth'); whoosh(t, 6000, 200, 1.0, -10, 1.5); thump(t + 0.05, 'C1', -4, 0.8); },
        vex_drive_end: t => { zap(t, 80, 1400, 0.3, -12, 'sawtooth'); whoosh(t, 300, 7000, 0.3, -12, 1.2); clang(t + 0.28, 1800, -20, 0.08); },
        vex_step: t => { whoosh(t, 8000, 1500, 0.12, -10, 2); zap(t, 2400, 600, 0.08, -22, 'square'); },
        kairo_hack: t => { for (let i = 0; i < 4; i++) zap(t + i * 0.045, 1800 + i * 400, 1200 + i * 300, 0.04, -22, 'square'); zap(t + 0.2, 300, 1600, 0.25, -18, 'sawtooth'); },
        kairo_pane: t => { zap(t, 2200, 120, 0.18, -14, 'sawtooth'); whoosh(t, 9000, 2000, 0.12, -14, 3); thump(t, 'E1', -6, 0.2); },
        kairo_special: t => { zap(t, 40, 160, 1.2, -8, 'sawtooth'); thump(t, 'A0', -2, 1.2); whoosh(t, 100, 6000, 1.0, -8, 1.2); for (let i = 0; i < 6; i++) zap(t + 0.3 + i * 0.09, 400 + Math.random() * 2000, 90, 0.07, -18, 'square'); },
        zarek_transform: t => { thump(t, 'A0', -2, 1); zap(t, 100, 900, 0.8, -12, 'sawtooth'); whoosh(t, 300, 6000, 0.9, -8, 0.8); },
    };

    // --- Sons gravados ---
    // Quantas variações cada som tem (sounds/sfx/<nome>_<n>.ogg); cada vez sai uma, sorteada
    const VARIANTS = {
        punch: 5, punch_heavy: 5, thud: 3, thud_heavy: 3, swish: 4, clash: 3, slice: 3, shield: 4, plate: 2,
        metal: 3, metal_heavy: 3, bell: 1, glass: 3, wood: 2, rock: 2, boom: 3, lowboom: 2, field: 3, laser: 3,
        laser_small: 3, blaster: 3, pistol: 4, rifle: 3,
    };
    // f: qual som, v: volume (0 a 1), d: atraso em segundos
    const S = (f, v, d = 0) => ({ f, v, d });
    const RECORDED = {
        hit: [S('punch', 0.45)],
        hit_heavy: [S('punch_heavy', 0.7)],
        blade_swing: [S('swish', 0.3)],
        blade_hit: [S('slice', 0.5), S('punch', 0.25)],
        block: [S('shield', 0.4)],
        defense_break: { layers: [S('plate', 0.7), S('bell', 0.35, 0.02)], synth: true },
        explosion: [S('boom', 0.6), S('lowboom', 0.6)],
        ko: [S('lowboom', 0.7), S('punch_heavy', 0.6)],
        glass: [S('glass', 0.6)],
        // Especiais
        titan_special: { layers: [S('field', 0.4)], synth: true },
        hades_special: [S('boom', 0.45), S('lowboom', 0.4)],
        kaze_special: { layers: [S('swish', 0.4), S('swish', 0.35, 0.12), S('swish', 0.3, 0.26)], synth: true },
        kenji_special: { layers: [S('punch_heavy', 0.6), S('boom', 0.35)], synth: true },
        craque_kick: [S('thud', 0.55)],
        akane_special: [S('swish', 0.4), S('clash', 0.35, 0.05), S('swish', 0.35, 0.08), S('swish', 0.3, 0.16)],
        fenris_special: { layers: [S('thud_heavy', 0.6), S('clash', 0.3)], synth: true },
        zarek_exit: { layers: [S('slice', 0.5), S('punch_heavy', 0.6)], synth: true },
        zarek_transform: { layers: [S('field', 0.45), S('lowboom', 0.4)], synth: true },
        celestia_special: { layers: [S('field', 0.3)], synth: true },
        // Tiros: disparos de verdade (pistola e revólver), com um tranco grave por baixo para ter corpo
        gear_shot: [S('metal_heavy', 0.45), S('thud', 0.35)], // pistola de pregos: pancada seca de metal
        mamba_shot: { layers: [S('rifle', 0.95), S('thud_heavy', 0.25)], synth: true }, // rifle + o chiado tóxico
        gear_special: { layers: [S('metal_heavy', 0.5)], synth: true },
        turret_shot: [S('pistol', 0.45)],
        pistol_shot: [S('pistol', 0.9), S('thud', 0.2)],
        roxy_special: { layers: [S('pistol', 0.8), S('pistol', 0.7, 0.07), S('pistol', 0.6, 0.14)], synth: true },
        laser: [S('laser', 0.4)],
        aegis_special: { layers: [S('field', 0.55)], synth: true },
        rhino_special: { layers: [S('thud_heavy', 0.8), S('thud_heavy', 0.5, 0.25)], synth: true },
        anchor_special: { layers: [S('metal_heavy', 0.5)], synth: true },
        thunder: [S('lowboom', 0.8), S('boom', 0.35, 0.05)],
        chomp: { layers: [S('punch', 0.35)], synth: true },
        // Mapas
        statue_raise: { layers: [S('rock', 0.4)], synth: true },
        stone_slam: [S('lowboom', 0.6), S('rock', 0.6)],
        sina_shark: { layers: [S('thud_heavy', 0.4)], synth: true },
        sina_boat: [S('boom', 0.6), S('lowboom', 0.6)],
        coleone_grab: { layers: [S('thud', 0.5)], synth: true },
        coleone_dunk: [S('plate', 0.5), S('punch_heavy', 0.7), S('lowboom', 0.45)],
        bershow_armor: [S('plate', 0.5), S('plate', 0.5, 0.12), S('plate', 0.5, 0.24), S('punch_heavy', 0.55, 0.38)],
        bershow_slash: { layers: [S('clash', 0.5), S('punch_heavy', 0.6, 0.05)], synth: true },
        aspas_army: { layers: [S('lowboom', 0.5)], synth: true },
        gavel: [S('wood', 0.8)],
        announce: { layers: [S('punch_heavy', 0.35)], synth: true },
        vex_special: { layers: [S('field', 0.5), S('lowboom', 0.4)], synth: true },
        vex_drive_end: { layers: [S('blaster', 0.3)], synth: true },
        vex_step: { layers: [S('swish', 0.45)], synth: true },
        kairo_hack: { layers: [S('laser_small', 0.25)], synth: true },
        kairo_pane: { layers: [S('blaster', 0.35), S('punch', 0.4)], synth: true },
        kairo_special: { layers: [S('field', 0.55), S('lowboom', 0.6), S('laser', 0.3, 0.25)], synth: true },
        announce_big: { layers: [S('lowboom', 0.5)], synth: true },
    };

    // Cada arquivo ganha até 4 cópias (criadas só quando o mesmo som se sobrepõe), tocando em rodízio
    const COPIES = 4;
    const clips = {};
    const broken = new Set(); // arquivo que não carregou: o som volta para a síntese
    function newCopy(file) {
        const a = new Audio(`sounds/sfx/${file}.ogg`);
        a.preload = 'auto';
        a.preservesPitch = false; // a pequena variação de velocidade muda o tom, como deve ser
        a.addEventListener('error', () => broken.add(file));
        return a;
    }
    function clip(file) {
        const list = clips[file] || (clips[file] = Object.assign([newCopy(file)], { next: 0 }));
        const free = list.find(a => a.paused || a.ended);
        if (free) return free;
        if (list.length < COPIES) { const a = newCopy(file); list.push(a); return a; }
        return list[list.next++ % COPIES]; // todas tocando: corta a mais antiga
    }
    function playLayer(layer, level) {
        const n = VARIANTS[layer.f] || 1;
        const file = `${layer.f}_${Math.floor(Math.random() * n)}`;
        if (broken.has(file)) return false;
        const go = () => {
            const a = clip(file);
            a.volume = Math.min(1, layer.v * level);
            a.playbackRate = 0.94 + Math.random() * 0.12;
            a.currentTime = 0;
            a.play().catch(() => {}); // sem permissão de tocar ainda (nenhum clique na página)
        };
        if (layer.d > 0) setTimeout(go, layer.d * 1000); else go();
        return true;
    }
    // Carrega todos os arquivos de uma vez (uns 450 KB), para o primeiro golpe já sair com som
    function preload() {
        if (typeof Audio === 'undefined') return;
        for (const [f, n] of Object.entries(VARIANTS)) for (let i = 0; i < n; i++) clip(`${f}_${i}`);
    }

    return {
        level: 1, // volume atual (o locutor usa para a voz e para ficar quieto no mudo)
        recorded: true, // sons gravados ligados (false: só os sintetizados, como era antes)
        preload,
        // Volume geral de 0 a 1 (0 = mudo)
        setVolume(level) {
            this.level = level;
            Tone.Destination.mute = level <= 0;
            if (level > 0) Tone.Destination.volume.value = Tone.gainToDb(level);
        },
        play(name) {
            let synth = true;
            const rec = this.recorded && this.level > 0 && typeof Audio !== 'undefined' && RECORDED[name];
            if (rec) {
                const layers = Array.isArray(rec) ? rec : rec.layers;
                let ok = true;
                try { for (const l of layers) ok = playLayer(l, this.level) && ok; } catch (e) { ok = false; }
                synth = !ok || !!rec.synth;
            }
            if (!synth || Tone.context.state !== 'running' || !library[name]) return;
            try {
                library[name](Tone.now() + 0.01);
            } catch (e) {
                // Um som falhar nunca deve travar o jogo
                console.warn(`Som "${name}" falhou:`, e);
            }
        }
    };
})();
