const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

/**
 * Helper to deploy or update the DeathScreen Script Showcase Panel in DEATHSCREEN_CHANNEL_ID.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').Client} client 
 */
async function deployDeathScreenPanel(guild, client) {
  try {
    const channelId = process.env.DEATHSCREEN_CHANNEL_ID || config.DEATHSCREEN_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[DEATHSCREEN PANEL ERROR] Channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    // Main Feature & Guide Embed (Clean format, NO icons/emojis)
    const mainEmbed = new EmbedBuilder()
      .setTitle('CFX-KEYDI-DEATHSCREEN | SCRIPT SHOWCASE')
      .setColor(0x5865F2)
      .setImage('https://r2.fivemanage.com/7qoUgFxV85h3Czm85xGbV/ddd.png')
      .setDescription(
        'Welcome to the official feature overview and guide for **cfx-keydi-deathscreen**.\n\n' +
        'This script provides an advanced 3D killer camera preview, combat exchange details, bone hit zone tracking, custom death backgrounds, custom sound effects, and full in-game NUI management for FiveM servers.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '### Key Features\n\n' +
        '• **3D Live Killer Camera & Ped Preview**: Smoothly focuses a dynamic 3D camera onto the killer\'s in-game ped during the death screen recap.\n' +
        '• **Detailed Combat Exchange Breakdown**: Calculates exact kill distance, total damage dealt vs. received, killer\'s weapon name, and active killstreak.\n' +
        '• **Bone Hit Zone System**: Real-time GTA V bone mapping tracking headshots, neck hits, torso damage, arm shots, and leg hits.\n' +
        '• **Custom Death Backgrounds & Audio**: Supports animated GIF/image backgrounds and custom audio links played on death recap per player.\n' +
        '• **Graphical NUI Admin Panel (`/deaths` / `/deathbg`)**: In-game NUI dashboard for admins and staff to assign custom background URLs, sounds, and volume levels.\n' +
        '• **Self-Service Player Commands**: Players can set (`/setdeathbg`) or clear (`/cleardeathbg`) their custom death screen background easily.\n' +
        '• **Stationary Test NPC System**: Spawns a frozen test NPC (`/spawntestnpc`) to test damage registration and bone hit zone accuracy.\n' +
        '• **Persistent JSON Storage**: Stores all player background data cleanly in `data/backgrounds.json`.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '### In-Game Commands Guide\n\n' +
        '• **`/deaths` or `/deathbg`** — Opens the interactive Admin NUI Management Panel *(Requires Staff/Admin permissions)*.\n' +
        '• **`/setdeathbg <image_or_gif_url> [sound_url]`** — Set your custom death screen background image/GIF and audio URL.\n' +
        '• **`/cleardeathbg`** — Reset and clear your custom death screen background back to default.\n' +
        '• **`/spawntestnpc [kill|clear]`** — Spawns a stationary test NPC to test weapon damage registration and hit zones.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '### Configuration Parameters (`config.lua`)\n\n' +
        '• **`ConfigDeathScreen.Enabled`**: Master toggle to enable/disable the death screen system.\n' +
        '• **`ConfigDeathScreen.Brand`**: Brand header title displayed on the death recap card (e.g. `PANDORA CITY`).\n' +
        '• **`ConfigDeathScreen.BrandUrl`**: Brand web URL displayed on the card (e.g. `pandora.city`).\n' +
        '• **`ConfigDeathScreen.AllowedGroups`**: Staff permission group list (`admin`, `superadmin`, `god`, `mod`).\n' +
        '• **`ConfigDeathScreen.RecentKillLimit`**: Maximum recent kills tracked in killer profile history.'
      );

    // Showcase Image Embed 1
    const showcaseEmbed1 = new EmbedBuilder()
      .setTitle('IN-GAME SHOWCASE & RECAP PREVIEW')
      .setColor(0x2B2D31)
      .setImage('https://r2.fivemanage.com/7qoUgFxV85h3Czm85xGbV/sss.png');

    // Showcase Image Embed 2
    const showcaseEmbed2 = new EmbedBuilder()
      .setTitle('IN-GAME COMBAT & BONE ZONE PREVIEW')
      .setColor(0x2B2D31)
      .setImage('https://r2.fivemanage.com/7qoUgFxV85h3Czm85xGbV/ffsd.png')
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
      (m) => m.author.id === client.user.id && m.embeds[0]?.title === 'CFX-KEYDI-DEATHSCREEN | SCRIPT SHOWCASE'
    );

    if (existing) {
      await existing.edit({ embeds: [mainEmbed, showcaseEmbed1, showcaseEmbed2], components: [row] });
      console.log('[DEATHSCREEN PANEL] Existing DeathScreen showcase panel updated.');
    } else {
      await channel.send({ embeds: [mainEmbed, showcaseEmbed1, showcaseEmbed2], components: [row] });
      console.log('[DEATHSCREEN PANEL] DeathScreen showcase panel posted successfully.');
    }
  } catch (err) {
    console.error('[DEATHSCREEN PANEL ERROR] Failed to deploy DeathScreen panel:', err);
  }
}

module.exports = { deployDeathScreenPanel };
