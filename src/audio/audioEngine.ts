import type { AlarmSoundId, NoiseId } from '../types'

interface Layer {
  gain: GainNode
  nodes: AudioNode[]
  timer?: number
}

/**
 * Web Audio engine. Everything (ambient sounds, ticking, alarms) is synthesised
 * at runtime, so the app ships with zero audio assets and works fully offline.
 *
 * Ambient sounds are layered: several can play and mix at once, each with its
 * own volume. Must be (re)started from a user gesture (the Start button).
 */
class AudioEngine {
  private ctx: AudioContext | null = null

  // ambient sound layers (id -> nodes)
  private layers = new Map<NoiseId, Layer>()

  // ticking
  private tickGain: GainNode | null = null
  private tickTimer: number | null = null
  private tickVolume = 0.4

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      this.ctx = new Ctor()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /** Call from a user gesture to unlock audio playback. */
  unlock(): void {
    this.ensure()
  }

  // --------------------------------------------------------------------------
  // Noise buffers
  // --------------------------------------------------------------------------

  private makeBuffer(color: 'white' | 'pink' | 'brown'): AudioBuffer {
    const ctx = this.ensure()
    const length = ctx.sampleRate * 3
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    if (color === 'white') {
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    } else if (color === 'pink') {
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.969 * b2 + white * 0.153852
        b3 = 0.8665 * b3 + white * 0.3104856
        b4 = 0.55 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.016898
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926
      }
    } else {
      let last = 0
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.5
      }
    }
    return buffer
  }

  private loopSource(color: 'white' | 'pink' | 'brown'): AudioBufferSourceNode {
    const ctx = this.ensure()
    const src = ctx.createBufferSource()
    src.buffer = this.makeBuffer(color)
    src.loop = true
    return src
  }

  // --------------------------------------------------------------------------
  // Ambient sound mixing
  // --------------------------------------------------------------------------

  /** Make the playing layers match `mix` exactly (add / remove / re-level). */
  setMix(mix: Partial<Record<NoiseId, number>>): void {
    for (const id of [...this.layers.keys()]) {
      const v = mix[id]
      if (v == null || v <= 0) this.removeLayer(id)
    }
    for (const key of Object.keys(mix) as NoiseId[]) {
      const v = mix[key]
      if (key === 'none' || v == null || v <= 0) continue
      if (this.layers.has(key)) this.setLayerVolume(key, v)
      else {
        this.ensure()
        this.layers.set(key, this.buildLayer(key, v))
      }
    }
  }

  setLayerVolume(id: NoiseId, volume: number): void {
    const layer = this.layers.get(id)
    if (layer && this.ctx) {
      layer.gain.gain.setTargetAtTime(volume * 0.6, this.ctx.currentTime, 0.05)
    }
  }

  private removeLayer(id: NoiseId): void {
    const layer = this.layers.get(id)
    if (!layer) return
    if (layer.timer != null) clearInterval(layer.timer)
    for (const n of layer.nodes) {
      try {
        if ('stop' in n) (n as AudioScheduledSourceNode).stop()
      } catch {
        /* already stopped */
      }
      try {
        n.disconnect()
      } catch {
        /* noop */
      }
    }
    try {
      layer.gain.disconnect()
    } catch {
      /* noop */
    }
    this.layers.delete(id)
  }

  stopNoise(): void {
    for (const id of [...this.layers.keys()]) this.removeLayer(id)
  }

  /** Gently ramp every layer to silence over `seconds`, then stop. */
  fadeOutNoise(seconds = 4): void {
    if (!this.ctx || this.layers.size === 0) return
    const t = this.ctx.currentTime
    for (const layer of this.layers.values()) {
      const g = layer.gain.gain
      g.cancelScheduledValues(t)
      g.setValueAtTime(Math.max(0.0001, g.value), t)
      g.linearRampToValueAtTime(0.0001, t + seconds)
    }
    window.setTimeout(() => this.stopNoise(), seconds * 1000 + 120)
  }

  private buildLayer(id: NoiseId, volume: number): Layer {
    const ctx = this.ensure()
    const gain = ctx.createGain()
    gain.gain.value = volume * 0.6
    gain.connect(ctx.destination)
    const nodes: AudioNode[] = []
    const track = <T extends AudioNode>(n: T): T => {
      nodes.push(n)
      return n
    }
    const layer: Layer = { gain, nodes }

    const connectBuffer = (
      color: 'white' | 'pink' | 'brown',
      filters: AudioNode[],
    ) => {
      const src = track(this.loopSource(color))
      let tail: AudioNode = src
      for (const f of filters) {
        tail.connect(f)
        tail = track(f)
      }
      tail.connect(gain)
      src.start()
    }

    switch (id) {
      case 'rain': {
        const hp = ctx.createBiquadFilter()
        hp.type = 'highpass'
        hp.frequency.value = 900
        connectBuffer('white', [hp])
        break
      }
      case 'ocean': {
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 550
        connectBuffer('brown', [lp])
        const lfo = track(ctx.createOscillator())
        lfo.frequency.value = 0.12
        const lfoGain = track(ctx.createGain())
        lfoGain.gain.value = volume * 0.35
        lfo.connect(lfoGain)
        lfoGain.connect(gain.gain)
        lfo.start()
        break
      }
      case 'fire': {
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 800
        connectBuffer('brown', [lp])
        layer.timer = this.crackleTimer(gain, () => volume)
        break
      }
      case 'stream': {
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = 1100
        bp.Q.value = 0.7
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 3200
        connectBuffer('white', [bp, lp])
        // babbling: slowly wobble the band centre
        const lfo = track(ctx.createOscillator())
        lfo.frequency.value = 0.4
        const lfoGain = track(ctx.createGain())
        lfoGain.gain.value = 350
        lfo.connect(lfoGain)
        lfoGain.connect(bp.frequency)
        lfo.start()
        break
      }
      case 'birds': {
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 1200
        // soft wind bed (quiet)
        const bed = track(this.loopSource('pink'))
        const bedGain = track(ctx.createGain())
        bedGain.gain.value = 0.28
        bed.connect(lp)
        lp.connect(bedGain)
        bedGain.connect(gain)
        bed.start()
        layer.timer = this.chirpTimer(gain, () => volume)
        break
      }
      case 'cafe': {
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 520
        connectBuffer('brown', [lp])
        layer.timer = this.clinkTimer(gain, () => volume)
        break
      }
      default: {
        // white / pink / brown
        const color: 'white' | 'pink' | 'brown' =
          id === 'white' ? 'white' : id === 'pink' ? 'pink' : 'brown'
        connectBuffer(color, [])
      }
    }
    return layer
  }

  // crackling embers (fire)
  private crackleTimer(dest: GainNode, vol: () => number): number {
    const ctx = this.ensure()
    return window.setInterval(() => {
      if (Math.random() > 0.55) return
      const dur = 0.03 + Math.random() * 0.05
      const len = Math.floor(ctx.sampleRate * dur)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      const burst = ctx.createBufferSource()
      burst.buffer = buf
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 1500
      const g = ctx.createGain()
      const now = ctx.currentTime
      const peak = vol() * 0.4 * Math.random()
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(peak, now + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
      burst.connect(hp)
      hp.connect(g)
      g.connect(dest)
      burst.start(now)
      burst.stop(now + dur + 0.02)
    }, 90)
  }

  // occasional bird chirps
  private chirpTimer(dest: GainNode, vol: () => number): number {
    const ctx = this.ensure()
    return window.setInterval(() => {
      if (Math.random() > 0.4) return
      const now = ctx.currentTime
      const notes = 1 + Math.floor(Math.random() * 3)
      for (let n = 0; n < notes; n++) {
        const start = now + n * 0.13
        const base = 2600 + Math.random() * 1800
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(base, start)
        osc.frequency.linearRampToValueAtTime(base + 700, start + 0.06)
        osc.frequency.linearRampToValueAtTime(base - 300, start + 0.12)
        const g = ctx.createGain()
        const peak = vol() * 0.5
        g.gain.setValueAtTime(0, start)
        g.gain.linearRampToValueAtTime(peak, start + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.13)
        osc.connect(g)
        g.connect(dest)
        osc.start(start)
        osc.stop(start + 0.16)
      }
    }, 700)
  }

  // distant cup/cutlery clinks (cafe)
  private clinkTimer(dest: GainNode, vol: () => number): number {
    const ctx = this.ensure()
    return window.setInterval(() => {
      if (Math.random() > 0.3) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = 2200 + Math.random() * 2000
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = osc.frequency.value
      bp.Q.value = 6
      const g = ctx.createGain()
      const peak = vol() * 0.12
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(peak, now + 0.004)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)
      osc.connect(bp)
      bp.connect(g)
      g.connect(dest)
      osc.start(now)
      osc.stop(now + 0.3)
    }, 1600)
  }

  // --------------------------------------------------------------------------
  // Ticking clock
  // --------------------------------------------------------------------------

  startTicking(volume: number): void {
    this.tickVolume = volume
    this.stopTicking()
    const ctx = this.ensure()
    const gain = ctx.createGain()
    gain.gain.value = 1
    gain.connect(ctx.destination)
    this.tickGain = gain
    const tick = () => this.click()
    tick()
    this.tickTimer = window.setInterval(tick, 1000)
  }

  private click(): void {
    if (!this.tickGain || !this.ctx) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = 1100
    const g = ctx.createGain()
    const now = ctx.currentTime
    const peak = this.tickVolume * 0.18
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(peak, now + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04)
    osc.connect(g)
    g.connect(this.tickGain)
    osc.start(now)
    osc.stop(now + 0.06)
  }

  setTickingVolume(volume: number): void {
    this.tickVolume = volume
  }

  stopTicking(): void {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
    if (this.tickGain) {
      try {
        this.tickGain.disconnect()
      } catch {
        /* noop */
      }
      this.tickGain = null
    }
  }

  // --------------------------------------------------------------------------
  // Alarms (end-of-segment chimes)
  // --------------------------------------------------------------------------

  playAlarm(id: AlarmSoundId, volume: number): void {
    if (id === 'none') return
    const ctx = this.ensure()
    const master = ctx.createGain()
    master.gain.value = volume
    master.connect(ctx.destination)
    const t0 = ctx.currentTime

    const note = (
      freq: number,
      start: number,
      dur: number,
      type: OscillatorType = 'sine',
      level = 0.6,
    ) => {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.value = freq
      const g = ctx.createGain()
      const s = t0 + start
      g.gain.setValueAtTime(0, s)
      g.gain.linearRampToValueAtTime(level, s + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, s + dur)
      osc.connect(g)
      g.connect(master)
      osc.start(s)
      osc.stop(s + dur + 0.02)
    }

    switch (id) {
      case 'bell':
        note(880, 0, 1.2, 'sine', 0.5)
        note(1320, 0, 1.0, 'sine', 0.25)
        note(880, 0.5, 1.2, 'sine', 0.4)
        break
      case 'chime':
        note(523.25, 0, 0.5)
        note(659.25, 0.18, 0.5)
        note(783.99, 0.36, 0.7)
        note(1046.5, 0.54, 0.9)
        break
      case 'digital':
        for (let i = 0; i < 3; i++) note(1568, i * 0.22, 0.14, 'square', 0.4)
        break
      case 'ping':
        note(1318.5, 0, 0.9, 'sine', 0.6)
        note(1976, 0, 0.5, 'sine', 0.2)
        break
    }
  }

  /** Quick preview of an alarm (used in settings). */
  previewAlarm(id: AlarmSoundId, volume: number): void {
    this.unlock()
    this.playAlarm(id, volume)
  }
}

export const audio = new AudioEngine()
