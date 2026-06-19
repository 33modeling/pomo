import type { AlarmSoundId, NoiseId } from '../types'

/**
 * Web Audio engine. Everything (ambient noise, ticking, alarms) is synthesised
 * at runtime, so the app ships with zero audio assets and works fully offline.
 *
 * Must be (re)started from a user gesture — browsers suspend AudioContext until
 * then. The timer's Start button is that gesture.
 */
class AudioEngine {
  private ctx: AudioContext | null = null

  // ambient noise
  private noiseGain: GainNode | null = null
  private noiseNodes: AudioNode[] = []
  private crackleTimer: number | null = null
  private currentNoise: NoiseId = 'none'
  private noiseVolume = 0.5

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
    const seconds = 3
    const length = ctx.sampleRate * seconds
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
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
        b6 = white * 0.115926
        data[i] = pink * 0.11
      }
    } else {
      // brown
      let last = 0
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.5
      }
    }
    return buffer
  }

  // --------------------------------------------------------------------------
  // Ambient noise control
  // --------------------------------------------------------------------------

  setNoise(id: NoiseId, volume: number): void {
    this.noiseVolume = volume
    if (id === 'none') {
      this.stopNoise()
      return
    }
    if (id === this.currentNoise && this.noiseGain) {
      this.setNoiseVolume(volume)
      return
    }
    this.stopNoise()
    const ctx = this.ensure()
    this.currentNoise = id

    const gain = ctx.createGain()
    gain.gain.value = volume * 0.6
    gain.connect(ctx.destination)
    this.noiseGain = gain

    const base: 'white' | 'pink' | 'brown' =
      id === 'white' || id === 'rain'
        ? 'white'
        : id === 'pink'
          ? 'pink'
          : 'brown'

    const src = ctx.createBufferSource()
    src.buffer = this.makeBuffer(base)
    src.loop = true

    let tail: AudioNode = src
    const track = (n: AudioNode) => {
      this.noiseNodes.push(n)
      return n
    }
    track(src)

    if (id === 'rain') {
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 900
      tail.connect(hp)
      tail = track(hp)
    } else if (id === 'ocean') {
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 550
      tail.connect(lp)
      tail = track(lp)
      // slow wave swell via LFO modulating the gain
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.12
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = volume * 0.35
      lfo.connect(lfoGain)
      lfoGain.connect(gain.gain)
      lfo.start()
      track(lfo)
      track(lfoGain)
    } else if (id === 'fire') {
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 800
      tail.connect(lp)
      tail = track(lp)
      this.startCrackle(gain)
    }

    tail.connect(gain)
    src.start()
  }

  private startCrackle(dest: GainNode): void {
    const ctx = this.ensure()
    this.crackleTimer = window.setInterval(() => {
      if (Math.random() > 0.55) return
      const dur = 0.03 + Math.random() * 0.05
      const burst = ctx.createBufferSource()
      const len = Math.floor(ctx.sampleRate * dur)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      burst.buffer = buf
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 1500
      const g = ctx.createGain()
      const peak = this.noiseVolume * 0.25 * Math.random()
      const now = ctx.currentTime
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

  setNoiseVolume(volume: number): void {
    this.noiseVolume = volume
    if (this.noiseGain && this.ctx) {
      this.noiseGain.gain.setTargetAtTime(
        volume * 0.6,
        this.ctx.currentTime,
        0.05,
      )
    }
  }

  stopNoise(): void {
    if (this.crackleTimer !== null) {
      clearInterval(this.crackleTimer)
      this.crackleTimer = null
    }
    for (const n of this.noiseNodes) {
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
    this.noiseNodes = []
    if (this.noiseGain) {
      try {
        this.noiseGain.disconnect()
      } catch {
        /* noop */
      }
      this.noiseGain = null
    }
    this.currentNoise = 'none'
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
        for (let i = 0; i < 3; i++) {
          note(1568, i * 0.22, 0.14, 'square', 0.4)
        }
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
