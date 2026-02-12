const db = require('../../db');

async function isSubscriptionActive(userId) {
  const result = await db.query(
    `SELECT subscription_status, subscription_end
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return { active: false };
  }

  const user = result.rows[0];
  const hasStatus = user.subscription_status === 'active';
  const hasFutureEndDate = user.subscription_end && new Date(user.subscription_end) > new Date();

  return {
    active: Boolean(hasStatus && hasFutureEndDate)
  };
}

module.exports = {
  isSubscriptionActive
};
