const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

/**
 * Helper to deploy or update the main Announcements in LANDING_CHANNEL_ID.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').Client} client 
 */
async function deployLandingPage(guild, client) {
  try {
    const channelId = process.env.LANDING_CHANNEL_ID || config.LANDING_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[LANDING ERROR] Announcement channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);

    // 1. Original Store Welcome Announcement
    const originalWelcomeText =
      `Wanted to drop a quick update about what's coming to the store. Up to now, I've been offering a mix of free and paid scripts for the FiveM community here in the Philippines.\n\n` +
      `Starting today, that's changing — I'll be rolling out a new lineup of scripts available for purchase. The biggest upgrade this time around is broader framework compatibility, so you won't run into the dependency headaches or setup conflicts that sometimes came up before. These are built to drop straight into your server without the extra hassle.\n\n` +
      `My goal stays the same: deliver solid, reliable scripts that actually keep up with what this community needs. Thanks for the continued support — welcome to KodeByKarl, and let's keep pushing the FiveM experience forward together.`;

    const originalEmbed = new EmbedBuilder()
      .setTitle('Welcome to KODEBYKARL.NET')
      .setColor(0x5865F2)
      .setDescription(originalWelcomeText)
      .setImage(config.EMBED_IMAGE_URL)
      .setFooter({ text: 'KODEBYKARL.NET - Premium FiveM Scripts' })
      .setTimestamp();

    const originalRow = new ActionRowBuilder().addComponents(
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

    const existingOriginal = messages?.find(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title === 'Welcome to KODEBYKARL.NET'
    );

    if (existingOriginal) {
      await existingOriginal.edit({ embeds: [originalEmbed], components: [originalRow] });
    } else {
      await channel.send({ embeds: [originalEmbed], components: [originalRow] });
    }

    // 2. New Script Release Announcement
    const releaseText =
      'We are excited to announce major new custom script additions now live in our store catalog!\n\n' +
      'Our latest releases feature comprehensive framework compatibility, optimized performance, and modern NUI interfaces for FiveM servers.\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '### New Script Releases\n\n' +
      '• **CFX-KEYDI-WELCOMEBANNER**\n' +
      'An animated NUI welcome banner system featuring custom player popups, custom sound effects, client volume controls, and an in-game graphical NUI admin management panel.\n' +
      'Channel Showcase: <#1543145335931539516>\n\n' +
      '• **CFX-KEYDI-DEATHSCREEN**\n' +
      'A death screen recap system featuring a 3D killer camera preview, combat exchange statistics, bone hit zone tracking, custom death backgrounds, and in-game NUI administration.\n' +
      'Channel Showcase: <#1543145334312800306>\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '### Key Features & Benefits\n\n' +
      '• **Broad Framework Support**: Built with seamless compatibility for ESX, QB-Core, and Standalone setups.\n' +
      '• **In-Game NUI Dashboards**: Staff can manage settings, backgrounds, and player profiles directly in-game without server restarts.\n' +
      '• **High Performance**: Cleanly structured modular code optimized for minimal resource latency.\n\n' +
      'For complete documentation, script previews, and purchase details, visit our official links below.';

    const releaseEmbed = new EmbedBuilder()
      .setTitle('KODEBYKARL.NET | OFFICIAL SCRIPT RELEASE ANNOUNCEMENT')
      .setColor(0x5865F2)
      .setDescription(releaseText)
      .setImage(config.EMBED_IMAGE_URL)
      .setFooter({ text: 'KodebyKarl.net | Premium FiveM Custom Scripts' })
      .setTimestamp();

    const releaseRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(config.WEBSITE_URL),
      new ButtonBuilder()
        .setLabel('Documentation')
        .setStyle(ButtonStyle.Link)
        .setURL(config.DOCS_URL),
      new ButtonBuilder()
        .setLabel('Discord Server')
        .setStyle(ButtonStyle.Link)
        .setURL(config.DISCORD_INVITE_URL)
    );

    const existingRelease = messages?.find(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title === 'KODEBYKARL.NET | OFFICIAL SCRIPT RELEASE ANNOUNCEMENT'
    );

    if (existingRelease) {
      await existingRelease.edit({ embeds: [releaseEmbed], components: [releaseRow] });
    } else {
      await channel.send({ embeds: [releaseEmbed], components: [releaseRow] });
    }

    console.log('[LANDING PAGE] Both announcements deployed without deleting any chat messages.');
  } catch (err) {
    console.error('[LANDING ERROR] Failed to deploy landing page announcements:', err);
  }
}

module.exports = { deployLandingPage };
