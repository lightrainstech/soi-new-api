'use strict'
const ChallengeParticipation = require('../models/challengeParticipationModel')
const Affiliate = require('../models/affiliateModel')

// Price for posts per platform
const pricePerPlatform = {
  facebook: {
    post: 45,
    share: 0.4,
    comment: 0.05,
    like: 0.01
  },
  instagram: {
    post: 50,
    share: 0.4,
    comment: 0.05,
    like: 0.01
  },
  twitter: {
    post: 50,
    share: 0.4,
    comment: 0.05,
    like: 0.01
  },
  youtube: {
    post: 60,
    comment: 1,
    like: 0.01,
    view: 0.5
  },
  tiktok: {
    post: 40,
    comment: 0.03,
    like: 0.01,
    play: 0.02,
    share: 0.3
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
  return pricePerPlatform?.[platform]?.[metric] * totalMetric
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
  // Agency commissions
  const COMPANY_COMMISSION = 5

  let totalCommission = 0

  // Deduct commissions
  const { commission, bountyAfterCommission } = deductCommission(bountyInvested)
  console.log(commission, bountyAfterCommission)
  // Check total bounty is greater than bounty invested
  if (totalBounty > bountyAfterCommission) {
    const updateUserBountyReceived = participants.map(participant => {
      const bountyToBePaid = percentageOfTotalBountyEarned(
        participant.totalBounty,
        totalBounty,
        bountyAfterCommission
      )
      return updateBountyReceived(participant._id, bountyToBePaid)
    })
    Promise.all(updateUserBountyReceived)
  }
  const participantDetails = await getParticipantsDetails(challengeId)
  const participantAgencyPromises = participantDetails.userTotals.map(
    async participant => {
      const { agency, introducingAgency } = await getAgencyDetails(
        participant.userId
      )
      if (agency && introducingAgency) {
        const agencyCommission = calculateCommissions(
          'agency',
          participant.userTotal,
          bountyAfterCommission,
          7
        )
        totalCommission += agencyCommission
        console.log(`Agency ${agency.agency.name} got: `, agencyCommission)
        const introducingAgencyCommission = calculateCommissions(
          'introducingAgency',
          participant.userTotal,
          bountyAfterCommission,
          0.5
        )
        totalCommission += introducingAgencyCommission
        console.log(
          `Parent Agency ${introducingAgency.agency.name} got: `,
          introducingAgencyCommission
        )
      }
      if (agency && !introducingAgency) {
        const agencyCommission = calculateCommissions(
          'agency',
          participant.userTotal,
          bountyAfterCommission,
          7.5
        )
        totalCommission += agencyCommission
        console.log(`Agency ${agency.agency.name} got: `, agencyCommission)
      }
      console.log('user total bounty', participant.userTotal)
    }
  )
  await Promise.all(participantAgencyPromises)
  const companyCommission = calculateCommissions(
    'company',
    0,
    bountyAfterCommission,
    COMPANY_COMMISSION
  )
  console.log('companyCommission', companyCommission)
  totalCommission += companyCommission
  console.log('total commission', parseFloat(totalCommission.toFixed(2)))
}

module.exports = {
  pricePerPostMetrics,
  distributeBounty
}
