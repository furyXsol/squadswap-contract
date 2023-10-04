import { ethers, network } from 'hardhat'
// import { configs } from '@pancakeswap/common/config'
import { configs } from '../../../common/config'
// import { tryVerify } from '@pancakeswap/common/verify'
import { writeFileSync } from 'fs'

async function main() {
  // Remember to update the init code hash in SC for different chains before deploying
  const networkName = network.name
  const config = {...configs[networkName as any]}
  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  // config.v2Factory = "0xf7b814A12617B92fb17f17276Cbc02ef3523C0D2";    // Squad factory v2 in bsc testnet

  const v3DeployedContracts = await import(`../../v3-core/deployments/${networkName}.json`)
  const v3PeripheryDeployedContracts = await import(`../../v3-periphery/deployments/${networkName}.json`)

  const SquadV3PoolDeployer_address = v3DeployedContracts.SquadV3PoolDeployer
  const SquadV3Factory_address = v3DeployedContracts.SquadV3Factory
  const positionManager_address = v3PeripheryDeployedContracts.NonfungiblePositionManager

  /** SmartRouterHelper */
  console.log('Deploying SmartRouterHelper...')
  const SmartRouterHelper = await ethers.getContractFactory('SmartRouterHelper')
  const smartRouterHelper = await SmartRouterHelper.deploy()
  await smartRouterHelper.deployed()
  console.log('SmartRouterHelper deployed to:', smartRouterHelper.address)
  // await tryVerify(smartRouterHelper)

  /** SmartRouter */
  console.log('Deploying SmartRouter...')
  const SmartRouter = await ethers.getContractFactory('SmartRouter', {
    libraries: {
      SmartRouterHelper: smartRouterHelper.address,
    },
  })
  const smartRouter = await SmartRouter.deploy(
    config.v2Factory,
    SquadV3PoolDeployer_address,
    SquadV3Factory_address,
    positionManager_address,
    config.stableFactory,
    config.stableInfo,
    config.WNATIVE
  )
  await smartRouter.deployed()
  console.log('SmartRouter deployed to:', smartRouter.address)

  // await tryVerify(smartRouter, [
  //   config.v2Factory,
  //   SquadV3PoolDeployer_address,
  //   SquadV3Factory_address,
  //   positionManager_address,
  //   config.stableFactory,
  //   config.stableInfo,
  //   config.WNATIVE,
  // ])

  /** MixedRouteQuoterV1 */
  const MixedRouteQuoterV1 = await ethers.getContractFactory('MixedRouteQuoterV1', {
    libraries: {
      SmartRouterHelper: smartRouterHelper.address,
    },
  })
  const mixedRouteQuoterV1 = await MixedRouteQuoterV1.deploy(
    SquadV3PoolDeployer_address,
    SquadV3Factory_address,
    config.v2Factory,
    config.stableFactory,
    config.WNATIVE
  )
  await mixedRouteQuoterV1.deployed()
  console.log('MixedRouteQuoterV1 deployed to:', mixedRouteQuoterV1.address)

  // await tryVerify(mixedRouteQuoterV1, [
  //   SquadV3PoolDeployer_address,
  //   SquadV3Factory_address,
  //   config.v2Factory,
  //   config.stableFactory,
  //   config.WNATIVE,
  // ])

  /** QuoterV2 */
  const QuoterV2 = await ethers.getContractFactory('QuoterV2', {
    libraries: {
      SmartRouterHelper: smartRouterHelper.address,
    },
  })
  const quoterV2 = await QuoterV2.deploy(SquadV3PoolDeployer_address, SquadV3Factory_address, config.WNATIVE)
  await quoterV2.deployed()
  console.log('QuoterV2 deployed to:', quoterV2.address)

  // await tryVerify(quoterV2, [SquadV3PoolDeployer_address, SquadV3Factory_address, config.WNATIVE])

  /** TokenValidator */
  const TokenValidator = await ethers.getContractFactory('TokenValidator', {
    libraries: {
      SmartRouterHelper: smartRouterHelper.address,
    },
  })
  const tokenValidator = await TokenValidator.deploy(config.v2Factory, positionManager_address)
  await tokenValidator.deployed()
  console.log('TokenValidator deployed to:', tokenValidator.address)

  // await tryVerify(tokenValidator, [config.v2Factory, positionManager_address])

  const contracts = {
    SmartRouter: smartRouter.address,
    SmartRouterHelper: smartRouterHelper.address,
    MixedRouteQuoterV1: mixedRouteQuoterV1.address,
    QuoterV2: quoterV2.address,
    TokenValidator: tokenValidator.address,
  }

  writeFileSync(`./deployments/${network.name}.json`, JSON.stringify(contracts, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
