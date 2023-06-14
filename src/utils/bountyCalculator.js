'use strict'
const ChallengeParticipation = require('../models/challengeParticipationModel')
const Affiliate = require('../models/affiliateModel')
const Web3 = require('web3')

// Price for posts per platform
const pricePerPlatform = {
  facebook: {
    post: 4.0,
    share: 0.4,
    comment: 0.05,
    like: 0.01,
    video_view: 0.05,
    engagement: 0.02
  },
  instagram: {
    post: 50.0,
    comment: 0.04,
    like: 0.01,
    engagement: 0.04,
    comment: 0.04,
    impression: 0.01
  },
  twitter: {
    post: 50.0,
    share: 0.4,
    like: 0.01,
    engagement: 0.05,
    video_view: 0.4
  },
  youtube: {
    post: 60.0,
    comment: 0.2,
    like: 0.01,
    video_view: 0.5,
    engagement: 0.2
  },
  tiktok: {
    post: 40.0,
    comment: 0.03,
    like: 0.01,
    video_view: 0.05,
    share: 0.1,
    engagement: 0.05
  }
}

// Deduct 20% commissions from the bounty offered
const deductCommission = bountyInvested => {
  const percentToBeDeducted = 20
  const commission = parseFloat(
    ((percentToBeDeducted / 100) * bountyInvested).toFixed(2)
  )
  const bountyAfterCommission = bountyInvested - commission
  return {
    commission,
    bountyAfterCommission
  }
}

// Calculate total metrics price
const pricePerPostMetrics = (platform, metric, totalMetric) => {
  return parseFloat(
    (pricePerPlatform?.[platform]?.[metric] * totalMetric).toFixed(2)
  )
}

const percentageOfTotalBountyEarned = (
  userTotal,
  totalBounty,
  bountyAfterCommission
) => {
  const percentageOfTotalBountyEarned = parseFloat(
    ((userTotal / totalBounty) * 100).toFixed(2)
  )
  return parseFloat(
    ((percentageOfTotalBountyEarned / 100) * bountyAfterCommission).toFixed(2)
  )
}

const updateBountyReceived = async (_id, bountyToBePaid) => {
  const challengeParticipationModel = new ChallengeParticipation()
  await challengeParticipationModel.updateBountyReceived(_id, bountyToBePaid)
}

const calculateCommissions = (
  type,
  userTotalBounty,
  bountyAfterCommission,
  commissionRate
) => {
  if (type === 'company') {
    return parseFloat(
      ((commissionRate / 100) * bountyAfterCommission).toFixed(2)
    )
  }
  if (type === 'agency' || type === 'introducingAgency') {
    return parseFloat(((commissionRate / 100) * userTotalBounty).toFixed(2))
  }
}

const getAgencyDetails = async userId => {
  const affiliateModel = new Affiliate()
  const agency = await affiliateModel.getAgencyAndParentAgency(userId)
  const introducingAgency = await affiliateModel.getAgencyAndParentAgency(
    agency.agency._id
  )
  return {
    agency,
    introducingAgency
  }
}

const getParticipantsDetails = async challengeId => {
  const challengeParticipationModel = new ChallengeParticipation()
  return await challengeParticipationModel.getUserBountyReceived(challengeId)
}

