const config = require('../config');

/**
 * Reusable helper to send log messages or embeds to the staff log channel.
 * @param {import('discord.js').Guild} guild 
 * @param {string | { embeds: Array, files?: Array }} payload 
 */
async function logToChannel(guild, payload) {
  try {
    const channelId = process.env.LOG_CHANNEL_ID || config.LOG_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[LOG ERROR] Log channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    if (typeof payload === 'string') {
      await channel.send({ content: payload });
    } else {
      await channel.send(payload);
    }
  } catch (err) {
    console.error('[LOG ERROR] Exception occurred while logging to channel:', err);
  }
}

module.exports = { logToChannel };
