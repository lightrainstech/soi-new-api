const Web3 = require('web3')
var ethers = require('ethers')
const fs = require('fs')
const nftAbi = require('../../abi/nft.json')
const axios = require('axios')

const provider = new ethers.providers.JsonRpcProvider(process.env.JSON_RPC)
const assetUrl =
  process.env.SOI_ASSET_URL ||
  'https://ipfs.io/ipfs/QmU8awtg1cPMrSG5Fm6ou46Zk2Wzcan4BzYp48fH6yeezq'

const privateKey = process.env.PRIVATE_KEY
const wallet = new ethers.Wallet(privateKey)
wallet.provider = provider
const signer = wallet.connect(provider)

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.JSON_RPC))
const Contract = web3.eth.Contract

//const nftAbi = JSON.parse(nftAbiJson)
const soiContract = new ethers.Contract(
  process.env.SOI_CONTRACT_ADDRESS,
  nftAbi,
  signer
)
let iface = new ethers.utils.Interface(nftAbi)
const mintNFT = toAddress =>
  new Promise((resolve, reject) =>
    calculateGas()
      .then(feeData =>
        soiContract
          .safeMint(toAddress, assetUrl, {
            gasPrice: feeData
          })
          .then(tx => {
            console.log('Waiting for confirmation....')
            return tx.wait()
          })
          .then(receipt => {
            console.log(`---------Minting Completed---------`)
            let log = iface.parseLog(receipt.logs[0])
            return resolve({
              tokenId: log.args.tokenId,
              status: receipt.status
            })
          })
          .catch(e => reject(e))
      )
      .catch(e => reject(e))
  )

const calculateGas = async () => {
  try {
    let feeData = web3.utils.formatUnits(feeData.maxFeePerGas, 'gwei')
    return feeData
  } catch (error) {
    return 60000000000
  }
}

const checkSumAddress = async account => {
  return web3.utils.toChecksumAddress(account)
}

module.exports = {
  mintNFT,
  checkSumAddress
}
