const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { loadTickets, saveTickets } = require('../utils/database');
const { fetchFiveMServerStatus } = require('../services/fivem');
const { checkGitUpdates, execPromise } = require('../services/gitTracker');

const { deployTicketPanel } = require('../panels/ticketPanel');
const { deployServerInfo } = require('../panels/serverInfoPanel');
const { deployLandingPage } = require('../panels/landingPanel');
const { deployDevGithub } = require('../panels/devGithubPanel');
const { deployPartnership } = require('../panels/partnershipPanel');
const { deployReviewPanel, syncReviewsToChannel } = require('../panels/reviewPanel');
const { deployStickyNote } = require('../panels/stickyPanel');
const { handlePaymentCommand } = require('./payment');

/**
 * Handle Message Commands & Activity Tracking
 * @param {import('discord.js').Message} message 
 * @param {import('discord.js').Client} client 
 */
async function handleMessageCommands(message, client) {
  // Sticky Note Resend Trigger for Sticky Channel
  const stickyChannelId = process.env.STICKY_CHANNEL_ID || config.STICKY_CHANNEL_ID;
  if (message.channel.id === stickyChannelId && !message.author.bot) {
    await deployStickyNote(message.guild, client, true);
  }

  if (message.author.bot || !message.guild) return;

  const contentLower = message.content.toLowerCase().trim();

  // Public / Developer Payment Command: !payment or /payment or !pay
  if (['!payment', '/payment', '!pay', '!paymentinfo'].includes(contentLower)) {
    return handlePaymentCommand(message);
  }

  // Admin Command: !deploytickets
  if (contentLower === '!deploytickets') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the ticket panel.');
    }
    await deployTicketPanel(message.guild, client);
    return message.reply('Ticket panel deployed successfully.');
  }

  // Admin Command: !deployserverinfo
  if (contentLower === '!deployserverinfo') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the server info panel.');
    }
    await deployServerInfo(message.guild, client);
    return message.reply('Server info panel deployed successfully.');
  }

  // Admin Command: !deploylanding
  if (contentLower === '!deploylanding') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the landing page.');
    }
    await deployLandingPage(message.guild, client);
    return message.reply('Landing page announcement deployed successfully.');
  }

  // Admin Command: !deploydevgithub
  if (['!deploydevgithub', '!deploydev', '!deploygithub'].includes(contentLower)) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the Dev GitHub panel.');
    }
    await deployDevGithub(message.guild, client);
    return message.reply('Dev GitHub & Script Commit panel deployed successfully.');
  }

  // Admin Command: !postcommit <Script Name> | <Version> | <Changelog / Details>
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
    const channelId = process.env.DEV_GITHUB_CHANNEL_ID || config.DEV_GITHUB_CHANNEL_ID;
    const targetChannel = await message.guild.channels.fetch(channelId).catch(() => null);

    if (!targetChannel || !targetChannel.isTextBased()) {
      return message.reply(`Dev-Github channel (ID: \`${channelId}\`) was not found or is invalid.`);
    }

    const commitEmbed = new EmbedBuilder()
      .setTitle(`Script Update: ${scriptName} (${version})`)
      .setColor(0x2ECC71)
      .setImage(config.EMBED_IMAGE_URL)
      .setDescription(`**Commit / Update Details:**\n${changelog}`)
      .addFields(
        { name: 'Posted By', value: `${message.author}`, inline: true },
        { name: 'Version', value: `\`${version}\``, inline: true },
        { name: 'GitHub URL', value: `[GitHub Repository](${config.GITHUB_URL})`, inline: true }
      )
      .setFooter({ text: 'KODEBYKARL.NET - Dev-Github Updates' })
      .setTimestamp();

    await targetChannel.send({ embeds: [commitEmbed] });
    return message.reply(`Commit update for **${scriptName}** posted to <#${channelId}>!`);
  }

  // Admin Command: !checkupdates or !checkgit or !gitcheck
  if (['!checkupdates', '!checkgit', '!gitcheck'].includes(contentLower)) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to check repository updates.');
    }
    const statusMsg = await message.reply('🔍 Fetching latest git repository updates...');
    const result = await checkGitUpdates(message.guild, true);
    return statusMsg.edit(`📢 **Git Update Check Result:**\n${result.output || 'Check completed.'}`);
  }

  // Admin Command: !gitpull or !updatebot or !pull
  if (['!gitpull', '!updatebot', '!pull'].includes(contentLower)) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to pull repository updates.');
    }
    const statusMsg = await message.reply('🔄 Executing `git pull` from remote repository...');
    try {
      await execPromise('git stash').catch(() => {});
      const { stdout, stderr } = await execPromise('git pull origin main');
      const gitOutput = stdout || stderr || 'Already up to date.';
      await checkGitUpdates(message.guild, true);
      return statusMsg.edit(`✅ **Git Pull Completed:**\n\`\`\`\n${gitOutput.slice(0, 1500)}\n\`\`\``);
    } catch (err) {
      try {
        const { stdout } = await execPromise('git fetch origin && git reset --hard origin/main');
        await checkGitUpdates(message.guild, true);
        return statusMsg.edit(`✅ **Git Pull Completed (via Sync Reset):**\n\`\`\`\n${stdout.slice(0, 1500)}\n\`\`\``);
      } catch (resetErr) {
        console.error('[GIT PULL COMMAND ERROR]', err);
        return statusMsg.edit(`❌ **Git Pull Failed:**\n\`\`\`\n${err.message.slice(0, 1500)}\n\`\`\``);
      }
    }
  }

  // Admin Command: !deploypartnership
  if (['!deploypartnership', '!deploypartner'].includes(contentLower)) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the Partnership panel.');
    }
    await deployPartnership(message.guild, client);
    return message.reply('Partnership & Sponsorship panel deployed successfully.');
  }

  // Admin Command: !postpartner <Partner Name> | <Details / Perks> | <Link / Invite>
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
    const channelId = process.env.PARTNERSHIP_CHANNEL_ID || config.PARTNERSHIP_CHANNEL_ID;
    const targetChannel = await message.guild.channels.fetch(channelId).catch(() => null);

    if (!targetChannel || !targetChannel.isTextBased()) {
      return message.reply(`Partnership channel (ID: \`${channelId}\`) was not found or is invalid.`);
    }

    const partnerEmbed = new EmbedBuilder()
      .setTitle(`Official Partner Announcement: ${partnerName}`)
      .setColor(0x9B59B6)
      .setImage(config.EMBED_IMAGE_URL)
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

  // Public Command: !serverstatus / !partnerstatus / !status
  if (['!serverstatus', '!partnerstatus', '!status', '/status', '/serverstatus'].includes(contentLower)) {
    return handleServerStatusCommand(message);
  }

  // Admin Command: !deployreviews
  if (['!deployreviews', '!deployreviewpanel', '!deployreview'].includes(contentLower)) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the Customer Review panel.');
    }
    await deployReviewPanel(message.guild, client);
    return message.reply('Customer Review panel deployed successfully.');
  }

  // Admin Command: !publishreviews / !syncreviews / !postallreviews
  if (['!publishreviews', '!syncreviews', '!postallreviews'].includes(contentLower)) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to publish reviews.');
    }
    message.reply('Publishing reviews to channel... Please wait a moment.');
    await syncReviewsToChannel(message.guild, client);
    return message.channel.send('All customer reviews have been published to the Reviews channel successfully!');
  }

  // Admin Command: !deploysticky
  if (['!deploysticky', '!stickynote', '!sticky'].includes(contentLower)) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('You do not have Administrator permissions to deploy the Sticky Note.');
    }
    await deployStickyNote(message.guild, client, true);
    return message.reply('Sticky Note deployed at the bottom of the Sticky channel successfully.');
  }

  // Activity Tracking for 24-Hour Auto-Close
  const tickets = loadTickets();
  const activeTicket = tickets.find((t) => t.channelId === message.channel.id);
  if (activeTicket) {
    activeTicket.lastActivity = Date.now();
    saveTickets(tickets);
  }
}

