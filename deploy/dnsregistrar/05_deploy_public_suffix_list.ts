import { artifacts, execute } from '@rocketh'
import { dnsEncodeName } from '../../test/fixtures/dnsEncodeName.js'

export async function fetchPublicSuffixes() {
  const res = await fetch(
    'https://publicsuffix.org/list/public_suffix_list.dat',
    { headers: { Connection: 'close' } },
  )
  if (!res.ok) throw new Error(`expected suffixes: ${res.status}`)
  return (await res.text())
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x && !x.startsWith('//'))
}

export default execute(
  async ({
    deploy,
    execute: write,
    namedAccounts: { deployer, owner },
    network,
    config,
  }) => {
    const psl = await deploy('SimplePublicSuffixList', {
      account: deployer,
      artifact: artifacts.SimplePublicSuffixList,
      args: [],
    })

    if (!psl.newlyDeployed) {
      return
    }

    console.log('SimplePublicSuffixList deployed successfully')

    // Transfer ownership to owner if different from deployer
    if (owner !== deployer) {
      await write(psl, {
        functionName: 'transferOwnership',
        args: [owner],
        account: deployer,
      })
      console.log('Transferred ownership to owner account')
    }

    // Fetch and set public suffix list
    const fetchedSuffixes = await fetchPublicSuffixes()
    const allowUnsafe =
      network.tags?.allow_unsafe ||
      (network.tags?.test && !config.saveDeployments)

    // Right now we're only going to support top-level, non-idna suffixes
    const suffixes = fetchedSuffixes.filter((suffix) =>
      suffix.match(/^[a-z0-9]+$/),
    )
    const batchAmount = allowUnsafe ? 1000 : 100

    console.log(`Starting suffix transactions for ${suffixes.length} suffixes`)
    const totalBatches = Math.ceil(suffixes.length / batchAmount)

    // Send transactions sequentially to avoid nonce conflicts
    for (let i = 0; i < suffixes.length; i += batchAmount) {
      const batch = suffixes
        .slice(i, i + batchAmount)
        .map((suffix) => dnsEncodeName(suffix))

      const batchIndex = Math.floor(i / batchAmount) + 1
      console.log(
        `Sending suffixes batch ${batchIndex}/${totalBatches} (${batch.length} suffixes)`,
      )

      await write(psl, {
        functionName: 'addPublicSuffixes',
        args: [batch],
        account: owner,
      })
      console.log(`Batch ${batchIndex} completed successfully`)
    }

    console.log(`Public suffix list configuration completed.`)
  },
  {
    id: 'SimplePublicSuffixList v1.0.0',
    tags: ['category:dnsregistrar', 'SimplePublicSuffixList'],
    dependencies: [],
  },
)