const distributeBounty = async (
  bountyInvested,
  participants,
  totalBounty,
  challengeId
) => {
  const COMPANY_COMMISSION = 5
  let totalCommission = 0
  const resArray = []

  const { commission, bountyAfterCommission } = deductCommission(bountyInvested)

  if (totalBounty > bountyAfterCommission) {
    const updateUserBountyReceived = participants.map(participant =>
      updateBountyReceived(
        participant._id,
        percentageOfTotalBountyEarned(
          participant.userTotal,
          totalBounty,
          bountyAfterCommission
        )
      )
    )
    await Promise.all(updateUserBountyReceived)
  }

  const participantDetails = await getParticipantsDetails(challengeId)
  const participantAgencyPromises = participantDetails.userTotals.map(
    async participant => {
      const { agency, introducingAgency } = await getAgencyDetails(
        participant.userId
      )

      if (agency) {
        const agencyCommission = calculateCommissions(
          'agency',
          participant.userTotal,
          bountyAfterCommission,
          introducingAgency ? 7 : 7.5
        )

        const introducingAgencyCommission = introducingAgency
          ? calculateCommissions(
              'introducingAgency',
              participant.userTotal,
              bountyAfterCommission,
              0.5
            )
          : 0

        resArray.push({
          userTotalBounty: participant.userTotal,
          postMetrics: participant.postMetrics,
          name: participant.name,
          wallet: participant.wallet,
          initialBounty: participant.initialBounty,
          Agency: {
            Name: agency.agency.name,
            Wallet: agency.agency.wallet,
            agencyCommission
          },
          introducingAgency: introducingAgency
            ? {
                Name: introducingAgency.agency.name,
                Wallet: introducingAgency.agency.wallet,
                introducingAgencyCommission
              }
            : {
                Name: null,
                Wallet: null,
                introducingAgencyCommission: null
              }
        })

        totalCommission += agencyCommission + (introducingAgencyCommission || 0)
      }
    }
  )

  await Promise.all(participantAgencyPromises)

  const companyCommission = calculateCommissions(
    'company',
    0,
    bountyAfterCommission,
    COMPANY_COMMISSION
  )
  totalCommission += companyCommission

  return {
    bountyInvested,
    bountyAfterCommission,
    commission,
    soiCommission: companyCommission,
    totalCommission: parseFloat(totalCommission.toFixed(2)),
    commissionWalletBalance: parseFloat(
      (commission - totalCommission).toFixed(2)
    ),
    bountyRemaining: parseFloat(
      (bountyAfterCommission - participantDetails.totalBountyAllUsers).toFixed(
        2
      )
    ),
    Distribution: resArray
  }
}

// Distribute bounty in job
const distributeBountyInJob = async (
  bountyInvested,
  participants,
  totalBounty,
  challengeId,
  user
) => {
  const COMPANY_COMMISSION = 5
  const distributionDetails = []
  let totalCommission = 0

  const { commission, bountyAfterCommission } = deductCommission(bountyInvested)

  if (totalBounty > bountyAfterCommission) {
    const updateUserBountyReceived = participants.map(participant =>
      updateBountyReceived(
        participant._id,
        percentageOfTotalBountyEarned(
          participant.userTotal,
          totalBounty,
          bountyAfterCommission
        )
      )
    )
    await Promise.all(updateUserBountyReceived)
  }

  const participantDetails = await getParticipantsDetails(challengeId)
  const participantAgencyPromises = participantDetails.userTotals.map(
    async participant => {
      const { agency, introducingAgency } = await getAgencyDetails(
        participant.userId
      )
      if (agency) {
        const agencyCommission = calculateCommissions(
          'agency',
          participant.userTotal,
          bountyAfterCommission,
          introducingAgency ? 7 : 7.5
        )
        const introducingAgencyCommission = introducingAgency
          ? calculateCommissions(
              'introducingAgency',
              participant.userTotal,
              bountyAfterCommission,
              0.5
            )
          : 0

        distributionDetails.push({
          [participant.wallet]: participant.userTotal,
          [agency.agency.wallet]: agencyCommission,
          ...(introducingAgency && {
            [introducingAgency.agency.wallet]: introducingAgencyCommission
          })
        })

        totalCommission += agencyCommission + introducingAgencyCommission
      }
    }
  )

  await Promise.all(participantAgencyPromises)

  const companyCommission = calculateCommissions(
    'company',
    0,
    bountyAfterCommission,
    COMPANY_COMMISSION
  )
  totalCommission += companyCommission

  const bountyRemaining = parseFloat(
    (bountyAfterCommission - participantDetails.totalBountyAllUsers).toFixed(2)
  )
  const commissionBalance = parseFloat(
    (commission - totalCommission).toFixed(2)
  )

  distributionDetails.push({
    [user]: bountyRemaining + commissionBalance,
    [process.env.SOI_ADMIN_WALLET]: companyCommission
  })
  const mergedObject = distributionDetails.reduce((result, current) => {
    for (const [key, value] of Object.entries(current)) {
      result[key] = (result[key] || 0) + value
    }
    return result
  }, {})

  // Convert wallet to checksum
  const wallets = Object.keys(mergedObject).map(value =>
    Web3.utils.toChecksumAddress(value)
  )

  // Convert amount towei
  const amounts = Object.values(mergedObject).map(value =>
    Web3.utils.toWei(value.toString(), 'ether')
  )

  return { wallets, amounts }
}

const returnBounty = (wallet, bounty) => {
  let wallets = [], amounts = []
  wallets.push(Web3.utils.toChecksumAddress(wallet))
  amounts.push(Web3.utils.toWei(bounty.toString(), 'ether'))
  return { wallets, amounts }
}

module.exports = {
  pricePerPostMetrics,
  distributeBounty,
  distributeBountyInJob,
  returnBounty
}
