/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect } from 'react'

// Color cycle period (seconds) — must match LandingPage.tsx
export const CYCLE_PERIOD = 6

export function SceneCanvas() {
  useEffect(() => {
    let _r: any = null
    let _alive = true
    const _offs: Array<() => void> = []
    const addListener = (t: EventTarget, ev: string, fn: any, opts?: any) => {
      t.addEventListener(ev, fn, opts)
      _offs.push(() => t.removeEventListener(ev, fn, opts))
    }

    ;(async () => {
      // Delay init to let IntroScreen pop letters without jank
      await new Promise(r => setTimeout(r, 600))
      if (!_alive) return

      const THREE = await import('three/webgpu')
      const {
        color, positionWorld, positionLocal, normalLocal, tangentLocal,
        bitangentLocal, modelNormalMatrix, time, Fn, sin, cos, mix, uv, uniform, float,
      } = await import('three/tsl')
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')

      if (!_alive) return

      // ─── Scene & Camera ───────────────────────────────────────────────
      const scene = new (THREE as any).Scene()
      scene.background = null
      const camera = new (THREE as any).PerspectiveCamera(30, innerWidth / innerHeight, 1, 2000)
      camera.position.set(0, 0, 7.5)

      // ─── Renderer ─────────────────────────────────────────────────────
      _r = new (THREE as any).WebGPURenderer({ antialias: true, alpha: true })
      _r.setPixelRatio(Math.min(devicePixelRatio, 2))
      _r.toneMapping = (THREE as any).AgXToneMapping
      _r.setSize(innerWidth, innerHeight)
      _r.autoClear = true
      Object.assign(_r.domElement.style, {
        position: 'fixed', top: '0', left: '0', zIndex: '5', pointerEvents: 'none',
      })
      document.body.appendChild(_r.domElement)
      await _r.init()
      if (!_alive) { _r.dispose(); _r.domElement?.remove(); _r = null; return }

      // ─── Geometry ─────────────────────────────────────────────────────
      const geo = new (THREE as any).TorusGeometry(1, 0.5, 64, 128)
      geo.computeTangents()

      // ─── Spiral Displacement ──────────────────────────────────────────
      const uSFreq = uniform(5), uSTwist = uniform(5), uSAmp = uniform(0.02), uSSpd = uniform(-0.5)
      const spiralPos = Fn(() => {
        const u = uv().x.mul(float(Math.PI * 2))
        const v = uv().y.mul(float(Math.PI * 2))
        const wave = sin(u.mul(uSFreq).add(v.mul(uSTwist)).sub(time.mul(uSSpd)))
        return positionLocal.add(normalLocal.mul(wave.mul(uSAmp)))
      })()
      const spiralNrm = Fn(() => {
        const u = uv().x.mul(float(Math.PI * 2))
        const v = uv().y.mul(float(Math.PI * 2))
        const phase = u.mul(uSFreq).add(v.mul(uSTwist)).sub(time.mul(uSSpd))
        const grad = cos(phase).mul(uSAmp)
        const ddu = grad.mul(uSFreq).mul(float(Math.PI * 2))
        const ddv = grad.mul(uSTwist).mul(float(Math.PI * 2))
        return modelNormalMatrix.mul(
          normalLocal.sub(tangentLocal.mul(ddu)).sub(bitangentLocal.mul(ddv)).normalize()
        ).normalize()
      })()

      // ─── Animated color uniforms ──────────────────────────────────────
      const colorUnifA = uniform(color(new (THREE as any).Color(0x050a05)))
      const colorUnifB = uniform(color(new (THREE as any).Color(0x00c076)))

      // ─── Single material ──────────────────────────────────────────────
      const mat = new (THREE as any).MeshPhysicalNodeMaterial()
      mat.roughness = 0.2
      mat.metalness = 0.8
      mat.specularIntensity = 1.5
      mat.positionNode = spiralPos
      mat.normalNode = spiralNrm
      mat.colorNode = Fn(() =>
        mix(colorUnifA, colorUnifB,
          sin(positionWorld.x.mul(3).add(time.mul(0.5))).mul(0.5).add(0.5)
        )
      )()

      const mesh = new (THREE as any).Mesh(geo, mat)
      scene.add(mesh)

      // ─── Environment & Lights ─────────────────────────────────────────
      const pmrem = new (THREE as any).PMREMGenerator(_r)
      scene.environment = pmrem.fromScene(new (RoomEnvironment as any)()).texture

      const kl = new (THREE as any).SpotLight(0xfff0e0, 8, 30, Math.PI / 4, 0.5, 1)
      kl.position.set(4, 3, 5); scene.add(kl)
      const fl = new (THREE as any).SpotLight(0xd0ffe8, 3, 30, Math.PI / 3, 0.7, 1)
      fl.position.set(-5, 1, 3); scene.add(fl)
      const rl = new (THREE as any).SpotLight(0xffffff, 6, 30, Math.PI / 4, 0.4, 1)
      rl.position.set(0, 4, -5); scene.add(rl)

      await _r.compileAsync(scene, camera)
      if (!_alive) return

      // ─── Color sets ───────────────────────────────────────────────────
      const COLOR_SETS = [
        { a: new (THREE as any).Color(0x050a05), b: new (THREE as any).Color(0x00c076), roughness: 0.20, metalness: 0.90 },
        { a: new (THREE as any).Color(0x020502), b: new (THREE as any).Color(0x009a5e), roughness: 0.15, metalness: 0.95 },
        { a: new (THREE as any).Color(0x050a05), b: new (THREE as any).Color(0x16c784), roughness: 0.25, metalness: 0.85 },
        { a: new (THREE as any).Color(0x030803), b: new (THREE as any).Color(0x00a866), roughness: 0.18, metalness: 0.92 },
      ]

      // ─── Mouse ────────────────────────────────────────────────────────
      const mouse = new (THREE as any).Vector2()
      const tgt = new (THREE as any).Vector2()
      const cur = new (THREE as any).Vector2()
      addListener(window, 'pointermove', (e: PointerEvent) => {
        mouse.x = (e.clientX / innerWidth) * 2 - 1
        mouse.y = -(e.clientY / innerHeight) * 2 + 1
      })
      addListener(window, 'resize', () => {
        camera.aspect = innerWidth / innerHeight
        camera.updateProjectionMatrix()
        _r.setSize(innerWidth, innerHeight)
      })

      // ─── Animation Loop ───────────────────────────────────────────────
      let last = performance.now()
      _r.setAnimationLoop(async () => {
        const now = performance.now()
        const dt = Math.min((now - last) / 1000, 0.1)
        last = now

        // Mouse follow
        tgt.x = -mouse.y * 0.2; tgt.y = mouse.x * 0.2
        const alpha = 1 - Math.exp(-4 * dt)
        cur.x += (tgt.x - cur.x) * alpha
        cur.y += (tgt.y - cur.y) * alpha
        mesh.rotation.set(cur.x, cur.y, 0)

        // Color cycling (smoothstep between phases)
        const elapsed = now / 1000
        const phase = (elapsed / CYCLE_PERIOD) % 4
        const segA = Math.floor(phase) % 4
        const segB = (segA + 1) % 4
        const frac = phase - Math.floor(phase)
        const smooth = frac * frac * (3 - 2 * frac)

        const ca = COLOR_SETS[segA]
        const cb = COLOR_SETS[segB]
        colorUnifA.value.lerpColors(ca.a, cb.a, smooth)
        colorUnifB.value.lerpColors(ca.b, cb.b, smooth)
        mat.roughness = ca.roughness + (cb.roughness - ca.roughness) * smooth
        mat.metalness = ca.metalness + (cb.metalness - ca.metalness) * smooth

        _r.render(scene, camera)
      })
    })().catch(console.error)

    return () => {
      _alive = false
      _offs.forEach(fn => fn())
      if (_r) { _r.setAnimationLoop(null); _r.dispose(); _r.domElement?.remove(); _r = null }
    }
  }, [])

  return null
}
