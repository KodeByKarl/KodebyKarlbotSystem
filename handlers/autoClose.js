const { EmbedBuilder } = require('discord.js');
const { loadTickets, saveTickets } = require('../utils/database');
const { logToChannel } = require('../utils/logger');

/**
 * 24-Hour Inactivity Auto-Close Check Function
 * @param {import('discord.js').Client} client 
 */
async function checkInactiveTickets(client) {
  try {
    const tickets = loadTickets();
    if (tickets.length === 0) return;

    const now = Date.now();
    const INACTIVITY_LIMIT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const remainingTickets = [];

    for (const ticket of tickets) {
      const lastActive = ticket.lastActivity || ticket.createdAt;
      const inactiveMs = now - lastActive;

      if (inactiveMs >= INACTIVITY_LIMIT) {
        console.log(`[AUTO-CLOSE] Ticket channel ${ticket.channelId} has been inactive for over 24 hours.`);

        const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
        if (channel && channel.isTextBased()) {
          const autoCloseEmbed = new EmbedBuilder()
            .setTitle('Ticket Auto-Closed')
            .setColor(0xE74C3C)
            .setDescription(
              `This ticket has been automatically closed due to 24 hours of inactivity without a response.\n` +
              `This channel will be deleted in 10 seconds.`
            )
            .setTimestamp();

          await channel.send({ embeds: [autoCloseEmbed] }).catch(() => {});

          if (channel.guild) {
            await logToChannel(channel.guild, {
              embeds: [
                new EmbedBuilder()
                  .setTitle('Ticket Auto-Closed (24h Inactivity)')
                  .setColor(0xE74C3C)
                  .setDescription(
                    `Channel Name: #${channel.name}\n` +
                    `Channel ID: ${channel.id}\n` +
                    `Ticket Creator ID: ${ticket.userId}\n` +
                    `Category: ${ticket.category}\n` +
                    `Inactivity Duration: 24 Hours`
                  )
                  .setTimestamp()
              ]
            });
          }

          setTimeout(() => {
            channel.delete('Ticket auto-closed due to 24 hours of inactivity.').catch(() => {});
          }, 10000);
        }
      } else {
        remainingTickets.push(ticket);
      }
    }

    if (tickets.length !== remainingTickets.length) {
      saveTickets(remainingTickets);
    }
  } catch (err) {
    console.error('[AUTO-CLOSE ERROR] Error during inactive tickets check:', err);
  }
}

module.exports = { checkInactiveTickets };
