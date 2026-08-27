/**
 * FiveM Custom Script Shop - Discord Verification & Security Logging Bot
 * Built using discord.js v14
 */

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID || '1535228405665239121';
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://kodebykarl.net';
const LANDING_CHANNEL_ID = process.env.LANDING_CHANNEL_ID || '1534470634342449202';
const TICKET_PANEL_CHANNEL_ID = process.env.TICKET_PANEL_CHANNEL_ID || '1534470824889815160';
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID || null;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || null;

// Category IDs for specific ticket types
const CATEGORY_SALES_ID = process.env.CATEGORY_SALES_ID || '1542420500381171712';
const CATEGORY_SERVICE_ID = process.env.CATEGORY_SERVICE_ID || '1542420536255053866';
const CATEGORY_TECHNICAL_ID = process.env.CATEGORY_TECHNICAL_ID || '1542420568882544750';
const CATEGORY_PARTNERSHIP_ID = process.env.CATEGORY_PARTNERSHIP_ID || '1542420599152967740';

// Custom Banner Image URL for embedded messages
const EMBED_IMAGE_URL = process.env.EMBED_IMAGE_URL || 'https://r2.fivemanage.com/7qoUgFxV85h3Czm85xGbV/KodebyKArl.png';

// Server Info Channel ID and Resource Links
const SERVER_INFO_CHANNEL_ID = process.env.SERVER_INFO_CHANNEL_ID || '1534470692232233060';
const DISCORD_INVITE_URL = process.env.DISCORD_INVITE_URL || 'https://discord.gg/gCXescESs';
const DOCS_URL = process.env.DOCS_URL || 'https://kodebykarl-net.gitbook.io/kodebykarl.net';
const GITHUB_URL = process.env.GITHUB_URL || 'https://github.com/kodebykarl';

// Dev-Github Script Commit Log Channel ID
const DEV_GITHUB_CHANNEL_ID = process.env.DEV_GITHUB_CHANNEL_ID || '1534470712918806639';

// Partnership Information Channel ID
const PARTNERSHIP_CHANNEL_ID = process.env.PARTNERSHIP_CHANNEL_ID || '1534470762524577823';

// 1st Official Partner & Ongoing Dev Service Constants
const PARTNER_1_GUILD_ID = process.env.PARTNER_1_GUILD_ID || '1526937565926654065';
const PARTNER_1_INVITE = process.env.PARTNER_1_INVITE || 'https://discord.gg/G7nJ4mad';
const PARTNER_1_DASHBOARD = process.env.PARTNER_1_DASHBOARD || 'http://151.242.136.30:40120';

// 1st Partner FiveM Server Metrics Configuration
const FIVE_M_SERVER_IP = process.env.FIVE_M_SERVER_IP || '151.242.136.30';
const FIVE_M_SERVER_PORT = process.env.FIVE_M_SERVER_PORT || '30120';

// Customer Review Panel Channel ID
const REVIEWS_CHANNEL_ID = process.env.REVIEWS_CHANNEL_ID || '1542471412030251068';

// Sticky Note Store Info Channel ID
const STICKY_CHANNEL_ID = process.env.STICKY_CHANNEL_ID || '1542475718682869872';

// Memory variable to track last sticky message ID in channel
let lastStickyMessageId = null;

/**
 * Helper to fetch live FiveM server metrics (Profile, Status, Online Players)
 * @param {string} ip 
 * @param {string|number} port 
 * @returns {Promise<{online: boolean, serverName: string, gameType: string, onlinePlayers: number, maxPlayers: number, ping: number}>}
 */
async function fetchFiveMServerStatus(ip = FIVE_M_SERVER_IP, port = FIVE_M_SERVER_PORT) {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`http://${ip}:${port}/dynamic.json`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

    const data = await res.json();
    const ping = Date.now() - startTime;

    return {
      online: true,
      serverName: data.hostname || 'Pandora City',
      gameType: data.gametype || 'ESX Legacy',
      onlinePlayers: parseInt(data.clients, 10) || 0,
      maxPlayers: parseInt(data.sv_maxclients, 10) || 500,
      ping
    };
  } catch (err) {
    return {
      online: false,
      serverName: 'Pandora City',
      gameType: 'ESX Legacy',
      onlinePlayers: 0,
      maxPlayers: 500,
      ping: 0
    };
  }
}




// Database file for tracking active tickets across restarts
const TICKETS_FILE = path.join(__dirname, 'tickets.json');

// Database file for tracking customer reviews across restarts
const REVIEWS_FILE = path.join(__dirname, 'reviews.json');

/**
 * Load tickets state from tickets.json
 * @returns {Array<{channelId: string, userId: string, category: string, createdAt: number, lastActivity: number, claimedBy: string|null}>}
 */
function loadTickets() {
  try {
    if (fs.existsSync(TICKETS_FILE)) {
      return JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[DATABASE ERROR] Failed to load tickets.json:', err);
  }
  return [];
}

/**
 * Save tickets state to tickets.json
 * @param {Array} tickets 
 */
function saveTickets(tickets) {
  try {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2), 'utf8');
  } catch (err) {
    console.error('[DATABASE ERROR] Failed to save tickets.json:', err);
  }
}

/**
 * Load reviews state from reviews.json
 * @returns {Array<{id: string, userId: string, username: string, rating: number, comments: string, isAnon: boolean, createdAt: number}>}
 */
function loadReviews() {
  try {
    if (fs.existsSync(REVIEWS_FILE)) {
      return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[DATABASE ERROR] Failed to load reviews.json:', err);
  }
  return [];
}

/**
 * Save reviews state to reviews.json
 * @param {Array} reviews 
 */
function saveReviews(reviews) {
  try {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), 'utf8');
  } catch (err) {
    console.error('[DATABASE ERROR] Failed to save reviews.json:', err);
  }
}

/**
 * Helper to update Bot Status Activity with live review count
 */
function updateBotPresence() {
  try {
    const reviews = loadReviews();
    const count = reviews.length;
    if (client.user) {
      client.user.setActivity(`⭐ ${count}+ Customer Reviews | kodebykarl.net`, {
        type: 3 // Watching
      });
      console.log(`[PRESENCE] Bot status set to: Watching ⭐ ${count}+ Customer Reviews | kodebykarl.net`);
    }
  } catch (err) {
    console.error('[PRESENCE ERROR] Failed to update bot activity status:', err);
  }
}

// Validate required environment variables
if (!DISCORD_TOKEN) {
  console.error('[FATAL ERROR] DISCORD_TOKEN is not defined in environment variables or .env file.');
  process.exit(1);
}

if (!LOG_CHANNEL_ID) {
  console.warn('[WARNING] LOG_CHANNEL_ID is not set in .env file. Logging to channel will be disabled.');
}

// Initialize Client with required intents and partials
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

/**
 * Reusable helper to send log messages or embeds to the staff log channel.
 *
 * @param {import('discord.js').Guild} guild - The Discord guild object
 * @param {string | { embeds: EmbedBuilder[] }} payload - Text message or embed payload
 */
async function logToChannel(guild, payload) {
  try {
    const channelId = process.env.LOG_CHANNEL_ID || LOG_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[LOG ERROR] Log channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    if (typeof payload === 'string') {
      await channel.send({ content: payload });
    } else {
      await channel.send(payload);
    }
  } catch (err) {
    console.error('[LOG ERROR] Exception occurred while logging to channel:', err);
  }
}

/**
 * Helper to send a welcome landing page message when a member is approved.
 *
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').GuildMember} member 
 */
async function sendWelcomeLandingMessage(guild, member) {
  try {
    const channelId = process.env.LANDING_CHANNEL_ID || LANDING_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[LANDING ERROR] Landing channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const landingEmbed = new EmbedBuilder()
      .setTitle('Welcome to FiveM Custom Script Shop')
      .setColor(0x2ECC71)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setImage(EMBED_IMAGE_URL)
      .setDescription(
        `Welcome ${member.user} to the community. Your verification is complete.\n\n` +
        `Browse Our Script Catalog: [${WEBSITE_URL}](${WEBSITE_URL})\n` +
        `Purchases & Support: To purchase a script, request a quote, or open a bug ticket, please open a ticket in our ticket section.`
      )
      .setFooter({ text: 'FiveM Custom Script Shop' })
      .setTimestamp();

    await channel.send({ content: `Welcome ${member.user}`, embeds: [landingEmbed] });
  } catch (err) {
    console.error(`[LANDING ERROR] Failed to send landing welcome message for ${member.user.tag}:`, err);
  }
}

