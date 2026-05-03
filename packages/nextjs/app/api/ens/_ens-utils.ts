import { createPublicClient, createWalletClient, http, parseAbiItem, namehash } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { baseSepolia } from "viem/chains"

export const REGISTRY_ADDRESS = process.env.DURIN_L2_REGISTRY as `0x${string}`
export const REGISTRAR_ADDRESS = process.env.DURIN_L2_REGISTRAR as `0x${string}`

export const REGISTRY_ABI = [
  {
    name: "text",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ type: "string" }],
  },
] as const

export const REGISTRAR_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "label", type: "string" },
      { name: "subnameOwner", type: "address" },
      { name: "keys", type: "string[]" },
      { name: "values", type: "string[]" },
    ],
    outputs: [],
  },
] as const

export const SUBNAME_REGISTERED_EVENT = parseAbiItem(
  "event SubnameRegistered(string label, address indexed subnameOwner, bytes32 indexed node)"
)

const rpc = process.env.ALCHEMY_BASE_SEPOLIA_RPC ?? "https://sepolia.base.org"

export function publicClient() {
  return createPublicClient({ chain: baseSepolia, transport: http(rpc) })
}

export function walletClient() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set")
  const account = privateKeyToAccount(`0x${pk.replace(/^0x/, "")}`)
  return { client: createWalletClient({ account, chain: baseSepolia, transport: http(rpc) }), account }
}

export const PARENT_NODE = namehash(process.env.NEXT_PUBLIC_PARENT_ENS ?? "tollgate.eth")

export const TEXT_KEYS = [
  "tollgate:url",
  "tollgate:manifest",
  "tollgate:type",
  "tollgate:payee",
  "tollgate:description",
  "tollgate:category",
  "tollgate:version",
] as const
