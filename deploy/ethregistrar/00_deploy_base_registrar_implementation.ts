import { execute, artifacts } from '@rocketh';
import { namehash } from 'viem/ens';

export default execute(
  async ({ deploy, get, namedAccounts, network }) => {
    const { deployer } = namedAccounts;

    if (!network.tags?.use_root) {
      return;
    }

    const registry = await get('ENSRegistry');

    await deploy('BaseRegistrarImplementation', {
      account: deployer,
      artifact: artifacts.BaseRegistrarImplementation,
      args: [registry.address, namehash('eth')],
    });
  },
  {
    id: 'registrar',
    tags: ['ethregistrar', 'BaseRegistrarImplementation'],
    dependencies: ['registry', 'root'],
  }
);