/**
 * Helper to deploy or update the main Landing Page Announcement in LANDING_CHANNEL_ID.
 *
 * @param {import('discord.js').Guild} guild 
 */
async function deployLandingPage(guild) {
  try {
    const channelId = process.env.LANDING_CHANNEL_ID || LANDING_CHANNEL_ID;
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
      .setImage(EMBED_IMAGE_URL)
      .setFooter({ text: 'KODEBYKARL.NET - Premium FiveM Scripts' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(WEBSITE_URL),
      new ButtonBuilder()
        .setLabel('Discord Server')
        .setStyle(ButtonStyle.Link)
        .setURL(DISCORD_INVITE_URL),
      new ButtonBuilder()
        .setLabel('Documentation')
        .setStyle(ButtonStyle.Link)
        .setURL(DOCS_URL)
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


/**
 * Helper to deploy or update the Ticket Creation Panel in TICKET_PANEL_CHANNEL_ID.
 *
 * @param {import('discord.js').Guild} guild 
 */
async function deployTicketPanel(guild) {
  try {
    const channelId = process.env.TICKET_PANEL_CHANNEL_ID || TICKET_PANEL_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[TICKET PANEL ERROR] Ticket panel channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const panelEmbed = new EmbedBuilder()
      .setTitle('Welcome to FiveM Custom Script Shop Tickets')
      .setColor(0x5865F2)
      .setImage(EMBED_IMAGE_URL)
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

/**
 * Helper to deploy or update the Server Info Panel in SERVER_INFO_CHANNEL_ID.
 *
 * @param {import('discord.js').Guild} guild 
 */
async function deployServerInfo(guild) {
  try {
    const channelId = process.env.SERVER_INFO_CHANNEL_ID || SERVER_INFO_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[SERVER INFO ERROR] Server info channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const infoEmbed = new EmbedBuilder()
      .setTitle('Welcome to KODEBYKARL.NET')
      .setColor(0x5865F2)
      .setImage(EMBED_IMAGE_URL)
      .setDescription(
        'Everything about the store lives right here in this channel.\n\n' +
        `Discord: [${DISCORD_INVITE_URL}](${DISCORD_INVITE_URL})\n` +
        `Website: [${WEBSITE_URL}](${WEBSITE_URL})\n` +
        `Docs: [${DOCS_URL}](${DOCS_URL})`
      )
      .setFooter({ text: 'KODEBYKARL.NET' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Discord Server')
        .setStyle(ButtonStyle.Link)
        .setURL(DISCORD_INVITE_URL),
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(WEBSITE_URL),
      new ButtonBuilder()
        .setLabel('Documentation')
        .setStyle(ButtonStyle.Link)
        .setURL(DOCS_URL)
    );

    const messageContent =
      `Welcome to KODEBYKARL.NET — everything about the store lives right here in this channel.\n\n` +
      `Discord: ${DISCORD_INVITE_URL}\n` +
      `Website: ${WEBSITE_URL}\n` +
      `Docs: ${DOCS_URL}\n\n` +
      `${DISCORD_INVITE_URL}`;

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

/**
 * Helper to deploy or update the Dev-Github & Script Commit Updates Panel in DEV_GITHUB_CHANNEL_ID.
 *
 * @param {import('discord.js').Guild} guild 
 */
async function deployDevGithub(guild) {
  try {
    const channelId = process.env.DEV_GITHUB_CHANNEL_ID || DEV_GITHUB_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[DEV GITHUB ERROR] Dev-Github channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const devGithubEmbed = new EmbedBuilder()
      .setTitle('KODEBYKARL.NET - Dev GitHub & Script Commit Logs')
      .setColor(0x5865F2)
      .setImage(EMBED_IMAGE_URL)
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
        .setURL(GITHUB_URL),
      new ButtonBuilder()
        .setLabel('Documentation')
        .setStyle(ButtonStyle.Link)
        .setURL(DOCS_URL),
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(WEBSITE_URL)
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

/**
 * Helper to deploy or update the Partnership & Collaboration Panel in PARTNERSHIP_CHANNEL_ID.
 *
 * @param {import('discord.js').Guild} guild 
 */
async function deployPartnership(guild) {
  try {
    const channelId = process.env.PARTNERSHIP_CHANNEL_ID || PARTNERSHIP_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[PARTNERSHIP ERROR] Partnership channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const partnershipEmbed = new EmbedBuilder()
      .setTitle('KODEBYKARL.NET - Official Partnerships & Sponsorships')
      .setColor(0x5865F2)
      .setImage(EMBED_IMAGE_URL)
      .setDescription(
        `Welcome to the official **Partnership & Collaboration** hub for KodebyKarl.net!\n\n` +
        `We are open to strategic partnerships with FiveM server owners, content creators, script developers, and gaming communities.\n\n` +
        `**Partnership & Collaboration Opportunities:**\n` +
        `• **Server Partnerships**: Custom script integration, cross-promotion, and server discounts.\n` +
        `• **Content Creators & Streamers**: Official script sponsorship, review units, and affiliate rewards.\n` +
        `• **Developer Collaborations**: Co-developed FiveM resources and framework integrations.\n` +
        `• **Custom Development**: Tailored server development and long-term tech support.\n\n` +
        `**How to Apply:**\n` +
        `To discuss a partnership or custom proposal, head over to <#${TICKET_PANEL_CHANNEL_ID}> and open a **Partnership Inquiry** ticket!`
      )
      .setFooter({ text: 'KODEBYKARL.NET - Partnership Program' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(WEBSITE_URL),
      new ButtonBuilder()
        .setLabel('Discord Invite')
        .setStyle(ButtonStyle.Link)
        .setURL(DISCORD_INVITE_URL),
      new ButtonBuilder()
        .setLabel('Documentation')
        .setStyle(ButtonStyle.Link)
        .setURL(DOCS_URL)
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
    const statusData = await fetchFiveMServerStatus(FIVE_M_SERVER_IP, FIVE_M_SERVER_PORT);

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
      .setImage(EMBED_IMAGE_URL)
      .setDescription(
        `We are thrilled to feature our **1st Official Partnership & Ongoing Dev Service** client!\n\n` +
        `**Server Profile & Details:**\n` +
        `• **Server Name (Profile)**: \`${statusData.serverName}\`\n` +
        `• **Framework / Game Type**: \`${statusData.gameType}\`\n` +
        `• **Partner Guild ID**: \`${PARTNER_1_GUILD_ID}\`\n` +
        `• **Dev Service Status**: Active Ongoing Maintenance & Priority Custom Scripts\n\n` +
        `**Live Server Status & Player Metrics:**\n` +
        `• **Server Status**: ${statusBadge}\n` +
        `• **Online Players**: \`👥 ${statusData.onlinePlayers} / ${statusData.maxPlayers}\` (${playerPercentage}% capacity)\n` +
        `• **Player Capacity Bar**: \`[${progressBar}]\`\n\n` +
        `**Official Connections:**\n` +
        `• **Partner Discord**: [Join Partner Community](${PARTNER_1_INVITE})\n\n` +
        `Interested in securing an ongoing development partnership for your server? Open a ticket in <#${TICKET_PANEL_CHANNEL_ID}>!`
      )
      .setFooter({ text: 'Live Server Monitor • Auto-refreshes every 60s' })
      .setTimestamp();

    const featuredRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Join Partner Discord')
        .setStyle(ButtonStyle.Link)
        .setURL(PARTNER_1_INVITE),
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(WEBSITE_URL)
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

/**
 * Helper to deploy or update the Customer Review Panel in REVIEWS_CHANNEL_ID.
 *
 * @param {import('discord.js').Guild} guild 
 */
async function deployReviewPanel(guild) {
  try {
    const channelId = process.env.REVIEWS_CHANNEL_ID || REVIEWS_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[REVIEWS ERROR] Review channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const reviews = loadReviews();
    const totalCount = reviews.length;
    const avgRating = totalCount > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalCount).toFixed(1)
      : '5.0';

    const reviewPanelEmbed = new EmbedBuilder()
      .setTitle('KODEBYKARL.NET - Customer Reviews & Testimonials')
      .setColor(0xF1C40F)
      .setImage(EMBED_IMAGE_URL)
      .setDescription(
        `Welcome to the official **Customer Reviews & Feedback** panel!\n\n` +
        `Have you purchased a FiveM script, requested custom development, or received technical support from KodebyKarl.net?\n\n` +
        `**We value your feedback!** Share your rating and comments to help our community grow.\n\n` +
        `📊 **Community Statistics:**\n` +
        `• **Total Customer Reviews**: 🌟 **${totalCount} Verified Reviews**\n` +
        `• **Average Rating**: ⭐ **${avgRating} / 5.0 Stars**\n\n` +
        `⭐ **Star Ratings**: Rate your experience from 1 to 5 Stars.\n` +
        `💬 **Comments**: Provide your honest review about script performance, support, and delivery.\n` +
        `👤 **Anonymous Choice**: You can post publicly with your profile or as an **Anonymous Customer** (e.g., Anony ${totalCount + 1}).\n\n` +
        `Click a button below to submit your review!`
      )
      .setFooter({ text: 'KODEBYKARL.NET - Verified Customer Feedback' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_leave_review_modal')
        .setLabel('⭐ Leave a Review')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn_leave_review_anon')
        .setLabel('🕵️ Leave Anonymous Review')
        .setStyle(ButtonStyle.Secondary)
    );

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const existingReviewPanel = messages?.find(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title === 'KODEBYKARL.NET - Customer Reviews & Testimonials'
    );

    if (existingReviewPanel) {
      await existingReviewPanel.edit({ embeds: [reviewPanelEmbed], components: [row] });
      console.log('[REVIEWS] Existing Customer Review panel updated.');
    } else {
      await channel.send({ embeds: [reviewPanelEmbed], components: [row] });
      console.log('[REVIEWS] Customer Review panel posted successfully.');
    }
  } catch (err) {
    console.error('[REVIEWS ERROR] Failed to deploy Customer Review panel:', err);
  }
}

/**
 * Helper to sync/publish unposted reviews from reviews.json as visible embeds in REVIEWS_CHANNEL_ID.
 * Verifies first if reviews are already marked as posted before sending to channel.
 * @param {import('discord.js').Guild} guild 
 */
async function syncReviewsToChannel(guild) {
  try {
    const channelId = process.env.REVIEWS_CHANNEL_ID || REVIEWS_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[REVIEWS SYNC ERROR] Review channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const reviews = loadReviews();
    if (reviews.length === 0) return;

    // Filter reviews that are NOT marked as posted yet
    const unpostedReviews = reviews.filter((r) => !r.isPosted);

    if (unpostedReviews.length === 0) {
      console.log(`[REVIEWS SYNC] Verification passed: All ${reviews.length} reviews are already posted. Skipping feed.`);
      return;
    }

    console.log(`[REVIEWS SYNC] Verified ${unpostedReviews.length} new unposted review(s) in database. Publishing to channel...`);

    for (let i = 0; i < unpostedReviews.length; i++) {
      const rev = unpostedReviews[i];
      const ratingNum = rev.rating || 5;
      const stars = '⭐'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);
      const isAnon = rev.isAnon !== false;
      const authorName = isAnon ? `Anonymous Customer (${rev.username})` : rev.username;

      const reviewEmbed = new EmbedBuilder()
        .setAuthor({ name: authorName })
        .setTitle(`Customer Review - ${stars} (${ratingNum}/5)`)
        .setColor(0xF1C40F)
        .setImage(EMBED_IMAGE_URL)
        .setDescription(`**Comments / Feedback:**\n${rev.comments}`)
        .addFields(
          { name: 'Rating', value: `${stars} **${ratingNum}/5 Stars**`, inline: true },
          { name: 'Submitted By', value: `🕵️ ${rev.username}`, inline: true },
          { name: 'Verified Customer', value: '✅ Yes', inline: true }
        )
        .setFooter({ text: `KODEBYKARL.NET - Verified Review` })
        .setTimestamp(rev.createdAt ? new Date(rev.createdAt) : new Date());

      const sentMsg = await channel.send({ embeds: [reviewEmbed] }).catch((err) => {
        console.error('[REVIEWS SEND ERROR]', err.message);
        return null;
      });

      if (sentMsg) {
        rev.isPosted = true;
        saveReviews(reviews);
      }

      // 300ms delay between posts to respect Discord API rate limits cleanly
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log('[REVIEWS SYNC] All unposted reviews successfully published and verified!');
  } catch (err) {
    console.error('[REVIEWS SYNC ERROR] Failed to sync reviews to channel:', err);
  }
}

/**
 * Helper to deploy or re-anchor the Sticky Note embed at the bottom of STICKY_CHANNEL_ID.
 * @param {import('discord.js').Guild} guild 
 * @param {boolean} forceResend If true, deletes existing sticky message and posts a fresh one at bottom.
 */
async function deployStickyNote(guild, forceResend = false) {
  try {
    const channelId = process.env.STICKY_CHANNEL_ID || STICKY_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[STICKY ERROR] Sticky channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const stickyEmbed = new EmbedBuilder()
      .setTitle('📌 KODEBYKARL.NET - Official Store Info & Support Guide')
      .setColor(0xF1C40F)
      .setImage(EMBED_IMAGE_URL)
      .setDescription(
        `Welcome to **KodebyKarl.net** — your destination for high-quality, framework-ready FiveM custom scripts!\n\n` +
        `**Store Information & Quick Navigation:**\n` +
        `• **Official Website Catalog**: Browse custom scripts at [kodebykarl.net](${WEBSITE_URL})\n` +
        `• **Documentation**: Read setup guides & config docs at [GitBook Docs](${DOCS_URL})\n` +
        `• **Script Commit Updates**: Track code changelogs in <#${DEV_GITHUB_CHANNEL_ID}>\n` +
        `• **Customer Reviews & Ratings**: Read verified feedback in <#${REVIEWS_CHANNEL_ID}>\n\n` +
        `**Need Assistance or Have Questions?**\n` +
        `If you have any questions, script inquiries, or need technical support, **don't hesitate to ping our Staff team or open a ticket in <#${TICKET_PANEL_CHANNEL_ID}>!**`
      )
      .setFooter({ text: '📌 Sticky Note • Automatically anchored at bottom of channel' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Website Catalog')
        .setStyle(ButtonStyle.Link)
        .setURL(WEBSITE_URL),
      new ButtonBuilder()
        .setLabel('Discord Server')
        .setStyle(ButtonStyle.Link)
        .setURL(DISCORD_INVITE_URL),
      new ButtonBuilder()
        .setLabel('Documentation')
        .setStyle(ButtonStyle.Link)
        .setURL(DOCS_URL)
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


/**
 * 24-Hour Inactivity Auto-Close Check Function
 */
async function checkInactiveTickets() {
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

/**
 * Helper to convert Discord User Flags / Badges into plain human-readable text.
 *
 * @param {import('discord.js').User} user 
 * @returns {string} Formatted badges list
 */
function getFormattedBadges(user) {
  const flags = user.flags?.toArray() || [];
  if (flags.length === 0) return 'None';

  const badgeMap = {
    Staff: 'Discord Employee',
    Partner: 'Partnered Server Owner',
    HypeSquadEvents: 'HypeSquad Events Coordinator',
    BugHunterLevel1: 'Bug Hunter (Tier 1)',
    BugHunterLevel2: 'Bug Hunter (Tier 2)',
    HypeSquadOnlineHouse1: 'HypeSquad Bravery',
    HypeSquadOnlineHouse2: 'HypeSquad Brilliance',
    HypeSquadOnlineHouse3: 'HypeSquad Balance',
    PremiumEarlySupporter: 'Early Supporter',
    TeamPseudoUser: 'Team User',
    VerifiedBot: 'Verified Bot',
    VerifiedDeveloper: 'Early Verified Bot Developer',
    CertifiedModerator: 'Moderator Programs Alumni',
    ActiveDeveloper: 'Active Developer'
  };

  return flags.map((flag) => badgeMap[flag] || flag).join(', ');
}

// Ready Event
client.once('clientReady', async () => {
  console.log('=================================================');
  console.log(`Bot logged in as ${client.user.tag}`);
  console.log(`Target Verified Role ID: ${VERIFIED_ROLE_ID}`);
  console.log(`Target Log Channel ID:   ${LOG_CHANNEL_ID || 'Not Configured'}`);
  console.log(`Landing Page Channel ID: ${LANDING_CHANNEL_ID}`);
  console.log(`Server Info Channel ID:  ${SERVER_INFO_CHANNEL_ID}`);
  console.log(`Dev-Github Channel ID:   ${DEV_GITHUB_CHANNEL_ID}`);
  console.log(`Partnership Channel ID:  ${PARTNERSHIP_CHANNEL_ID}`);
  console.log(`Reviews Channel ID:      ${REVIEWS_CHANNEL_ID}`);
  console.log(`Sticky Note Channel ID:  ${STICKY_CHANNEL_ID}`);
  console.log(`Ticket Panel Channel ID: ${TICKET_PANEL_CHANNEL_ID}`);
  console.log(`Website URL:             ${WEBSITE_URL}`);
  console.log('=================================================');

  // Deploy/verify ticket panel, server info panel, landing page, dev-github panel, partnership panel, review panel, and sticky note in the configured guild
  const guild = client.guilds.cache.first();
  if (guild) {
    await deployTicketPanel(guild);
    await deployServerInfo(guild);
    await deployLandingPage(guild);
    await deployDevGithub(guild);
    await deployPartnership(guild);
    await deployReviewPanel(guild);
    await syncReviewsToChannel(guild);
    await deployStickyNote(guild);
  }


  // Update Bot Presence Activity Status (Watching ⭐ X+ Customer Reviews)
  updateBotPresence();

  // Start 24-hour inactivity check interval (runs every 5 minutes)
  setInterval(checkInactiveTickets, 5 * 60 * 1000);

  // Auto-refresh Live FiveM Server Metrics & Partner Panel every 60 seconds (1 minute)
  setInterval(async () => {
    const targetGuild = client.guilds.cache.first();
    if (targetGuild) {
      await deployPartnership(targetGuild).catch((err) => console.error('[STATUS REFRESH ERROR]', err.message));
    }
  }, 60 * 1000);
});


// Member Join Event (guildMemberAdd)
client.on('guildMemberAdd', async (member) => {
  console.log(`[JOIN] New member: ${member.user.tag} (ID: ${member.id}) in guild: ${member.guild.name}`);

  // -------------------------------------------------------------
  // FEATURE 1 — SECURITY JOIN LOG
  // Fires immediately on join, independently of DM outcome
  // -------------------------------------------------------------
  try {
    const createdTimestamp = member.user.createdTimestamp;
    const joinedTimestamp = member.joinedTimestamp || Date.now();
    const createdUnix = Math.floor(createdTimestamp / 1000);
    const joinedUnix = Math.floor(joinedTimestamp / 1000);

    const accountAgeMs = Date.now() - createdTimestamp;
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
    const isNewAccount = accountAgeDays < 7;

    const badges = getFormattedBadges(member.user);

    const securityEmbed = new EmbedBuilder()
      .setTitle('Member Joined - Security Audit')
      .setColor(isNewAccount ? 0xE74C3C : 0x5865F2)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'User Tag', value: `${member.user.tag}`, inline: true },
        { name: 'User Mention', value: `${member.user}`, inline: true },
        { name: 'Discord ID', value: `\`${member.id}\``, inline: true },
        { name: 'Account Creation Date', value: `<t:${createdUnix}:F> (<t:${createdUnix}:R>)`, inline: false },
        { name: 'Account Age', value: `${accountAgeDays} day(s)`, inline: true },
        { name: 'Server Join Date', value: `<t:${joinedUnix}:F> (<t:${joinedUnix}:R>)`, inline: false },
        { name: 'Profile Badges', value: badges, inline: false },
        { name: 'IP Address / ISP', value: 'N/A (Discord API privacy limitation: Bots do not receive client IP/ISP data)', inline: false },
        { name: 'Device Info / Hardware', value: 'N/A (Discord API privacy limitation: Bots do not receive client device details)', inline: false }
      )
      .setFooter({
        text: 'Account metadata log - IP addresses and client device specifications are isolated by Discord API.'
      })
      .setTimestamp();

    if (isNewAccount) {
      securityEmbed.addFields({
        name: 'Security Risk Warning',
        value: 'NEW ACCOUNT WARNING: Account is less than 7 days old.',
        inline: false
      });
    }

    await logToChannel(member.guild, { embeds: [securityEmbed] });
  } catch (err) {
    console.error(`[SECURITY LOG ERROR] Failed to send join log for ${member.user.tag}:`, err);
  }

  // -------------------------------------------------------------
  // FEATURE 2 — JOIN VERIFICATION FLOW (DM-based)
  // -------------------------------------------------------------
  const welcomeEmbed = new EmbedBuilder()
    .setTitle('Welcome to FiveM Custom Script Shop')
    .setColor(0x5865F2)
    .setImage(EMBED_IMAGE_URL)
    .setDescription(

      `Welcome ${member.user}. We specialize in high-quality custom FiveM scripts, standalone resources, and tailored server solutions.\n\n` +
      `Browse Our Catalog:\n` +
      `[${WEBSITE_URL}](${WEBSITE_URL})\n\n` +
      `Sales, Inquiries & Support Flow:\n` +
      `All transactions and customer support are handled strictly through server Tickets:\n` +
      `- Buying Scripts: Open a ticket to initiate a purchase.\n` +
      `- Inquiries & Quotes: Open a ticket to ask questions or discuss custom script projects.\n` +
      `- Support & Bug Reports: Open a ticket to receive developer assistance.`
    )
    .addFields({
      name: 'Terms & Agreement',
      value:
        `Before gaining full access to our community, please review and accept our terms:\n\n` +
        `1. No Scamming / Chargebacks: Fraudulent activity or unauthorized chargebacks will result in a permanent ban.\n` +
        `2. No Leaking / Reselling: Sharing, reselling, or distributing our scripts or code assets is strictly prohibited.\n` +
        `3. Tickets Only: All script purchases, sales inquiries, and support MUST go through official server tickets.\n` +
        `4. Respectful Conduct: Maintain mutual respect toward all community members and staff.\n` +
        `5. Final Authority: Staff decisions regarding terms violations and safety measures are final.`
    })
    .setFooter({ text: 'Click Accept below to verify your account within 10 minutes.' })
    .setTimestamp();

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('accept_verification')
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('decline_verification')
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger)
  );

  let dmMessage;
  try {
    dmMessage = await member.send({
      embeds: [welcomeEmbed],
      components: [actionRow]
    });
  } catch (dmError) {
    console.error(`[DM FAILED] Could not send DM to ${member.user.tag} (${member.id}):`, dmError.message);

    try {
      await member.kick('Could not verify - DMs are disabled.');

      const dmFailedLogEmbed = new EmbedBuilder()
        .setTitle('Member Kicked - DM Failed')
        .setColor(0xE74C3C)
        .setDescription(
          `User Tag: ${member.user.tag}\n` +
          `User Mention: ${member.user}\n` +
          `User ID: ${member.id}\n` +
          `Action: Kicked\n` +
          `Reason: Could not verify - DMs are disabled or blocked.`
        )
        .setTimestamp();

      await logToChannel(member.guild, { embeds: [dmFailedLogEmbed] });
    } catch (kickError) {
      console.error(`[KICK ERROR] Failed to kick ${member.user.tag} when DM failed:`, kickError);
      await logToChannel(
        member.guild,
        `[ERROR] Could not kick member ${member.user.tag} (ID: ${member.id}) after DM send failure: ${kickError.message}`
      );
    }
    return;
  }

  const collector = dmMessage.createMessageComponentCollector({
    filter: (interaction) => interaction.user.id === member.id,
    max: 1,
    time: 600000 // 10 minutes
  });

  collector.on('collect', async (interaction) => {
    if (interaction.customId === 'accept_verification') {
      try {
        await member.roles.add(VERIFIED_ROLE_ID);

        const acceptedDmEmbed = new EmbedBuilder()
          .setTitle('Verification Successful')
          .setColor(0x2ECC71)
          .setDescription(
            `Thank you for accepting the terms. You have been granted full access to the server.\n\n` +
            `Landing Page Channel: <#${LANDING_CHANNEL_ID}>\n` +
            `Browse Catalog: [${WEBSITE_URL}](${WEBSITE_URL})\n` +
            `Need a Script or Support?: Head over to <#${TICKET_PANEL_CHANNEL_ID}> to open a ticket.`
          )
          .setTimestamp();

        await interaction.update({ embeds: [acceptedDmEmbed], components: [] });
        await sendWelcomeLandingMessage(member.guild, member);

        const acceptLogEmbed = new EmbedBuilder()
          .setTitle('Member Verified')
          .setColor(0x2ECC71)
          .setDescription(
            `User Tag: ${member.user.tag}\n` +
            `User Mention: ${member.user}\n` +
            `User ID: ${member.id}\n` +
            `Status: Accepted terms and assigned verified role (<@&${VERIFIED_ROLE_ID}>).\n` +
            `Landing Channel: <#${LANDING_CHANNEL_ID}>`
          )
          .setTimestamp();

        await logToChannel(member.guild, { embeds: [acceptLogEmbed] });
      } catch (roleError) {
        console.error(`[ROLE ERROR] Failed to assign role to ${member.user.tag}:`, roleError);

        const errorDmEmbed = new EmbedBuilder()
          .setTitle('Role Assignment Error')
          .setColor(0xF1C40F)
          .setDescription(
            `You accepted the terms, but an error occurred while assigning your verified role.\n` +
            `Please inform the staff team in the server.`
          )
          .setTimestamp();

        await interaction.update({ embeds: [errorDmEmbed], components: [] }).catch(() => {});
        await logToChannel(
          member.guild,
          `[ERROR] Accepted verification but failed to assign role to ${member.user.tag} (ID: ${member.id}): ${roleError.message}`
        );
      }
    } else if (interaction.customId === 'decline_verification') {
      try {
        const declinedDmEmbed = new EmbedBuilder()
          .setTitle('Verification Declined')
          .setColor(0xE74C3C)
          .setDescription(
            `You have declined the server terms and agreement. You have been removed from the server.`
          )
          .setTimestamp();

        await interaction.update({ embeds: [declinedDmEmbed], components: [] });
        await member.kick('Declined server verification/terms.');

        const declineLogEmbed = new EmbedBuilder()
          .setTitle('Member Declined Verification')
          .setColor(0xE74C3C)
          .setDescription(
            `User Tag: ${member.user.tag}\n` +
            `User Mention: ${member.user}\n` +
            `User ID: ${member.id}\n` +
            `Action: Kicked\n` +
            `Reason: Declined server verification/terms.`
          )
          .setTimestamp();

        await logToChannel(member.guild, { embeds: [declineLogEmbed] });
      } catch (kickError) {
        console.error(`[DECLINE KICK ERROR] Failed to kick ${member.user.tag}:`, kickError);
        await logToChannel(
          member.guild,
          `[ERROR] ${member.user.tag} (ID: ${member.id}) declined verification, but kick failed: ${kickError.message}`
        );
      }
    }
  });

  collector.on('end', async (collected, reason) => {
    if (collected.size === 0) {
      try {
        const expiredDmEmbed = new EmbedBuilder()
          .setTitle('Verification Expired')
          .setColor(0xE74C3C)
          .setDescription(
            `Your verification request timed out because no response was received within 10 minutes. You have been removed from the server.`
          )
          .setTimestamp();

        await dmMessage.edit({ embeds: [expiredDmEmbed], components: [] }).catch(() => {});
        await member.kick('Verification timed out (10 minutes).');

        const timeoutLogEmbed = new EmbedBuilder()
          .setTitle('Verification Timeout')
          .setColor(0xE74C3C)
          .setDescription(
            `User Tag: ${member.user.tag}\n` +
            `User Mention: ${member.user}\n` +
            `User ID: ${member.id}\n` +
            `Action: Kicked\n` +
            `Reason: Verification timed out (no response within 10 minutes).`
          )
          .setTimestamp();

        await logToChannel(member.guild, { embeds: [timeoutLogEmbed] });
      } catch (timeoutKickError) {
        console.error(`[TIMEOUT KICK ERROR] Failed to kick ${member.user.tag}:`, timeoutKickError);
        await logToChannel(
          member.guild,
          `[ERROR] Verification timed out for ${member.user.tag} (ID: ${member.id}), but kick failed: ${timeoutKickError.message}`
        );
      }
    }
  });
});

// Interaction Event Listener (Buttons & Modals for Tickets & Customer Reviews)
client.on('interactionCreate', async (interaction) => {
  // Handle Review Modal Triggers
  if (interaction.isButton() && (interaction.customId === 'btn_leave_review_modal' || interaction.customId === 'btn_leave_review_anon')) {
    const isAnon = interaction.customId === 'btn_leave_review_anon';
    const modal = new ModalBuilder()
      .setCustomId(isAnon ? 'modal_review_anon' : 'modal_review_submit')
      .setTitle(isAnon ? 'Submit Anonymous Customer Review' : 'Submit Customer Review');

    const ratingInput = new TextInputBuilder()
      .setCustomId('input_review_rating')
      .setLabel('Rating (1 to 5 Stars)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter a number from 1 to 5 (e.g. 5)')
      .setRequired(true)
      .setMaxLength(1)
      .setValue('5');

    const commentInput = new TextInputBuilder()
      .setCustomId('input_review_comments')
      .setLabel('Review Comments & Feedback')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Share your experience with KodebyKarl scripts, support, or custom development...')
      .setRequired(true)
      .setMinLength(5)
      .setMaxLength(1000);

    const row1 = new ActionRowBuilder().addComponents(ratingInput);
    const row2 = new ActionRowBuilder().addComponents(commentInput);

    modal.addComponents(row1, row2);
    return interaction.showModal(modal);
  }

  // Handle Review Modal Submissions
  if (interaction.isModalSubmit() && (interaction.customId === 'modal_review_submit' || interaction.customId === 'modal_review_anon')) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const reviews = loadReviews();
    const isAnon = interaction.customId === 'modal_review_anon';
    const rawRating = interaction.fields.getTextInputValue('input_review_rating').trim();
    const comments = interaction.fields.getTextInputValue('input_review_comments').trim();

    let ratingNum = parseInt(rawRating, 10);
    if (isNaN(ratingNum) || ratingNum < 1) ratingNum = 1;
    if (ratingNum > 5) ratingNum = 5;

    const stars = '⭐'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);
    const channelId = process.env.REVIEWS_CHANNEL_ID || REVIEWS_CHANNEL_ID;
    const reviewChannel = await interaction.guild?.channels.fetch(channelId).catch(() => null);

    if (!reviewChannel || !reviewChannel.isTextBased()) {
      return interaction.editReply({ content: `Review channel (ID: \`${channelId}\`) was not found or is invalid.` });
    }

    // Determine Anony ID
    const anonIndex = reviews.filter((r) => r.isAnon).length + 1;
    const displayUsername = isAnon ? `Anony ${anonIndex}` : interaction.user.tag;

    // Save to reviews.json database
    const newReviewRecord = {
      id: `rev-${Date.now()}`,
      userId: interaction.user.id,
      username: displayUsername,
      rating: ratingNum,
      comments: comments,
      isAnon: isAnon,
      isPosted: true,
      createdAt: Date.now()
    };
    reviews.push(newReviewRecord);
    saveReviews(reviews);

    // Live update bot status activity
    updateBotPresence();

    // Determine Author Display for Embed
    const authorName = isAnon ? `Anonymous Customer (${displayUsername})` : interaction.user.tag;
    const authorIcon = isAnon ? undefined : interaction.user.displayAvatarURL({ dynamic: true });

    const reviewEmbed = new EmbedBuilder()
      .setAuthor({ name: authorName, iconURL: authorIcon })
      .setTitle(`Customer Review - ${stars} (${ratingNum}/5)`)
      .setColor(0xF1C40F)
      .setImage(EMBED_IMAGE_URL)
      .setDescription(`**Comments / Feedback:**\n${comments}`)
      .addFields(
        { name: 'Rating', value: `${stars} **${ratingNum}/5 Stars**`, inline: true },
        { name: 'Submitted By', value: isAnon ? `🕵️ ${displayUsername}` : `${interaction.user}`, inline: true },
        { name: 'Verified Customer', value: '✅ Yes', inline: true }
      )
      .setFooter({ text: `KODEBYKARL.NET - Verified Review #${reviews.length}` })
      .setTimestamp();

    await reviewChannel.send({ embeds: [reviewEmbed] });

    await interaction.editReply({
      content: `Thank you for your feedback! Your review has been successfully posted in <#${channelId}>.`
    });

    // Log review submission to staff log channel
    if (interaction.guild) {
      await logToChannel(interaction.guild, {
        embeds: [
          new EmbedBuilder()
            .setTitle('New Customer Review Submitted')
            .setColor(0xF1C40F)
            .setDescription(
              `User: ${interaction.user.tag} (${interaction.user})\n` +
              `User ID: \`${interaction.user.id}\`\n` +
              `Rating: ${stars} (${ratingNum}/5)\n` +
              `Type: ${isAnon ? `Anonymous Review (${displayUsername})` : 'Public Review'}\n` +
              `Comments: ${comments}`
            )
            .setTimestamp()
        ]
      });
    }
    return;
  }

  if (!interaction.isButton()) return;

  const { customId, guild, user } = interaction;

  // Handle Ticket Panel Creation Buttons
  if (customId.startsWith('btn_ticket_')) {
    const tickets = loadTickets();

    // Enforce 3 max tickets limit per user
    const userTickets = tickets.filter((t) => t.userId === user.id);
    if (userTickets.length >= 3) {
      return interaction.reply({
        content: 'You can only create 3 ticket(s) at the same time!',
        flags: MessageFlags.Ephemeral
      });
    }

    const categoryMap = {
      btn_ticket_sales: { name: 'Sales Ticket', shortName: 'Sales', slug: 'sales', categoryId: CATEGORY_SALES_ID },
      btn_ticket_renewals: { name: 'Service Renewals Ticket', shortName: 'Service Renewals', slug: 'renewals', categoryId: CATEGORY_SERVICE_ID },
      btn_ticket_support: { name: 'Technical Support Ticket', shortName: 'Technical Support', slug: 'support', categoryId: CATEGORY_TECHNICAL_ID },
      btn_ticket_partnership: { name: 'Partnership Inquiry Ticket', shortName: 'Partnership Inquiry', slug: 'partnership', categoryId: CATEGORY_PARTNERSHIP_ID }
    };

    const ticketInfo = categoryMap[customId] || { name: 'Support Ticket', shortName: 'Support', slug: 'support', categoryId: CATEGORY_TECHNICAL_ID };
    const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const channelName = `ticket-${ticketInfo.slug}-${cleanUsername || user.id.slice(-4)}`;

    try {
      // Setup channel permissions
      const permissionOverwrites = [
        {
          id: guild.id, // @everyone
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: user.id, // Ticket Creator
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        },
        {
          id: client.user.id, // Bot Client
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.EmbedLinks
          ]
        }
      ];

      // Add Staff Role permissions if configured
      if (STAFF_ROLE_ID) {
        permissionOverwrites.push({
          id: STAFF_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages
          ]
        });
      }

      // Create Ticket Channel under its dedicated category
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketInfo.categoryId || TICKET_CATEGORY_ID || undefined,
        permissionOverwrites
      });


      // Post initial welcome ticket embed matching screenshot layout
      const ticketWelcomeEmbed = new EmbedBuilder()
        .setTitle(`${ticketInfo.name}`)
        .setColor(0xF39C12)
        .setImage(EMBED_IMAGE_URL)
        .setDescription(
          `Thank you for creating a '${ticketInfo.shortName}' ticket!\n` +
          `Our support team will help you as soon as possible!`
        )
        .setFooter({ text: 'This ticket will be autoclosed when inactive for 24h!' })
        .setTimestamp();


      const ticketControlRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_claim_ticket')
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('btn_pin_ticket')
          .setLabel('Pin Ticket')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('btn_close_ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('btn_delete_ticket')
          .setLabel('Delete Ticket')
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({
        content: `${user}`,
        embeds: [ticketWelcomeEmbed],
        components: [ticketControlRow]
      });

      // Register new ticket in database
      const newTicketRecord = {
        channelId: ticketChannel.id,
        userId: user.id,
        category: ticketInfo.name,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        claimedBy: null
      };

      tickets.push(newTicketRecord);
      saveTickets(tickets);

      // Log ticket creation to staff channel
      await logToChannel(guild, {
        embeds: [
          new EmbedBuilder()
            .setTitle('New Ticket Created')
            .setColor(0x2ECC71)
            .setDescription(
              `Ticket Channel: ${ticketChannel} (\`#${ticketChannel.name}\`)\n` +
              `User: ${user.tag} (${user})\n` +
              `User ID: \`${user.id}\`\n` +
              `Category: ${ticketInfo.name}`
            )
            .setTimestamp()
        ]
      });

      const ticketCreatedEmbed = new EmbedBuilder()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setTitle('Ticket Created')
        .setColor(0x2ECC71)
        .setDescription('Your ticket has been created. Click the button below to access it!')
        .setTimestamp();

      const visitTicketRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Visit Ticket')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/${ticketChannel.id}`)
      );

      await interaction.reply({
        embeds: [ticketCreatedEmbed],
        components: [visitTicketRow],
        flags: MessageFlags.Ephemeral
      });

    } catch (err) {
      console.error('[TICKET CREATION ERROR] Failed to create ticket channel:', err);
      await interaction.reply({
        content: 'An error occurred while creating your ticket. Please contact staff.',
        flags: MessageFlags.Ephemeral
      });
    }
  }

  // Handle Ticket Claim Button
  else if (customId === 'btn_claim_ticket') {
    const tickets = loadTickets();
    const ticket = tickets.find((t) => t.channelId === interaction.channel.id);

    if (!ticket) {
      return interaction.reply({ content: 'This channel is not an active ticket.', flags: MessageFlags.Ephemeral });
    }

    if (ticket.claimedBy) {
      return interaction.reply({
        content: `This ticket is already claimed by <@${ticket.claimedBy}>.`,
        flags: MessageFlags.Ephemeral
      });
    }

    ticket.claimedBy = user.id;
    saveTickets(tickets);

    // Update channel topic with claimed staff details
    await interaction.channel.setTopic(`Ticket Category: ${ticket.category} | Claimed Staff Handler: ${user.tag} (${user.id})`).catch(() => {});

    // Action control row showing Unclaim button
    const updatedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_unclaim_ticket')
        .setLabel('Unclaim Ticket')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('btn_pin_ticket')
        .setLabel('Pin Ticket')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('btn_close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('btn_delete_ticket')
        .setLabel('Delete Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const claimEmbed = new EmbedBuilder()
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('Ticket Claimed by Staff')
      .setColor(0x2ECC71)
      .setDescription(
        `This ticket has been officially claimed and assigned to ${user}.\n\n` +
        `• **Assigned Staff**: ${user} (\`${user.id}\`)\n` +
        `• **Support Status**: Active Support In Progress\n` +
        `• **Assigned At**: <t:${Math.floor(Date.now() / 1000)}:R>`
      )
      .setFooter({ text: 'KodebyKarl.net - Ticket Management' })
      .setTimestamp();

    await interaction.reply({ embeds: [claimEmbed], components: [updatedRow] });

    // DM notification to ticket creator
    const creatorMember = await guild.members.fetch(ticket.userId).catch(() => null);
    if (creatorMember) {
      creatorMember.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Ticket Assigned / Claimed')
            .setColor(0x2ECC71)
            .setDescription(
              `Hello ${creatorMember.user}, your ticket **#${interaction.channel.name}** is now assigned to staff member ${user}.\n` +
              `They are working on your request and will assist you shortly!`
            )
            .setTimestamp()
        ]
      }).catch(() => {});
    }

    // Log to staff log channel
    await logToChannel(guild, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Ticket Claimed (Staff Assignment)')
          .setColor(0x2ECC71)
          .setDescription(
            `Ticket Channel: <#${ticket.channelId}>\n` +
            `Claimed By Staff: ${user.tag} (${user})\n` +
            `Ticket Creator ID: \`${ticket.userId}\`\n` +
            `Category: ${ticket.category}`
          )
          .setTimestamp()
      ]
    });
  }

  // Handle Ticket Unclaim Button
  else if (customId === 'btn_unclaim_ticket') {
    const tickets = loadTickets();
    const ticket = tickets.find((t) => t.channelId === interaction.channel.id);

    if (!ticket) {
      return interaction.reply({ content: 'This channel is not an active ticket.', flags: MessageFlags.Ephemeral });
    }

    if (ticket.claimedBy !== user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'Only the staff member who claimed this ticket can unclaim it.', flags: MessageFlags.Ephemeral });
    }

    ticket.claimedBy = null;
    saveTickets(tickets);

    await interaction.channel.setTopic(`Ticket Category: ${ticket.category} | Unclaimed`).catch(() => {});

    const updatedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_claim_ticket')
        .setLabel('Claim Ticket')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn_pin_ticket')
        .setLabel('Pin Ticket')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('btn_close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('btn_delete_ticket')
        .setLabel('Delete Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const unclaimEmbed = new EmbedBuilder()
      .setTitle('Ticket Unclaimed')
      .setColor(0xE67E22)
      .setDescription(`This ticket was unclaimed by ${user} and is now available for other staff members to handle.`)
      .setTimestamp();

    await interaction.reply({ embeds: [unclaimEmbed], components: [updatedRow] });
  }

  // Handle Ticket Pin Button
  else if (customId === 'btn_pin_ticket') {
    try {
      await interaction.message.pin().catch(() => {});

      // Rename channel with 📌 prefix if not already added
      if (!interaction.channel.name.startsWith('📌')) {
        await interaction.channel.setName(`📌-${interaction.channel.name}`).catch(() => {});
      }

      const pinEmbed = new EmbedBuilder()
        .setTitle('📌 Ticket Marked as High Priority')
        .setColor(0xF1C40F)
        .setDescription(
          `This ticket has been **Pinned & Marked High Priority** by ${user}.\n` +
          `The welcome panel message is now pinned to the channel.`
        )
        .setFooter({ text: 'KodebyKarl.net - High Priority Ticket' })
        .setTimestamp();

      await interaction.reply({ embeds: [pinEmbed] });

      await logToChannel(guild, {
        embeds: [
          new EmbedBuilder()
            .setTitle('Ticket Pinned (High Priority)')
            .setColor(0xF1C40F)
            .setDescription(
              `Ticket Channel: #${interaction.channel.name} (<#${interaction.channel.id}>)\n` +
              `Pinned By: ${user.tag} (${user})`
            )
            .setTimestamp()
        ]
      });
    } catch (err) {
      console.error('[PIN ERROR] Failed to pin message:', err);
      await interaction.reply({ content: 'Could not pin message in this channel.', flags: MessageFlags.Ephemeral });
    }
  }

  // Handle Ticket Close Button
  else if (customId === 'btn_close_ticket') {
    const tickets = loadTickets();
    const ticket = tickets.find((t) => t.channelId === interaction.channel.id);

    // Disable SendMessages for ticket creator
    if (ticket) {
      await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        SendMessages: false
      }).catch(() => {});
    }

    // Rename channel with closed prefix
    if (!interaction.channel.name.startsWith('closed-')) {
      const cleanName = interaction.channel.name.replace(/^📌-/, '');
      await interaction.channel.setName(`closed-${cleanName}`).catch(() => {});
    }

    const closeEmbed = new EmbedBuilder()
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('🔒 Ticket Closed')
      .setColor(0xE67E22)
      .setDescription(
        `The ticket has been closed by ${user}.\n\n` +
        `• **Closed By**: ${user} (\`${user.id}\`)\n` +
        `• **Status**: Closed & Locked\n` +
        `• **Actions**: Staff can reopen or permanently delete this ticket channel.`
      )
      .setFooter({ text: 'KodebyKarl.net - Ticket Closed' })
      .setTimestamp();

    const closeControlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_reopen_ticket')
        .setLabel('Reopen Ticket')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('btn_delete_ticket')
        .setLabel('Delete Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [closeEmbed], components: [closeControlRow] });

    // DM ticket creator with closed notification and Customer Review link
    if (ticket) {
      const creatorMember = await guild.members.fetch(ticket.userId).catch(() => null);
      if (creatorMember) {
        const reviewRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('⭐ Leave a Customer Review')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/channels/${guild.id}/${REVIEWS_CHANNEL_ID}`)
        );

        creatorMember.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Ticket Closed')
              .setColor(0xE67E22)
              .setDescription(
                `Hello ${creatorMember.user}, your ticket **#${interaction.channel.name}** at KodebyKarl.net has been closed.\n\n` +
                `Thank you for reaching out! If you enjoyed our service, please leave us a review in <#${REVIEWS_CHANNEL_ID}>!`
              )
              .setTimestamp()
          ],
          components: [reviewRow]
        }).catch(() => {});
      }

      await logToChannel(guild, {
        embeds: [
          new EmbedBuilder()
            .setTitle('Ticket Closed')
            .setColor(0xE67E22)
            .setDescription(
              `Ticket Channel: #${interaction.channel.name}\n` +
              `Closed By: ${user.tag} (${user})\n` +
              `Ticket Creator ID: \`${ticket.userId}\`\n` +
              `Category: ${ticket.category}`
            )
            .setTimestamp()
        ]
      });
    }
  }

  // Handle Ticket Reopen Button
  else if (customId === 'btn_reopen_ticket') {
    const tickets = loadTickets();
    const ticket = tickets.find((t) => t.channelId === interaction.channel.id);

    // Re-enable SendMessages for ticket creator
    if (ticket) {
      await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        SendMessages: true
      }).catch(() => {});
    }

    // Restore original channel name (remove closed- prefix)
    if (interaction.channel.name.startsWith('closed-')) {
      const restoredName = interaction.channel.name.replace(/^closed-/, '');
      await interaction.channel.setName(restoredName).catch(() => {});
    }

    const reopenEmbed = new EmbedBuilder()
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('🔓 Ticket Reopened')
      .setColor(0x2ECC71)
      .setDescription(
        `The ticket has been reopened by ${user}.\n` +
        `The ticket creator can now send messages again.`
      )
      .setFooter({ text: 'KodebyKarl.net - Support Ticket Active' })
      .setTimestamp();

    await interaction.reply({ embeds: [reopenEmbed] });

    if (ticket) {
      const creatorMember = await guild.members.fetch(ticket.userId).catch(() => null);
      if (creatorMember) {
        creatorMember.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Ticket Reopened')
              .setColor(0x2ECC71)
              .setDescription(`Your ticket **#${interaction.channel.name}** has been reopened by staff member ${user}.`)
              .setTimestamp()
          ]
        }).catch(() => {});
      }

      await logToChannel(guild, {
        embeds: [
          new EmbedBuilder()
            .setTitle('Ticket Reopened')
            .setColor(0x2ECC71)
            .setDescription(
              `Ticket Channel: #${interaction.channel.name}\n` +
              `Reopened By: ${user.tag} (${user})\n` +
              `Ticket Creator ID: \`${ticket.userId}\``
            )
            .setTimestamp()
        ]
      });
    }
  }

  // Handle Ticket Delete Button (With Full Transcript Backup Export)
  else if (customId === 'btn_delete_ticket') {
    const tickets = loadTickets();
    const ticketIndex = tickets.findIndex((t) => t.channelId === interaction.channel.id);
    const ticketRecord = tickets[ticketIndex];

    const deleteCountdownEmbed = new EmbedBuilder()
      .setTitle('🗑️ Ticket Deletion Scheduled')
      .setColor(0xE74C3C)
      .setDescription(
        `This ticket channel will be **permanently deleted in 5 seconds**.\n\n` +
        `• **Deleted By**: ${user} (\`${user.id}\`)\n` +
        `• **Transcript Export**: Compiling complete chat transcript log file...`
      )
      .setFooter({ text: 'KodebyKarl.net - Ticket System' })
      .setTimestamp();

    await interaction.reply({ embeds: [deleteCountdownEmbed] });

    // Generate complete message transcript text file
    let transcriptText = `=========================================================\n`;
    transcriptText += `KODEBYKARL.NET - OFFICIAL TICKET TRANSCRIPT LOG\n`;
    transcriptText += `Ticket Channel: #${interaction.channel.name} (${interaction.channel.id})\n`;
    transcriptText += `Deleted By: ${user.tag} (${user.id})\n`;
    transcriptText += `Export Date: ${new Date().toUTCString()}\n`;
    transcriptText += `=========================================================\n\n`;

    try {
      const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
      const sortedMessages = Array.from(fetchedMessages.values()).reverse();

      sortedMessages.forEach((msg) => {
        const timestamp = new Date(msg.createdAt).toLocaleString();
        const content = msg.content || (msg.embeds.length > 0 ? '[Embedded Content]' : '[Attachment/Media]');
        transcriptText += `[${timestamp}] ${msg.author.tag} (${msg.author.id}): ${content}\n`;
      });
    } catch (e) {
      transcriptText += `(Failed to extract full transcript history: ${e.message})\n`;
    }

    const transcriptBuffer = Buffer.from(transcriptText, 'utf8');
    const attachmentFile = { attachment: transcriptBuffer, name: `transcript-${interaction.channel.name}.txt` };

    if (ticketRecord) {
      // Send transcript to staff log channel
      await logToChannel(guild, {
        embeds: [
          new EmbedBuilder()
            .setTitle('Ticket Permanently Deleted (Transcript Logged)')
            .setColor(0xE74C3C)
            .setDescription(
              `Ticket Channel: #${interaction.channel.name}\n` +
              `Deleted By: ${user.tag} (${user})\n` +
              `Ticket Creator ID: \`${ticketRecord.userId}\`\n` +
              `Category: ${ticketRecord.category}\n` +
              `Transcript File Attached Below 📄`
            )
            .setTimestamp()
        ],
        files: [attachmentFile]
      });

      // Also DM transcript file to ticket creator
      const creatorMember = await guild.members.fetch(ticketRecord.userId).catch(() => null);
      if (creatorMember) {
        creatorMember.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Ticket Closed & Deleted')
              .setColor(0xE74C3C)
              .setDescription(
                `Your ticket **#${interaction.channel.name}** has been deleted.\n` +
                `We have attached a text file copy of your ticket transcript for your records.`
              )
              .setTimestamp()
          ],
          files: [attachmentFile]
        }).catch(() => {});
      }

      tickets.splice(ticketIndex, 1);
      saveTickets(tickets);
    }

    setTimeout(() => {
      interaction.channel.delete('Ticket channel deleted by staff request.').catch(() => {});
    }, 5000);
  }


});

