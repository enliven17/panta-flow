declare module '@onflow/fcl' {
  export function config(cfg: Record<string, string>): void
  export function authenticate(): Promise<void>
  export function unauthenticate(): void
  export function mutate(opts: {
    cadence: string
    args?: any
    proposer?: any
    payer?: any
    authorizations?: any[]
    limit?: number
  }): Promise<string>
  export function query(opts: { cadence: string; args?: any }): Promise<any>
  export function tx(txId: string): { onceSealed: () => Promise<any> }
  export const currentUser: {
    subscribe: (cb: (user: { addr: string | null; loggedIn: boolean | null }) => void) => () => void
  }
  export const authz: any
}
