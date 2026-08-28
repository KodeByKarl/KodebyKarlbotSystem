/**
 * FiveM Custom Script Shop - Discord Verification & Security Logging Bot
 * Built using discord.js v14 - Clean Modular Architecture
 */

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');

// Handlers & Services
const { handleGuildMemberAdd, handleGuildMemberRemove } = require('./handlers/verification');
const { handleTicketInteractions } = require('./handlers/tickets');
const { handleReviewInteractions, updateBotPresence } = require('./handlers/reviews');
const { handleMessageCommands } = require('./handlers/commands');
const { checkInactiveTickets } = require('./handlers/autoClose');
const { checkGitUpdates } = require('./services/gitTracker');

// Panel Deployment Modules
const { deployTicketPanel } = require('./panels/ticketPanel');
const { deployServerInfo } = require('./panels/serverInfoPanel');
const { deployLandingPage } = require('./panels/landingPanel');
const { deployDevGithub } = require('./panels/devGithubPanel');
const { deployPartnership } = require('./panels/partnershipPanel');
const { deployReviewPanel, syncReviewsToChannel } = require('./panels/reviewPanel');
const { deployStickyNote } = require('./panels/stickyPanel');

// Validate DISCORD_TOKEN
if (!config.DISCORD_TOKEN) {
  console.error('[FATAL ERROR] DISCORD_TOKEN is not defined in environment variables or .env file.');
  process.exit(1);
}

if (!config.LOG_CHANNEL_ID) {
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

// Ready Event
client.once('clientReady', async () => {
  console.log('=================================================');
  console.log(`Bot logged in as ${client.user.tag}`);
  console.log(`Target Verified Role ID: ${config.VERIFIED_ROLE_ID}`);
  console.log(`Target Log Channel ID:   ${config.LOG_CHANNEL_ID || 'Not Configured'}`);
  console.log(`Landing Page Channel ID: ${config.LANDING_CHANNEL_ID}`);
  console.log(`Server Info Channel ID:  ${config.SERVER_INFO_CHANNEL_ID}`);
  console.log(`Dev-Github Channel ID:   ${config.DEV_GITHUB_CHANNEL_ID}`);
  console.log(`Partnership Channel ID:  ${config.PARTNERSHIP_CHANNEL_ID}`);
  console.log(`Reviews Channel ID:      ${config.REVIEWS_CHANNEL_ID}`);
  console.log(`Sticky Note Channel ID:  ${config.STICKY_CHANNEL_ID}`);
  console.log(`Ticket Panel Channel ID: ${config.TICKET_PANEL_CHANNEL_ID}`);
  console.log(`Website URL:             ${config.WEBSITE_URL}`);
  console.log('=================================================');

  const guild = client.guilds.cache.first();
  if (guild) {
    await deployTicketPanel(guild, client);
    await deployServerInfo(guild, client);
    await deployLandingPage(guild, client);
    await deployDevGithub(guild, client);
    await deployPartnership(guild, client);
    await deployReviewPanel(guild, client);
    await syncReviewsToChannel(guild, client);
    await deployStickyNote(guild, client);
  }

  updateBotPresence(client);

  // 24-hour inactivity check interval (every 5 mins)
  setInterval(() => checkInactiveTickets(client), 5 * 60 * 1000);

  // Auto-refresh FiveM server metrics & partner panel (every 60s)
  setInterval(async () => {
    const targetGuild = client.guilds.cache.first();
    if (targetGuild) {
      await deployPartnership(targetGuild, client).catch((err) => console.error('[STATUS REFRESH ERROR]', err.message));
    }
  }, 60 * 1000);

  // Initial git commit check
  if (guild) {
    await checkGitUpdates(guild).catch((err) => console.error('[GIT INITIAL CHECK ERROR]', err.message));
  }

  // Auto-Check Git Repository Commits interval
  setInterval(async () => {
    const targetGuild = client.guilds.cache.first();
    if (targetGuild) {
      await checkGitUpdates(targetGuild).catch((err) => console.error('[GIT AUTO CHECK ERROR]', err.message));
    }
  }, config.GIT_CHECK_INTERVAL_MINUTES * 60 * 1000);
});

// Member Events
client.on('guildMemberAdd', (member) => handleGuildMemberAdd(member));
client.on('guildMemberRemove', (member) => handleGuildMemberRemove(member));

// Interaction Event Listener
client.on('interactionCreate', async (interaction) => {
  if (
    interaction.isModalSubmit() ||
    (interaction.isButton() && (interaction.customId === 'btn_leave_review_modal' || interaction.customId === 'btn_leave_review_anon'))
  ) {
    return handleReviewInteractions(interaction, client);
  }

  if (interaction.isButton()) {
    return handleTicketInteractions(interaction, client);
  }
});

// Message Listener
client.on('messageCreate', (message) => handleMessageCommands(message, client));

// Global Error Handling
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

// Login
client.login(config.DISCORD_TOKEN);
