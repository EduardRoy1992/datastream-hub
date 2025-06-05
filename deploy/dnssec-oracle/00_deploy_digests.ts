import { execute, artifacts } from '@rocketh';

export default execute(
  async ({ deploy, namedAccounts, network }) => {
    const { deployer } = namedAccounts;

    await deploy('SHA1Digest', {
      account: deployer,
      artifact: artifacts.SHA1Digest,
      args: [],
    });

    await deploy('SHA256Digest', {
      account: deployer,
      artifact: artifacts.SHA256Digest,
      args: [],
    });

    if (network.tags?.test) {
      await deploy('DummyDigest', {
        account: deployer,
        artifact: artifacts.DummyDigest,
        args: [],
      });
    }
  },
  {
    tags: ['dnssec-digests'],
  }
);
