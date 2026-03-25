/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'three/webgpu' {
  export * from 'three'
  export class WebGPURenderer {
    domElement: HTMLCanvasElement
    toneMapping: number
    autoClear: boolean
    setPixelRatio(value: number): void
    setSize(width: number, height: number): void
    setScissorTest(value: boolean): void
    setScissor(x: number, y: number, width: number, height: number): void
    setViewport(x: number, y: number, width: number, height: number): void
    setAnimationLoop(callback: (() => void | Promise<void>) | null): void
    clear(color?: boolean, depth?: boolean, stencil?: boolean): void
    render(scene: any, camera: any): void
    dispose(): void
    init(): Promise<void>
    compileAsync(scene: any, camera: any): Promise<void>
    resolveTimestampsAsync(type: string): Promise<void>
  }
  export const AgXToneMapping: number
}

declare module 'three/tsl' {
  export const color: (value: any) => any
  export const positionWorld: any
  export const positionLocal: any
  export const normalLocal: any
  export const tangentLocal: any
  export const bitangentLocal: any
  export const modelNormalMatrix: any
  export const time: any
  export const Fn: (fn: () => any) => any
  export const sin: (value: any) => any
  export const cos: (value: any) => any
  export const mix: (a: any, b: any, t: any) => any
  export const uv: () => any
  export const mx_fractal_noise_float: (...args: any[]) => any
  export const uniform: (value: any) => any
  export const float: (value: number) => any
  export const vec2: (x: any, y: any) => any
}

declare module 'three/examples/jsm/environments/RoomEnvironment.js' {
  export class RoomEnvironment {
    constructor()
  }
}
