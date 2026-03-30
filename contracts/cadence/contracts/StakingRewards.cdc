/// StakingRewards.cdc — Staking ve ödül sistemi for PantaDEX on Flow Testnet
/// PANTA ve PLP stake eden kullanıcılara blok bazlı esPANTA ödülü hesaplar.
/// Gerçek esPANTA mint işlemi, claimRewards çağıran transaction tarafından yapılır.
access(all) contract StakingRewards {

    // -----------------------------------------------------------------------
    // Structs
    // -----------------------------------------------------------------------

    access(all) struct StakeRecord {
        access(all) let stakedAmount: UFix64
        access(all) let startBlock: UInt64
        access(all) var lastClaimBlock: UInt64
        access(all) var pendingRewards: UFix64

        init(stakedAmount: UFix64, startBlock: UInt64, lastClaimBlock: UInt64, pendingRewards: UFix64) {
            self.stakedAmount = stakedAmount
            self.startBlock = startBlock
            self.lastClaimBlock = lastClaimBlock
            self.pendingRewards = pendingRewards
        }
    }

    // -----------------------------------------------------------------------
    // Contract-level state
    // -----------------------------------------------------------------------

    /// PANTA staker kayıtları
    access(all) var pantaStakers: {Address: StakeRecord}

    /// PLP staker kayıtları
    access(all) var plpStakers: {Address: StakeRecord}

    /// Blok başına esPANTA ödül miktarı (varsayılan: 0.001)
    access(all) var rewardPerBlock: UFix64

    /// Toplam stake edilmiş PANTA miktarı
    access(all) var totalPantaStaked: UFix64

    /// Toplam stake edilmiş PLP miktarı
    access(all) var totalPlpStaked: UFix64

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    access(all) event Staked(account: Address, tokenType: String, amount: UFix64)
    access(all) event Unstaked(account: Address, tokenType: String, amount: UFix64)
    access(all) event RewardsClaimed(account: Address, tokenType: String, amount: UFix64)
    access(all) event RewardRateUpdated(newRate: UFix64)

    // -----------------------------------------------------------------------
    // Storage paths
    // -----------------------------------------------------------------------

    access(all) let AdminStoragePath: StoragePath

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /// Belirtilen staker dictionary'sinden bekleyen ödülleri hesaplar.
    access(self) fun _calcPending(record: StakeRecord): UFix64 {
        let currentBlock = getCurrentBlock().height
        let blockDiff = currentBlock - record.lastClaimBlock
        let newRewards = record.stakedAmount * StakingRewards.rewardPerBlock * UFix64(blockDiff)
        return record.pendingRewards + newRewards
    }

    // -----------------------------------------------------------------------
    // Admin resource
    // -----------------------------------------------------------------------

    access(all) resource Admin {

        /// Blok başına ödül oranını güncelle
        access(all) fun setRewardPerBlock(rate: UFix64) {
            StakingRewards.rewardPerBlock = rate
            emit RewardRateUpdated(newRate: rate)
        }

        /// PANTA stake et — yeni kayıt oluştur veya mevcut kaydı güncelle
        access(all) fun stakePANTA(account: Address, amount: UFix64) {
            pre {
                amount > 0.0: "Stake miktarı sıfırdan büyük olmalı"
            }
            let currentBlock = getCurrentBlock().height

            if let existing = StakingRewards.pantaStakers[account] {
                // Mevcut ödülleri biriktir
                let accumulated = StakingRewards._calcPending(record: existing)
                let newRecord = StakeRecord(
                    stakedAmount: existing.stakedAmount + amount,
                    startBlock: existing.startBlock,
                    lastClaimBlock: currentBlock,
                    pendingRewards: accumulated
                )
                StakingRewards.pantaStakers[account] = newRecord
            } else {
                let newRecord = StakeRecord(
                    stakedAmount: amount,
                    startBlock: currentBlock,
                    lastClaimBlock: currentBlock,
                    pendingRewards: 0.0
                )
                StakingRewards.pantaStakers[account] = newRecord
            }

            StakingRewards.totalPantaStaked = StakingRewards.totalPantaStaked + amount
            emit Staked(account: account, tokenType: "PANTA", amount: amount)
        }

        /// PLP stake et — yeni kayıt oluştur veya mevcut kaydı güncelle
        access(all) fun stakePLP(account: Address, amount: UFix64) {
            pre {
                amount > 0.0: "Stake miktarı sıfırdan büyük olmalı"
            }
            let currentBlock = getCurrentBlock().height

            if let existing = StakingRewards.plpStakers[account] {
                // Mevcut ödülleri biriktir
                let accumulated = StakingRewards._calcPending(record: existing)
                let newRecord = StakeRecord(
                    stakedAmount: existing.stakedAmount + amount,
                    startBlock: existing.startBlock,
                    lastClaimBlock: currentBlock,
                    pendingRewards: accumulated
                )
                StakingRewards.plpStakers[account] = newRecord
            } else {
                let newRecord = StakeRecord(
                    stakedAmount: amount,
                    startBlock: currentBlock,
                    lastClaimBlock: currentBlock,
                    pendingRewards: 0.0
                )
                StakingRewards.plpStakers[account] = newRecord
            }

            StakingRewards.totalPlpStaked = StakingRewards.totalPlpStaked + amount
            emit Staked(account: account, tokenType: "PLP", amount: amount)
        }

        /// Stake'i çek — staker kaydını kaldır, stake edilen miktarı döndür.
        /// Son bekleyen ödüller de hesaplanır (pendingRewards güncellenir ama kayıt silinir).
        /// tokenType: "PANTA" veya "PLP"
        access(all) fun unstake(account: Address, tokenType: String): UFix64 {
            if tokenType == "PANTA" {
                let record = StakingRewards.pantaStakers[account]
                    ?? panic("PANTA stake kaydı bulunamadı: ".concat(account.toString()))

                // Son ödülleri biriktir (kayıt silinmeden önce)
                let finalPending = StakingRewards._calcPending(record: record)
                let stakedAmount = record.stakedAmount

                // Kaydı sil
                StakingRewards.pantaStakers.remove(key: account)
                StakingRewards.totalPantaStaked = StakingRewards.totalPantaStaked - stakedAmount

                emit Unstaked(account: account, tokenType: "PANTA", amount: stakedAmount)
                return stakedAmount

            } else if tokenType == "PLP" {
                let record = StakingRewards.plpStakers[account]
                    ?? panic("PLP stake kaydı bulunamadı: ".concat(account.toString()))

                let finalPending = StakingRewards._calcPending(record: record)
                let stakedAmount = record.stakedAmount

                StakingRewards.plpStakers.remove(key: account)
                StakingRewards.totalPlpStaked = StakingRewards.totalPlpStaked - stakedAmount

                emit Unstaked(account: account, tokenType: "PLP", amount: stakedAmount)
                return stakedAmount

            } else {
                panic("Geçersiz tokenType: PANTA veya PLP olmalı")
            }
        }

        /// Bekleyen ödülleri hesapla ve döndür; pendingRewards'ı sıfırla, lastClaimBlock'u güncelle.
        /// Döndürülen miktar, transaction tarafından esPANTAToken.Minter ile mint edilmelidir.
        /// tokenType: "PANTA" veya "PLP"
        access(all) fun claimRewards(account: Address, tokenType: String): UFix64 {
            let currentBlock = getCurrentBlock().height

            if tokenType == "PANTA" {
                let record = StakingRewards.pantaStakers[account]
                    ?? panic("PANTA stake kaydı bulunamadı: ".concat(account.toString()))

                let rewards = StakingRewards._calcPending(record: record)
                if rewards == 0.0 {
                    return 0.0
                }

                let updatedRecord = StakeRecord(
                    stakedAmount: record.stakedAmount,
                    startBlock: record.startBlock,
                    lastClaimBlock: currentBlock,
                    pendingRewards: 0.0
                )
                StakingRewards.pantaStakers[account] = updatedRecord

                emit RewardsClaimed(account: account, tokenType: "PANTA", amount: rewards)
                return rewards

            } else if tokenType == "PLP" {
                let record = StakingRewards.plpStakers[account]
                    ?? panic("PLP stake kaydı bulunamadı: ".concat(account.toString()))

                let rewards = StakingRewards._calcPending(record: record)
                if rewards == 0.0 {
                    return 0.0
                }

                let updatedRecord = StakeRecord(
                    stakedAmount: record.stakedAmount,
                    startBlock: record.startBlock,
                    lastClaimBlock: currentBlock,
                    pendingRewards: 0.0
                )
                StakingRewards.plpStakers[account] = updatedRecord

                emit RewardsClaimed(account: account, tokenType: "PLP", amount: rewards)
                return rewards

            } else {
                panic("Geçersiz tokenType: PANTA veya PLP olmalı")
            }
        }
    }

    // -----------------------------------------------------------------------
    // Public view functions
    // -----------------------------------------------------------------------

    /// Bekleyen ödülleri hesapla: stakedAmount * rewardPerBlock * (currentBlock - lastClaimBlock) + pendingRewards
    /// tokenType: "PANTA" veya "PLP"
    access(all) view fun calculatePendingRewards(account: Address, tokenType: String): UFix64 {
        let currentBlock = getCurrentBlock().height

        if tokenType == "PANTA" {
            if let record = StakingRewards.pantaStakers[account] {
                let blockDiff = currentBlock - record.lastClaimBlock
                let newRewards = record.stakedAmount * StakingRewards.rewardPerBlock * UFix64(blockDiff)
                return record.pendingRewards + newRewards
            }
            return 0.0

        } else if tokenType == "PLP" {
            if let record = StakingRewards.plpStakers[account] {
                let blockDiff = currentBlock - record.lastClaimBlock
                let newRewards = record.stakedAmount * StakingRewards.rewardPerBlock * UFix64(blockDiff)
                return record.pendingRewards + newRewards
            }
            return 0.0

        } else {
            return 0.0
        }
    }

    /// Stake kaydını döndür (nil ise kayıt yok)
    /// tokenType: "PANTA" veya "PLP"
    access(all) view fun getStakeRecord(account: Address, tokenType: String): StakeRecord? {
        if tokenType == "PANTA" {
            return StakingRewards.pantaStakers[account]
        } else if tokenType == "PLP" {
            return StakingRewards.plpStakers[account]
        }
        return nil
    }

    /// Toplam stake edilmiş miktarı döndür
    /// tokenType: "PANTA" veya "PLP"
    access(all) view fun getTotalStaked(tokenType: String): UFix64 {
        if tokenType == "PANTA" {
            return StakingRewards.totalPantaStaked
        } else if tokenType == "PLP" {
            return StakingRewards.totalPlpStaked
        }
        return 0.0
    }

    // -----------------------------------------------------------------------
    // Contract initializer
    // -----------------------------------------------------------------------

    init() {
        self.pantaStakers = {}
        self.plpStakers = {}
        self.rewardPerBlock = 0.001
        self.totalPantaStaked = 0.0
        self.totalPlpStaked = 0.0

        self.AdminStoragePath = /storage/stakingRewardsAdmin

        self.account.storage.save(<- create Admin(), to: self.AdminStoragePath)
    }
}
