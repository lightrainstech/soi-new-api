const Web3 = require('web3')
const fs = require('fs')

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.JSON_RPC))
const Contract = web3.eth.Contract

// Add default account to the contract
const account = web3.eth.accounts.privateKeyToAccount(
  '0x' + process.env.PRIVATE_KEY
)
web3.eth.accounts.wallet.add(account)
web3.eth.defaultAccount = account.address

// Challenge factory Contract
const challengeFactoryAbiJson = fs.readFileSync('abi/challenge_factory')
const challengeFactoryAbi = JSON.parse(challengeFactoryAbiJson)
const CHALLENGE_FACTORY_ADDRESS = process.env.CHALLENGE_FACTORY_ADDRESS
const challengeFactoryContract = new Contract(
  challengeFactoryAbi,
  CHALLENGE_FACTORY_ADDRESS
)

// Create challenge in contract
const createChallenge = async () => {
  try {
    const callMethod = await challengeFactoryContract.methods.createChallenge()

    const gas = await callMethod.estimateGas({
      from: web3.eth.defaultAccount
    })

    const tx = await callMethod.send({
      from: web3.eth.defaultAccount,
      gas: gas
    })

    return tx
  } catch (error) {
    console.log(`Failed to create challenge in contract - ${error.message}.`)
    throw error
  }
}

module.exports = {
  createChallenge
}
