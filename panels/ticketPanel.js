const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

/**
 * Helper to deploy or update the Ticket Creation Panel in TICKET_PANEL_CHANNEL_ID.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').Client} client 
 */
async function deployTicketPanel(guild, client) {
  try {
    const channelId = process.env.TICKET_PANEL_CHANNEL_ID || config.TICKET_PANEL_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[TICKET PANEL ERROR] Ticket panel channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const panelEmbed = new EmbedBuilder()
      .setTitle('Welcome to FiveM Custom Script Shop Tickets')
      .setColor(0x5865F2)
      .setImage(config.EMBED_IMAGE_URL)
      .setDescription(
        'Create a ticket by clicking one of the buttons below!\n\n' +
        'You can only create 3 ticket(s) at the same time!\n\n' +
        'Sales Inquiry\n' +
        'Create this ticket if you have a sales or purchase inquiry.\n\n' +
        'Service Renewals\n' +
        'Create this ticket if you need service or script renewals.\n\n' +
        'Technical Support\n' +
        'Create this ticket if you need technical support.\n\n' +
        'Partnership Inquiry\n' +
        'Create this ticket if you have a partnership or custom project inquiry.'
      )
      .setFooter({ text: 'Powered by FiveM Custom Script Shop' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_ticket_sales')
        .setLabel('Sales Inquiry')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn_ticket_renewals')
        .setLabel('Service Renewals')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('btn_ticket_support')
        .setLabel('Technical Support')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn_ticket_partnership')
        .setLabel('Partnership Inquiry')
        .setStyle(ButtonStyle.Secondary)
    );

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const existingPanel = messages?.find(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title === 'Welcome to FiveM Custom Script Shop Tickets'
    );

    if (existingPanel) {
      await existingPanel.edit({ embeds: [panelEmbed], components: [row] });
      console.log('[TICKET PANEL] Existing ticket panel updated.');
    } else {
      await channel.send({ embeds: [panelEmbed], components: [row] });
      console.log('[TICKET PANEL] Ticket panel posted successfully.');
    }
  } catch (err) {
    console.error('[TICKET PANEL ERROR] Failed to deploy ticket panel:', err);
  }
}

module.exports = { deployTicketPanel };
