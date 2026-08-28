const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { logToChannel } = require('../utils/logger');
const { getFormattedBadges } = require('../utils/badges');
const { sendWelcomeLandingMessage } = require('../panels/landingPanel');

// Memory store for tracking active DM verification sessions per user (userId -> { collector, timeoutTimer })
const activeVerifications = new Map();

/**
 * Handle Member Leave / Remove Event
 * @param {import('discord.js').GuildMember} member 
 */
function handleGuildMemberRemove(member) {
  if (activeVerifications.has(member.id)) {
    const session = activeVerifications.get(member.id);
    if (session.timeoutTimer) clearTimeout(session.timeoutTimer);
    if (session.collector) session.collector.stop('left_guild');
    activeVerifications.delete(member.id);
    console.log(`[VERIFICATION] Cleared active verification session for departing member: ${member.user?.tag || member.id}`);
  }
}

/**
 * Handle Member Join Event
 * @param {import('discord.js').GuildMember} member 
 */
async function handleGuildMemberAdd(member) {
  console.log(`[JOIN] New member: ${member.user.tag} (ID: ${member.id}) in guild: ${member.guild.name}`);

  // Clean up any existing active verification session for this user ID
  if (activeVerifications.has(member.id)) {
    const oldSession = activeVerifications.get(member.id);
    if (oldSession.timeoutTimer) clearTimeout(oldSession.timeoutTimer);
    if (oldSession.collector) oldSession.collector.stop('rejoined');
    activeVerifications.delete(member.id);
    console.log(`[VERIFICATION] Cleared prior active verification session for rejoining member: ${member.user.tag}`);
  }

  // -------------------------------------------------------------
  // FEATURE 1 — SECURITY JOIN LOG
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
    .setImage(config.EMBED_IMAGE_URL)
    .setDescription(
      `Welcome ${member.user}. We specialize in high-quality custom FiveM scripts, standalone resources, and tailored server solutions.\n\n` +
      `Browse Our Catalog:\n` +
      `[${config.WEBSITE_URL}](${config.WEBSITE_URL})\n\n` +
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
  } catch (dmError1) {
    console.warn(`[DM RETRY] Direct member.send failed for ${member.user.tag} (${member.id}): ${dmError1.message}. Retrying via createDM(true)...`);
    try {
      const dmChannel = await member.user.createDM(true);
      dmMessage = await dmChannel.send({
        embeds: [welcomeEmbed],
        components: [actionRow]
      });
    } catch (dmError2) {
      console.error(`[DM FAILED] Could not send DM to ${member.user.tag} (${member.id}):`, dmError2.message);

      try {
        const currentMember = await member.guild.members.fetch(member.id).catch(() => null);
        if (currentMember) {
          await currentMember.kick('Could not verify - DMs are disabled or blocked.');
        }

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
  }

  const collector = dmMessage.createMessageComponentCollector({
    filter: (interaction) => interaction.user.id === member.id,
    max: 1,
    time: 600000 // 10 minutes
  });

  const timeoutTimer = setTimeout(async () => {
    activeVerifications.delete(member.id);
    collector.stop('timeout_expired');

    try {
      const expiredDmEmbed = new EmbedBuilder()
        .setTitle('Verification Expired')
        .setColor(0xE74C3C)
        .setDescription(
          `Your verification request timed out because no response was received within 10 minutes. You have been removed from the server.`
        )
        .setTimestamp();

      await dmMessage.edit({ embeds: [expiredDmEmbed], components: [] }).catch(() => {});

      const currentMember = await member.guild.members.fetch(member.id).catch(() => null);
      if (currentMember) {
        await currentMember.kick('Verification timed out (10 minutes).');
      }

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
  }, 600000);

  activeVerifications.set(member.id, { collector, timeoutTimer });

  collector.on('collect', async (interaction) => {
    if (activeVerifications.has(member.id)) {
      const session = activeVerifications.get(member.id);
      if (session.timeoutTimer) clearTimeout(session.timeoutTimer);
      activeVerifications.delete(member.id);
    }

    if (interaction.customId === 'accept_verification') {
      try {
        await member.roles.add(config.VERIFIED_ROLE_ID);

        const acceptedDmEmbed = new EmbedBuilder()
          .setTitle('Verification Successful')
          .setColor(0x2ECC71)
          .setDescription(
            `Thank you for accepting the terms. You have been granted full access to the server.\n\n` +
            `Landing Page Channel: <#${config.LANDING_CHANNEL_ID}>\n` +
            `Browse Catalog: [${config.WEBSITE_URL}](${config.WEBSITE_URL})\n` +
            `Need a Script or Support?: Head over to <#${config.TICKET_PANEL_CHANNEL_ID}> to open a ticket.`
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
            `Status: Accepted terms and assigned verified role (<@&${config.VERIFIED_ROLE_ID}>).\n` +
            `Landing Channel: <#${config.LANDING_CHANNEL_ID}>`
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

        const currentMember = await member.guild.members.fetch(member.id).catch(() => null);
        if (currentMember) {
          await currentMember.kick('Declined server verification/terms.');
        }

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
}

module.exports = { handleGuildMemberAdd, handleGuildMemberRemove, activeVerifications };
