import { artifacts, execute } from '@rocketh'
import { namehash } from 'viem'
import { createInterfaceId } from '../../test/fixtures/createInterfaceId.js'

export default execute(
  async ({ deploy, get, execute: write, namedAccounts, network }) => {
    const { deployer, owner } = namedAccounts

    const registry = get<(typeof artifacts.ENSRegistry)['abi']>('ENSRegistry')
    const registrar = get<
      (typeof artifacts.BaseRegistrarImplementation)['abi']
    >('BaseRegistrarImplementation')
    const priceOracle = get<
      (typeof artifacts.ExponentialPremiumPriceOracle)['abi']
    >('ExponentialPremiumPriceOracle')
    const reverseRegistrar =
      get<(typeof artifacts.ReverseRegistrar)['abi']>('ReverseRegistrar')
    const defaultReverseRegistrar = get<
      (typeof artifacts.DefaultReverseRegistrar)['abi']
    >('DefaultReverseRegistrar')

    const controller = await deploy('ETHRegistrarController', {
      account: deployer,
      artifact: artifacts.ETHRegistrarController,
      args: [
        registrar.address,
        priceOracle.address,
        60n,
        86400n,
        reverseRegistrar.address,
        defaultReverseRegistrar.address,
        registry.address,
      ],
    })

    if (!controller.newlyDeployed) return

    // Transfer ownership to owner
    if (owner !== deployer) {
      console.log(
        `  - Transferring ownership of ETHRegistrarController to ${owner}`,
      )
      await write(controller, {
        functionName: 'transferOwnership',
        args: [owner],
        account: deployer,
      })
    }

    // Only attempt to make controller etc changes directly on testnets
    if (network.name === 'mainnet' && !network.tags?.tenderly) return

    // Add controller to BaseRegistrarImplementation
    console.log(
      `  - Adding ETHRegistrarController as controller on BaseRegistrarImplementation`,
    )
    await write(registrar, {
      functionName: 'addController',
      args: [controller.address],
      account: owner,
    })

    // Add controller to ReverseRegistrar
    console.log(
      `  - Adding ETHRegistrarController as controller on ReverseRegistrar`,
    )
    await write(reverseRegistrar, {
      functionName: 'setController',
      args: [controller.address, true],
      account: owner,
    })

    // Add controller to DefaultReverseRegistrar
    console.log(
      `  - Adding ETHRegistrarController as controller on DefaultReverseRegistrar`,
    )
    await write(defaultReverseRegistrar, {
      functionName: 'setController',
      args: [controller.address, true],
      account: owner,
    })

    // Set interface on resolver
    const artifact = artifacts.IETHRegistrarController
    const interfaceId = createInterfaceId(artifact.abi)

    // For simplicity, assume OwnedResolver was deployed for .eth
    const ethOwnedResolver = get('OwnedResolver')

    console.log(
      `  - Setting ETHRegistrarController interface ID ${interfaceId} on .eth resolver`,
    )
    await write(ethOwnedResolver, {
      functionName: 'setInterface',
      args: [namehash('eth'), interfaceId, controller.address],
      account: owner,
    })
  },
  {
    id: 'ETHRegistrarController v3.0.0',
    tags: ['category:ethregistrar', 'ETHRegistrarController'],
    dependencies: [
      'ENSRegistry',
      'BaseRegistrarImplementation',
      'ExponentialPremiumPriceOracle',
      'ReverseRegistrar',
      'DefaultReverseRegistrar',
      'NameWrapper',
      'OwnedResolver',
    ],
  },
)