/**
 * Handle Server Status Command (Slash & Message)
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 */
async function handleServerStatusCommand(context) {
  const statusData = await fetchFiveMServerStatus(config.FIVE_M_SERVER_IP, config.FIVE_M_SERVER_PORT);
  const statusBadge = statusData.online
    ? `🟢 **ONLINE** (${statusData.ping}ms)`
    : `🔴 **OFFLINE**`;
  const playerPercentage = Math.round((statusData.onlinePlayers / (statusData.maxPlayers || 1)) * 100);

  const statusEmbed = new EmbedBuilder()
    .setTitle(`Live Server Monitor: ${statusData.serverName}`)
    .setColor(statusData.online ? 0x2ECC71 : 0xE74C3C)
    .setThumbnail('https://www.pandoracity.online/assets/PandoraCity-FgWJxJAO.png')
    .setImage(config.EMBED_IMAGE_URL)
    .addFields(
      { name: 'Server Name (Profile)', value: `${statusData.serverName}`, inline: true },
      { name: 'Game Type / Framework', value: `${statusData.gameType}`, inline: true },
      { name: 'Status', value: `${statusBadge}`, inline: true },
      { name: 'Online Players', value: `\`${statusData.onlinePlayers} / ${statusData.maxPlayers}\` (${playerPercentage}%)`, inline: true },
      { name: 'Partner Discord', value: `[Join Discord](${config.PARTNER_1_INVITE})`, inline: true }
    )
    .setFooter({ text: 'KODEBYKARL.NET - Live Server Status Check' })
    .setTimestamp();

  if (typeof context.isChatInputCommand === 'function' && context.isChatInputCommand()) {
    return context.reply({ embeds: [statusEmbed] });
  } else if (typeof context.reply === 'function') {
    return context.reply({ embeds: [statusEmbed] });
  }
}

module.exports = { handleMessageCommands, handleServerStatusCommand };

