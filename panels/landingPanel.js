const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');


/**
 * Helper to deploy or update the main Landing Page Announcement in LANDING_CHANNEL_ID.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').Client} client 
 */
async function deployLandingPage(guild, client) {
  try {
    const channelId = process.env.LANDING_CHANNEL_ID || config.LANDING_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[LANDING ERROR] Landing channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const messageText =
      `Wanted to drop a quick update about what's coming to the store. Up to now, I've been offering a mix of free and paid scripts for the FiveM community here in the Philippines.\n\n` +
      `Starting today, that's changing — I'll be rolling out a new lineup of scripts available for purchase. The biggest upgrade this time around is broader framework compatibility, so you won't run into the dependency headaches or setup conflicts that sometimes came up before. These are built to drop straight into your server without the extra hassle.\n\n` +
      `My goal stays the same: deliver solid, reliable scripts that actually keep up with what this community needs. Thanks for the continued support — welcome to KodeByKarl, and let's keep pushing the FiveM experience forward together.`;

    const landingEmbed = new EmbedBuilder()
      .setTitle('Welcome to KODEBYKARL.NET')
      .setColor(0x5865F2)
      .setDescription(messageText)
      .setImage(config.EMBED_IMAGE_URL)
      .setFooter({ text: 'KODEBYKARL.NET - Premium FiveM Scripts' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(config.WEBSITE_URL),
      new ButtonBuilder()
        .setLabel('Discord Server')
        .setStyle(ButtonStyle.Link)
        .setURL(config.DISCORD_INVITE_URL),
      new ButtonBuilder()
        .setLabel('Documentation')
        .setStyle(ButtonStyle.Link)
        .setURL(config.DOCS_URL)
    );

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const existingLanding = messages?.find(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title === 'Welcome to KODEBYKARL.NET'
    );

    if (existingLanding) {
      await existingLanding.edit({ embeds: [landingEmbed], components: [row] });
      console.log('[LANDING PAGE] Existing landing page announcement updated.');
    } else {
      await channel.send({ embeds: [landingEmbed], components: [row] });
      console.log('[LANDING PAGE] Landing page announcement posted successfully.');
    }
  } catch (err) {
    console.error('[LANDING ERROR] Failed to deploy landing page announcement:', err);
  }
}

module.exports = { deployLandingPage };
