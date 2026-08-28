const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { fetchFiveMServerStatus } = require('../services/fivem');

/**
 * Helper to deploy or update the Partnership & Collaboration Panel in PARTNERSHIP_CHANNEL_ID.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').Client} client 
 */
async function deployPartnership(guild, client) {
  try {
    const channelId = process.env.PARTNERSHIP_CHANNEL_ID || config.PARTNERSHIP_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[PARTNERSHIP ERROR] Partnership channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const partnershipEmbed = new EmbedBuilder()
      .setTitle('KODEBYKARL.NET - Official Partnerships & Sponsorships')
      .setColor(0x5865F2)
      .setImage(config.EMBED_IMAGE_URL)
      .setDescription(
        `Welcome to the official **Partnership & Collaboration** hub for KodebyKarl.net!\n\n` +
        `We are open to strategic partnerships with FiveM server owners, content creators, script developers, and gaming communities.\n\n` +
        `**Partnership & Collaboration Opportunities:**\n` +
        `• **Server Partnerships**: Custom script integration, cross-promotion, and server discounts.\n` +
        `• **Content Creators & Streamers**: Official script sponsorship, review units, and affiliate rewards.\n` +
        `• **Developer Collaborations**: Co-developed FiveM resources and framework integrations.\n` +
        `• **Custom Development**: Tailored server development and long-term tech support.\n\n` +
        `**How to Apply:**\n` +
        `To discuss a partnership or custom proposal, head over to <#${config.TICKET_PANEL_CHANNEL_ID}> and open a **Partnership Inquiry** ticket!`
      )
      .setFooter({ text: 'KODEBYKARL.NET - Partnership Program' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(config.WEBSITE_URL),
      new ButtonBuilder()
        .setLabel('Discord Invite')
        .setStyle(ButtonStyle.Link)
        .setURL(config.DISCORD_INVITE_URL),
      new ButtonBuilder()
        .setLabel('Documentation')
        .setStyle(ButtonStyle.Link)
        .setURL(config.DOCS_URL)
    );

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const existingPartnershipPanel = messages?.find(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title === 'KODEBYKARL.NET - Official Partnerships & Sponsorships'
    );

    if (existingPartnershipPanel) {
      await existingPartnershipPanel.edit({ embeds: [partnershipEmbed], components: [row] });
      console.log('[PARTNERSHIP] Existing Partnership panel updated.');
    } else {
      await channel.send({ embeds: [partnershipEmbed], components: [row] });
      console.log('[PARTNERSHIP] Partnership panel posted successfully.');
    }

    // -------------------------------------------------------------
    // Featured Partner 1: 1st Partnership & Live FiveM Server Metrics Showcase
    // -------------------------------------------------------------
    const statusData = await fetchFiveMServerStatus(config.FIVE_M_SERVER_IP, config.FIVE_M_SERVER_PORT);

    const statusBadge = statusData.online
      ? `🟢 **ONLINE** (${statusData.ping}ms latency)`
      : `🔴 **OFFLINE**`;

    const playerPercentage = Math.round((statusData.onlinePlayers / (statusData.maxPlayers || 1)) * 100);
    const filledBlocks = Math.min(10, Math.max(0, Math.round(playerPercentage / 10)));
    const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(10 - filledBlocks);

    const featuredPartnerEmbed = new EmbedBuilder()
      .setTitle('KODEBYKARL.NET - 1st Official Partner & Live Server Status')
      .setColor(statusData.online ? 0x2ECC71 : 0xE74C3C)
      .setThumbnail('https://www.pandoracity.online/assets/PandoraCity-FgWJxJAO.png')
      .setImage(config.EMBED_IMAGE_URL)
      .setDescription(
        `We are thrilled to feature our **1st Official Partnership & Ongoing Dev Service** client!\n\n` +
        `**Server Profile & Details:**\n` +
        `• **Server Name (Profile)**: \`${statusData.serverName}\`\n` +
        `• **Framework / Game Type**: \`${statusData.gameType}\`\n` +
        `• **Partner Guild ID**: \`${config.PARTNER_1_GUILD_ID}\`\n` +
        `• **Dev Service Status**: Active Ongoing Maintenance & Priority Custom Scripts\n\n` +
        `**Live Server Status & Player Metrics:**\n` +
        `• **Server Status**: ${statusBadge}\n` +
        `• **Online Players**: \`👥 ${statusData.onlinePlayers} / ${statusData.maxPlayers}\` (${playerPercentage}% capacity)\n` +
        `• **Player Capacity Bar**: \`[${progressBar}]\`\n\n` +
        `**Official Connections:**\n` +
        `• **Partner Discord**: [Join Partner Community](${config.PARTNER_1_INVITE})\n\n` +
        `Interested in securing an ongoing development partnership for your server? Open a ticket in <#${config.TICKET_PANEL_CHANNEL_ID}>!`
      )
      .setFooter({ text: 'Live Server Monitor • Auto-refreshes every 60s' })
      .setTimestamp();

    const featuredRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Join Partner Discord')
        .setStyle(ButtonStyle.Link)
        .setURL(config.PARTNER_1_INVITE),
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(config.WEBSITE_URL)
    );

    const existingFeaturedPanel = messages?.find(
      (m) => m.author.id === client.user.id && (m.embeds[0]?.title?.includes('1st Official Partner') || m.embeds[0]?.title?.includes('Live Server Status'))
    );

    if (existingFeaturedPanel) {
      await existingFeaturedPanel.edit({ embeds: [featuredPartnerEmbed], components: [featuredRow] });
      console.log('[PARTNERSHIP] Live Server Status & Partner panel updated.');
    } else {
      await channel.send({ embeds: [featuredPartnerEmbed], components: [featuredRow] });
      console.log('[PARTNERSHIP] Live Server Status & Partner panel posted successfully.');
    }
  } catch (err) {
    console.error('[PARTNERSHIP ERROR] Failed to deploy Partnership panel:', err);
  }
}

module.exports = { deployPartnership };