// Message Listener for Admin Deploy Commands & Activity Timestamp Tracking
client.on('messageCreate', async (message) => {
  // -------------------------------------------------------------
  // Sticky Note Resend Trigger for Channel 1542475718682869872
  // Re-posts sticky note at bottom whenever any user sends a message
  // -------------------------------------------------------------
  const stickyChannelId = process.env.STICKY_CHANNEL_ID || STICKY_CHANNEL_ID;
  if (message.channel.id === stickyChannelId && !message.author.bot) {
    await deployStickyNote(message.guild, true);
  }

  if (message.author.bot || !message.guild) return;

  // Admin Command to Deploy Ticket Panel: !deploytickets
  if (message.content.toLowerCase() === '!deploytickets') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the ticket panel.');
    }

    await deployTicketPanel(message.guild);
    return message.reply('Ticket panel deployed successfully.');
  }

  // Admin Command to Deploy Server Info Panel: !deployserverinfo
  if (message.content.toLowerCase() === '!deployserverinfo') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the server info panel.');
    }

    await deployServerInfo(message.guild);
    return message.reply('Server info panel deployed successfully.');
  }

  // Admin Command to Deploy Landing Page: !deploylanding
  if (message.content.toLowerCase() === '!deploylanding') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the landing page.');
    }

    await deployLandingPage(message.guild);
    return message.reply('Landing page announcement deployed successfully.');
  }

  // Admin Command to Deploy Dev GitHub Panel: !deploydevgithub
  if (['!deploydevgithub', '!deploydev', '!deploygithub'].includes(message.content.toLowerCase().trim())) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the Dev GitHub panel.');
    }

    await deployDevGithub(message.guild);
    return message.reply('Dev GitHub & Script Commit panel deployed successfully.');
  }

  // Admin Command to post a script update commit embed: !postcommit <Script Name> | <Version> | <Changelog / Details>
  if (message.content.toLowerCase().startsWith('!postcommit ')) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to post commit updates.');
    }

    const rawInput = message.content.slice(12).trim();
    const parts = rawInput.split('|').map((p) => p.trim());

    if (parts.length < 3) {
      return message.reply('Usage: `!postcommit <Script Name> | <Version> | <Changelog / Commit Details>`');
    }

    const [scriptName, version, changelog] = parts;
    const channelId = process.env.DEV_GITHUB_CHANNEL_ID || DEV_GITHUB_CHANNEL_ID;
    const targetChannel = await message.guild.channels.fetch(channelId).catch(() => null);

    if (!targetChannel || !targetChannel.isTextBased()) {
      return message.reply(`Dev-Github channel (ID: \`${channelId}\`) was not found or is invalid.`);
    }

    const commitEmbed = new EmbedBuilder()
      .setTitle(`Script Update: ${scriptName} (${version})`)
      .setColor(0x2ECC71)
      .setImage(EMBED_IMAGE_URL)
      .setDescription(`**Commit / Update Details:**\n${changelog}`)
      .addFields(
        { name: 'Posted By', value: `${message.author}`, inline: true },
        { name: 'Version', value: `\`${version}\``, inline: true },
        { name: 'GitHub URL', value: `[GitHub Repository](${GITHUB_URL})`, inline: true }
      )
      .setFooter({ text: 'KODEBYKARL.NET - Dev-Github Updates' })
      .setTimestamp();

    await targetChannel.send({ embeds: [commitEmbed] });
    return message.reply(`Commit update for **${scriptName}** posted to <#${channelId}>!`);
  }

  // Admin Command to Deploy Partnership Panel: !deploypartnership
  if (['!deploypartnership', '!deploypartner'].includes(message.content.toLowerCase().trim())) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the Partnership panel.');
    }

    await deployPartnership(message.guild);
    return message.reply('Partnership & Sponsorship panel deployed successfully.');
  }

  // Admin Command to post a Partnership Announcement embed: !postpartner <Partner Name> | <Details / Perks> | <Link / Invite>
  if (message.content.toLowerCase().startsWith('!postpartner ')) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to post partnership announcements.');
    }

    const rawInput = message.content.slice(13).trim();
    const parts = rawInput.split('|').map((p) => p.trim());

    if (parts.length < 2) {
      return message.reply('Usage: `!postpartner <Partner Name> | <Details / Perks> | [Optional Link / Discord Invite]`');
    }

    const [partnerName, details, partnerLink] = parts;
    const channelId = process.env.PARTNERSHIP_CHANNEL_ID || PARTNERSHIP_CHANNEL_ID;
    const targetChannel = await message.guild.channels.fetch(channelId).catch(() => null);

    if (!targetChannel || !targetChannel.isTextBased()) {
      return message.reply(`Partnership channel (ID: \`${channelId}\`) was not found or is invalid.`);
    }

    const partnerEmbed = new EmbedBuilder()
      .setTitle(`Official Partner Announcement: ${partnerName}`)
      .setColor(0x9B59B6)
      .setImage(EMBED_IMAGE_URL)
      .setDescription(`**Partnership & Collaboration Overview:**\n${details}`)
      .addFields(
        { name: 'Announced By', value: `${message.author}`, inline: true },
        { name: 'Partner Link / Server', value: partnerLink ? `[Visit Partner](${partnerLink})` : 'N/A', inline: true }
      )
      .setFooter({ text: 'KODEBYKARL.NET - Official Partnerships' })
      .setTimestamp();

    await targetChannel.send({ embeds: [partnerEmbed] });
    return message.reply(`Partnership announcement for **${partnerName}** posted to <#${channelId}>!`);
  }

  // Command to check live partner FiveM server profile, status, and player count: !serverstatus / !status
  if (['!serverstatus', '!partnerstatus', '!status'].includes(message.content.toLowerCase().trim())) {
    const statusData = await fetchFiveMServerStatus(FIVE_M_SERVER_IP, FIVE_M_SERVER_PORT);
    const statusBadge = statusData.online
      ? `🟢 **ONLINE** (${statusData.ping}ms)`
      : `🔴 **OFFLINE**`;
    const playerPercentage = Math.round((statusData.onlinePlayers / (statusData.maxPlayers || 1)) * 100);

    const statusEmbed = new EmbedBuilder()
      .setTitle(`Live Server Monitor: ${statusData.serverName}`)
      .setColor(statusData.online ? 0x2ECC71 : 0xE74C3C)
      .setThumbnail('https://www.pandoracity.online/assets/PandoraCity-FgWJxJAO.png')
      .setImage(EMBED_IMAGE_URL)
      .addFields(
        { name: 'Server Name (Profile)', value: `${statusData.serverName}`, inline: true },
        { name: 'Game Type / Framework', value: `${statusData.gameType}`, inline: true },
        { name: 'Status', value: `${statusBadge}`, inline: true },
        { name: 'Online Players', value: `\`${statusData.onlinePlayers} / ${statusData.maxPlayers}\` (${playerPercentage}%)`, inline: true },
        { name: 'Partner Discord', value: `[Join Discord](${PARTNER_1_INVITE})`, inline: true }
      )
      .setFooter({ text: 'KODEBYKARL.NET - Live Server Status Check' })
      .setTimestamp();

    return message.reply({ embeds: [statusEmbed] });
  }

  // Admin Command to Deploy Customer Review Panel: !deployreviews
  if (['!deployreviews', '!deployreviewpanel', '!deployreview'].includes(message.content.toLowerCase().trim())) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the Customer Review panel.');
    }

    await deployReviewPanel(message.guild);
    return message.reply('Customer Review panel deployed successfully.');
  }

  // Admin Command to Publish/Sync all reviews to the Reviews Channel: !publishreviews
  if (['!publishreviews', '!syncreviews', '!postallreviews'].includes(message.content.toLowerCase().trim())) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to publish reviews.');
    }

    message.reply('Publishing reviews to channel... Please wait a moment.');
    await syncReviewsToChannel(message.guild, 105);
    return message.channel.send('All customer reviews have been published to the Reviews channel successfully!');
  }

  // Admin Command to Deploy Sticky Note Panel: !deploysticky
  if (['!deploysticky', '!stickynote', '!sticky'].includes(message.content.toLowerCase().trim())) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the Sticky Note.');
    }

    await deployStickyNote(message.guild, true);
    return message.reply('Sticky Note deployed at the bottom of the Sticky channel successfully.');
  }



  // Activity Tracking for 24-Hour Auto-Close
  const tickets = loadTickets();
  const activeTicket = tickets.find((t) => t.channelId === message.channel.id);

  if (activeTicket) {
    activeTicket.lastActivity = Date.now();
    saveTickets(tickets);
  }
});

// Process Level Error Handling to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

// Connect to Discord Gateway
client.login(DISCORD_TOKEN);

