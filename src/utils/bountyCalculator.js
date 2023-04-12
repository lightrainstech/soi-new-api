'use strict'

// Price for posts per platform
const pricePerPlatform = {
  facebook: {
    post: 45,
    share: 0.40,
    comment: 0.05,
    like: 0.01,
  },
  instagram: {
    post: 50,
    share: 0.40,
    comment: 0.05,
    like: 0.01,
  },
  twitter: {
    post: 50,
    share: 0.40,
    comment: 0.05,
    like: 0.01,
  },
  youtube: {
    post: 60,
    comment: 1,
    like: 0.01,
    view: 0.50
  },
  tiktok: {
    post: 40,
    comment: 0.03,
    like: 0.01,
    play: 0.02,
    share: 0.30,
  },
}

// Deduct 20% commissions from the bounty offered
const deductCommission = (busdFund) => {
  const percentToBeDeducted = 20
  return ((percentToBeDeducted / 100) * busdFund).toFixed(2)
}

const getPricePerPost = (platform, metric) => {
  return pricePerPlatform?.[platform]?.[metric] ?? null
}
