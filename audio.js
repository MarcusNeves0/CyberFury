// --- Áudio com Tone.js ---
const sounds = {
    spark: {
        punch: new Tone.PolySynth(Tone.Synth, { maxPolyphony: 4, options: { volume: -12, oscillator: { type: 'fmsquare' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } } }).toDestination(),
        strong_punch: new Tone.PolySynth(Tone.Synth, { maxPolyphony: 4, options: { oscillator: { type: 'fmsquare' }, volume: -10, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 } } }).toDestination(),
        special: new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.01 } }).toDestination(),
    },
    titan: {
        punch: new Tone.PolySynth(Tone.MembraneSynth, { maxPolyphony: 4, options: { volume: -10, pitchDecay: 0.05, octaves: 10, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: 'exponential' } } }).toDestination(),
        strong_punch: new Tone.PolySynth(Tone.MembraneSynth, { maxPolyphony: 4, options: { volume: -8, pitchDecay: 0.1, octaves: 8, envelope: { attack: 0.01, decay: 0.5, sustain: 0.02, release: 1.4, attackCurve: 'exponential' } } }).toDestination(),
        special: new Tone.PolySynth(Tone.NoiseSynth, { maxPolyphony: 2, options: { volume: -10, noise: { type: 'white' }, envelope: { attack: 0.1, decay: 0.5, sustain: 0.2, release: 0.3 } } }).toDestination(),
    },
    hades: {
        punch: new Tone.PolySynth(Tone.FMSynth, { maxPolyphony: 4, options: { volume: -12, harmonicity: 1.5, modulationIndex: 2, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 } } }).toDestination(),
        strong_punch: new Tone.PolySynth(Tone.FMSynth, { maxPolyphony: 4, options: { volume: -10, harmonicity: 2, modulationIndex: 5, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 } } }).toDestination(),
        special: new Tone.PolySynth(Tone.NoiseSynth, { maxPolyphony: 2, options: { noise: { type: 'brown' }, volume: -8, envelope: { attack: 0.05, decay: 0.4, sustain: 0.1, release: 0.3 } } }).toDestination(),
    },
    jack: {
        punch: new Tone.PolySynth(Tone.AMSynth, { maxPolyphony: 4, options: { volume: -12, harmonicity: 1.2, envelope: { attack: 0.05, decay: 0.3, sustain: 0, release: 0.1 } } }).toDestination(),
        strong_punch: new Tone.PolySynth(Tone.AMSynth, { maxPolyphony: 4, options: { volume: -10, harmonicity: 1.5, envelope: { attack: 0.05, decay: 0.5, sustain: 0, release: 0.2 } } }).toDestination(),
        special: new Tone.PolySynth(Tone.Synth, { maxPolyphony: 2, options: { oscillator: { type: 'sawtooth' }, volume: -8, envelope: { attack: 0.1, decay: 0.5, sustain: 0.2, release: 0.4 } } }).toDestination(),
    },
    genji: {
        punch: new Tone.PolySynth(Tone.PluckSynth, { maxPolyphony: 4, options: { volume: -10, attackNoise: 0.5, dampening: 2000, resonance: 0.9 } }).toDestination(),
        strong_punch: new Tone.PolySynth(Tone.PluckSynth, { maxPolyphony: 4, options: { volume: -8, attackNoise: 1, dampening: 1500, resonance: 0.95 } }).toDestination(),
        special: new Tone.PolySynth(Tone.NoiseSynth, { maxPolyphony: 2, options: { noise: { type: 'white' }, volume: -6, envelope: { attack: 0.2, decay: 1.0, sustain: 0, release: 0.5 } } }).toDestination(),
    },
    ryu: {
        punch: new Tone.PolySynth(Tone.Synth, { maxPolyphony: 8, options: { volume: -14, oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } } }).toDestination(),
        strong_punch: new Tone.PolySynth(Tone.Synth, { maxPolyphony: 4, options: { volume: -10, oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 } } }).toDestination(),
        special: new Tone.PolySynth(Tone.NoiseSynth, { maxPolyphony: 2, options: { noise: { type: "white" }, volume: -8, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 } } }).toDestination(),
    },
    defenseBreak: new Tone.PolySynth(Tone.Synth, { maxPolyphony: 1, options: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.1 } } }).toDestination(),
};

sounds.spark.special.volume.value = -15;
