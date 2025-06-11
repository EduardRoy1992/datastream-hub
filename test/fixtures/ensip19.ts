import type { Hex } from 'viem'

export const COIN_TYPE_ETH = 60n
export const EVM_BIT = 1n << 31n

export function coinTypeFromChain(chain: number) {
  if (chain === 1) return COIN_TYPE_ETH
  if ((chain & Number(EVM_BIT - 1n)) !== chain)
    throw new Error(`invalid chain: ${chain}`)
  return BigInt(chain) | EVM_BIT
}

export function chainFromCoinType(coinType: bigint): number {
  if (coinType == COIN_TYPE_ETH) return 1
  return coinType == BigInt.asUintN(32, coinType) && coinType & EVM_BIT
    ? Number(coinType ^ EVM_BIT)
    : 0
}

export function isEVMCoinType(coinType: bigint) {
  return !!chainFromCoinType(coinType) || coinType === EVM_BIT
}

export function shortCoin(coinType: bigint) {
  return isEVMCoinType(coinType)
    ? `chain:${chainFromCoinType(coinType)}`
    : `coin:${coinType}`
}

export function getReverseNamespace(coinType: bigint) {
  return `${
    coinType == COIN_TYPE_ETH
      ? 'addr'
      : coinType == EVM_BIT
      ? 'default'
      : coinType.toString(16)
  }.reverse`
}

export function getReverseName(encodedAddress: Hex, coinType = COIN_TYPE_ETH) {
  const hex = encodedAddress.slice(2)
  if (!hex) throw new Error('empty address')
  return `${hex.toLowerCase()}.${getReverseNamespace(coinType)}`
}
