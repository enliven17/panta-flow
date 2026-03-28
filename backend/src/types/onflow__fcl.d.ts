declare module "@onflow/fcl" {
  export function config(cfg: Record<string, string>): void
  export function mutate(opts: any): Promise<string>
  export function query(opts: any): Promise<any>
  export function tx(txId: string): { onceSealed: () => Promise<any> }
  export function withPrefix(addr: string): string
  export const authz: any
  export const arg: any
  export const t: any
}
