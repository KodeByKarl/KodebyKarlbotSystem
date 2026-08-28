/**
 * Helper to convert Discord User Flags / Badges into plain human-readable text.
 * @param {import('discord.js').User} user 
 * @returns {string} Formatted badges list
 */
function getFormattedBadges(user) {
  const flags = user.flags?.toArray() || [];
  if (flags.length === 0) return 'None';

  const badgeMap = {
    Staff: 'Discord Employee',
    Partner: 'Partnered Server Owner',
    HypeSquadEvents: 'HypeSquad Events Coordinator',
    BugHunterLevel1: 'Bug Hunter (Tier 1)',
    BugHunterLevel2: 'Bug Hunter (Tier 2)',
    HypeSquadOnlineHouse1: 'HypeSquad Bravery',
    HypeSquadOnlineHouse2: 'HypeSquad Brilliance',
    HypeSquadOnlineHouse3: 'HypeSquad Balance',
    PremiumEarlySupporter: 'Early Supporter',
    TeamPseudoUser: 'Team User',
    VerifiedBot: 'Verified Bot',
    VerifiedDeveloper: 'Early Verified Bot Developer',
    CertifiedModerator: 'Moderator Programs Alumni',
    ActiveDeveloper: 'Active Developer'
  };

  return flags.map((flag) => badgeMap[flag] || flag).join(', ');
}

module.exports = { getFormattedBadges };
