const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

/**
 * Helper to deploy or update the Welcome Banner Script Showcase Panel in WELCOME_BANNER_CHANNEL_ID.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').Client} client 
 */
async function deployWelcomeBannerPanel(guild, client) {
  try {
    const channelId = process.env.WELCOME_BANNER_CHANNEL_ID || config.WELCOME_BANNER_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[WELCOME BANNER PANEL ERROR] Channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    // Main Feature & Guide Embed (Clean format, NO icons/emojis)
    const mainEmbed = new EmbedBuilder()
      .setTitle('CFX-KEYDI-WELCOMEBANNER | SCRIPT SHOWCASE')
      .setColor(0x5865F2)
      .setImage('https://r2.fivemanage.com/7qoUgFxV85h3Czm85xGbV/wec.png')
      .setDescription(
        'Welcome to the official feature overview and guide for **cfx-keydi-welcomebanner**.\n\n' +
        'This script provides a modern, animated NUI welcome banner system with custom audio, interactive NUI admin management, and full identifier normalization for FiveM servers.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '### Key Features\n\n' +
        '• **Animated Custom Banners**: Automatically displays animated NUI GIF/image popups with custom sound effects when designated players join.\n' +
        '• **Graphical NUI Admin Panel (`/wcb`)**: In-game management dashboard for staff to add, edit, test, or remove player welcome banners.\n' +
        '• **Sound & Volume Control**: Custom audio link support per banner plus client-side master volume adjustment (`/wcbvol`) saved in client KVP storage.\n' +
        '• **Identifier Auto-Normalization**: Supports ESX licenses, License2, Steam ID, Discord ID, Live, XBL, and IP identifiers.\n' +
        '• **Online Player Selector**: Pick connected players directly from a dropdown menu in the NUI panel without manually typing identifiers.\n' +
        '• **Custom Sizing & Timing**: Configure banner width, height, max bounds, screen position, and display duration per player.\n' +
        '• **Persistent Storage**: All banner data is automatically saved and managed in `data/players.json`.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '### In-Game Commands Guide\n\n' +
        '• **`/wcb`** — Opens the interactive Admin NUI Management Panel *(Requires Staff/Admin permissions)*.\n' +
        '• **`/wcbvol`** — Opens the local Master Volume adjustment modal for players.\n' +
        '• **`/wcbadd <identifier> <gif_url> [sound_url] [volume]`** — Add or update a player welcome banner via chat command.\n' +
        '• **`/wcbdel <identifier>`** — Remove a player\'s welcome banner from the system.\n' +
        '• **`/wcbtest`** — Instantly preview and test your active welcome banner.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '### Configuration Parameters (`config.lua`)\n\n' +
        '• **`ConfigWelcomeBanner.Enabled`**: Master toggle to enable/disable the welcome banner system.\n' +
        '• **`ConfigWelcomeBanner.AllowedGroups`**: Configures staff groups allowed to access `/wcb` (`admin`, `superadmin`, `god`, `mod`).\n' +
        '• **`ConfigWelcomeBanner.DefaultDuration`**: Set default banner display duration in seconds (Default: `8s`).\n' +
        '• **`ConfigWelcomeBanner.Width / Height`**: Default banner display dimensions (`380x220` px).\n' +
        '• **`ConfigWelcomeBanner.DefaultVolume`**: Default audio volume level (`0.0` to `1.0`).'
      );

    // Showcase Image Embed (Clean format, NO icons/emojis)
    const showcaseEmbed = new EmbedBuilder()
      .setTitle('IN-GAME SHOWCASE & PREVIEW')
      .setColor(0x2B2D31)
      .setImage('https://r2.fivemanage.com/7qoUgFxV85h3Czm85xGbV/wecshowcase.png')
      .setFooter({ text: 'Powered by KodebyKarl.net | FiveM Custom Scripts' })
      .setTimestamp();

    // Buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(config.WEBSITE_URL),
      new ButtonBuilder()
        .setLabel('Documentation')
        .setStyle(ButtonStyle.Link)
        .setURL(config.DOCS_URL),
      new ButtonBuilder()
        .setLabel('Discord Support')
        .setStyle(ButtonStyle.Link)
        .setURL(config.DISCORD_INVITE_URL)
    );

    const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
    const existing = messages?.find(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title === 'CFX-KEYDI-WELCOMEBANNER | SCRIPT SHOWCASE'
    );

    if (existing) {
      await existing.edit({ embeds: [mainEmbed, showcaseEmbed], components: [row] });
      console.log('[WELCOME BANNER PANEL] Existing showcase panel updated.');
    } else {
      await channel.send({ embeds: [mainEmbed, showcaseEmbed], components: [row] });
      console.log('[WELCOME BANNER PANEL] Clean showcase panel posted successfully.');
    }
  } catch (err) {
    console.error('[WELCOME BANNER PANEL ERROR] Failed to deploy panel:', err);
  }
}

module.exports = { deployWelcomeBannerPanel };
