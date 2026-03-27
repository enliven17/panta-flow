'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fcl, FLOW_FAUCET_URL } from '@/lib/config/flow'
import { useFlowNetwork } from './useFlowNetwork'

const GET_FAUCET_BALANCE_SCRIPT = `
  import MockUSDCFaucet from 0xPLACEHOLDER
  access(all) fun main(): UFix64 {
    return MockUSDCFaucet.getReserveBalance()
  }
`

const CLAIM_USDC_TRANSACTION = `
  import FungibleToken from 0x9a0766d93b6608b7
  import MockUSDCFaucet from 0xFAUCETDEPLOYER
  import MockUSDC from 0xMOCKUSDCDEPLOYER

  transaction {
    let usdcMinter: &MockUSDC.Minter
    let usdcReceiver: &{FungibleToken.Receiver}
    let signerAddress: Address

    prepare(signer: auth(BorrowValue) &Account) {
      self.signerAddress = signer.address

      self.usdcMinter = signer.storage.borrow<&MockUSDC.Minter>(
        from: /storage/mockUSDCMinter
      ) ?? panic("Could not borrow MockUSDC Minter from /storage/mockUSDCMinter")

      if signer.storage.borrow<&MockUSDC.Vault>(from: MockUSDC.VaultStoragePath) == nil {
        signer.storage.save(
          <- MockUSDC.createEmptyVault(vaultType: Type<@MockUSDC.Vault>()),
          to: MockUSDC.VaultStoragePath
        )
        signer.capabilities.publish(
          signer.capabilities.storage.issue<&{FungibleToken.Receiver}>(MockUSDC.VaultStoragePath),
          at: MockUSDC.VaultPublicPath
        )
      }

      self.usdcReceiver = signer.storage.borrow<&{FungibleToken.Receiver}>(
        from: MockUSDC.VaultStoragePath
      ) ?? panic("Could not borrow signer's MockUSDC vault receiver")
    }

    execute {
      let claimAmount = MockUSDCFaucet.claimTokens(recipient: self.signerAddress)
      let usdcVault <- self.usdcMinter.mintTokens(amount: claimAmount)
      self.usdcReceiver.deposit(from: <- usdcVault)
    }
  }
`

export function useFaucetBalance() {
  return useQuery({
    queryKey: ['faucetBalance'],
    queryFn: () => fcl.query({ cadence: GET_FAUCET_BALANCE_SCRIPT }),
    refetchInterval: 30_000,
  })
}

export function useClaimFaucet() {
  const queryClient = useQueryClient()
  const { isConnected } = useFlowNetwork()

  return useMutation({
    mutationFn: () =>
      fcl.mutate({
        cadence: CLAIM_USDC_TRANSACTION,
        limit: 100,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faucetBalance'] })
    },
    meta: { enabled: isConnected },
  })
}

export { FLOW_FAUCET_URL }
