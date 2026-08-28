const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

/**
 * Helper to deploy or update the Server Info Panel in SERVER_INFO_CHANNEL_ID.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').Client} client 
 */
async function deployServerInfo(guild, client) {
  try {
    const channelId = process.env.SERVER_INFO_CHANNEL_ID || config.SERVER_INFO_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[SERVER INFO ERROR] Server info channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const infoEmbed = new EmbedBuilder()
      .setTitle('Welcome to KODEBYKARL.NET')
      .setColor(0x5865F2)
      .setImage(config.EMBED_IMAGE_URL)
      .setDescription(
        'Everything about the store lives right here in this channel.\n\n' +
        `Discord: [${config.DISCORD_INVITE_URL}](${config.DISCORD_INVITE_URL})\n` +
        `Website: [${config.WEBSITE_URL}](${config.WEBSITE_URL})\n` +
        `Docs: [${config.DOCS_URL}](${config.DOCS_URL})`
      )
      .setFooter({ text: 'KODEBYKARL.NET' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Discord Server')
        .setStyle(ButtonStyle.Link)
        .setURL(config.DISCORD_INVITE_URL),
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(config.WEBSITE_URL),
      new ButtonBuilder()
        .setLabel('Documentation')
        .setStyle(ButtonStyle.Link)
        .setURL(config.DOCS_URL)
    );

    const messageContent =
      `Welcome to KODEBYKARL.NET — everything about the store lives right here in this channel.\n\n` +
      `Discord: ${config.DISCORD_INVITE_URL}\n` +
      `Website: ${config.WEBSITE_URL}\n` +
      `Docs: ${config.DOCS_URL}\n\n` +
      `${config.DISCORD_INVITE_URL}`;

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const existingInfo = messages?.find(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title === 'Welcome to KODEBYKARL.NET'
    );

    if (existingInfo) {
      await existingInfo.edit({ content: messageContent, embeds: [infoEmbed], components: [row] });
      console.log('[SERVER INFO] Existing server info panel updated.');
    } else {
      await channel.send({ content: messageContent, embeds: [infoEmbed], components: [row] });
      console.log('[SERVER INFO] Server info panel posted successfully.');
    }
  } catch (err) {
    console.error('[SERVER INFO ERROR] Failed to deploy server info panel:', err);
  }
}

module.exports = { deployServerInfo };
