const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

/**
 * Helper to deploy or update the Dev-Github & Script Commit Updates Panel in DEV_GITHUB_CHANNEL_ID.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').Client} client 
 */
async function deployDevGithub(guild, client) {
  try {
    const channelId = process.env.DEV_GITHUB_CHANNEL_ID || config.DEV_GITHUB_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[DEV GITHUB ERROR] Dev-Github channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const devGithubEmbed = new EmbedBuilder()
      .setTitle('KODEBYKARL.NET - Dev GitHub & Script Commit Logs')
      .setColor(0x5865F2)
      .setImage(config.EMBED_IMAGE_URL)
      .setDescription(
        `Welcome to the official **Dev-Github & Script Updates** channel!\n\n` +
        `Here you will find real-time logs, commit history, and release updates for all KodebyKarl FiveM scripts.\n\n` +
        `**What gets posted here:**\n` +
        `• **Script Release & Commit Updates**: Latest code changes and patch releases.\n` +
        `• **Framework Compatibility Upgrades**: QB-Core, ESX, & Standalone framework enhancements.\n` +
        `• **Bug Fixes & Security Audits**: Community-reported fix deployments.\n` +
        `• **Repository Links**: Quick access to official documentation & code repositories.\n\n` +
        `Stay tuned for live updates as we continually upgrade the script catalog!`
      )
      .setFooter({ text: 'KODEBYKARL.NET - Dev Updates' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('GitHub Profile')
        .setStyle(ButtonStyle.Link)
        .setURL(config.GITHUB_URL),
      new ButtonBuilder()
        .setLabel('Documentation')
        .setStyle(ButtonStyle.Link)
        .setURL(config.DOCS_URL),
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(config.WEBSITE_URL)
    );

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const existingDevPanel = messages?.find(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title === 'KODEBYKARL.NET - Dev GitHub & Script Commit Logs'
    );

    if (existingDevPanel) {
      await existingDevPanel.edit({ embeds: [devGithubEmbed], components: [row] });
      console.log('[DEV GITHUB] Existing Dev-Github panel updated.');
    } else {
      await channel.send({ embeds: [devGithubEmbed], components: [row] });
      console.log('[DEV GITHUB] Dev-Github panel posted successfully.');
    }
  } catch (err) {
    console.error('[DEV GITHUB ERROR] Failed to deploy Dev-Github panel:', err);
  }
}

module.exports = { deployDevGithub };
