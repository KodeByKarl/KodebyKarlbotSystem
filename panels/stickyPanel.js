const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

// Memory variable to track last sticky message ID in channel
let lastStickyMessageId = null;

/**
 * Helper to deploy or re-anchor the Sticky Note embed at the bottom of STICKY_CHANNEL_ID.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').Client} client 
 * @param {boolean} forceResend If true, deletes existing sticky message and posts a fresh one at bottom.
 */
async function deployStickyNote(guild, client, forceResend = false) {
  try {
    const channelId = process.env.STICKY_CHANNEL_ID || config.STICKY_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[STICKY ERROR] Sticky channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const stickyEmbed = new EmbedBuilder()
      .setTitle('📌 KODEBYKARL.NET - Official Store Info & Support Guide')
      .setColor(0xF1C40F)
      .setImage(config.EMBED_IMAGE_URL)
      .setDescription(
        `Welcome to **KodebyKarl.net** — your destination for high-quality, framework-ready FiveM custom scripts!\n\n` +
        `**Store Information & Quick Navigation:**\n` +
        `• **Official Website Catalog**: Browse custom scripts at [kodebykarl.vercel.app](${config.WEBSITE_URL})\n` +
        `• **Documentation**: Read setup guides & config docs at [GitBook Docs](${config.DOCS_URL})\n` +
        `• **Script Commit Updates**: Track code changelogs in <#${config.DEV_GITHUB_CHANNEL_ID}>\n` +
        `• **Customer Reviews & Ratings**: Read verified feedback in <#${config.REVIEWS_CHANNEL_ID}>\n\n` +
        `**Need Assistance or Have Questions?**\n` +
        `If you have any questions, script inquiries, or need technical support, **don't hesitate to ping our Staff team or open a ticket in <#${config.TICKET_PANEL_CHANNEL_ID}>!**`
      )
      .setFooter({ text: '📌 Sticky Note • Automatically anchored at bottom of channel' })
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

    // Delete existing sticky note if tracked
    if (lastStickyMessageId) {
      const oldMsg = await channel.messages.fetch(lastStickyMessageId).catch(() => null);
      if (oldMsg) {
        await oldMsg.delete().catch(() => {});
      }
      lastStickyMessageId = null;
    }

    // Scan recent messages for any old sticky note sent by bot
    const recentMessages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const existingSticky = recentMessages?.find(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title?.includes('📌 KODEBYKARL.NET - Official Store Info')
    );

    if (existingSticky && !forceResend) {
      await existingSticky.edit({ embeds: [stickyEmbed], components: [row] });
      lastStickyMessageId = existingSticky.id;
      console.log('[STICKY NOTE] Existing Sticky Note updated.');
    } else {
      if (existingSticky) {
        await existingSticky.delete().catch(() => {});
      }
      const newSticky = await channel.send({ embeds: [stickyEmbed], components: [row] });
      lastStickyMessageId = newSticky.id;
      console.log('[STICKY NOTE] Sticky Note posted at bottom of channel.');
    }
  } catch (err) {
    console.error('[STICKY NOTE ERROR] Failed to deploy Sticky Note:', err);
  }
}

module.exports = { deployStickyNote };
