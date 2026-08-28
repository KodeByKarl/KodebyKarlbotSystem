const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config');
const { loadTickets, saveTickets } = require('../utils/database');
const { logToChannel } = require('../utils/logger');

/**
 * Handle Ticket Interaction Events
 * @param {import('discord.js').ButtonInteraction} interaction 
 * @param {import('discord.js').Client} client 
 */
async function handleTicketInteractions(interaction, client) {
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
      btn_ticket_sales: { name: 'Sales Ticket', shortName: 'Sales', slug: 'sales', categoryId: config.CATEGORY_SALES_ID },
      btn_ticket_renewals: { name: 'Service Renewals Ticket', shortName: 'Service Renewals', slug: 'renewals', categoryId: config.CATEGORY_SERVICE_ID },
      btn_ticket_support: { name: 'Technical Support Ticket', shortName: 'Technical Support', slug: 'support', categoryId: config.CATEGORY_TECHNICAL_ID },
      btn_ticket_partnership: { name: 'Partnership Inquiry Ticket', shortName: 'Partnership Inquiry', slug: 'partnership', categoryId: config.CATEGORY_PARTNERSHIP_ID }
    };

    const ticketInfo = categoryMap[customId] || { name: 'Support Ticket', shortName: 'Support', slug: 'support', categoryId: config.CATEGORY_TECHNICAL_ID };
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
      if (config.STAFF_ROLE_ID) {
        permissionOverwrites.push({
          id: config.STAFF_ROLE_ID,
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
        parent: ticketInfo.categoryId || config.TICKET_CATEGORY_ID || undefined,
        permissionOverwrites
      });

      // Post initial welcome ticket embed matching screenshot layout
      const ticketWelcomeEmbed = new EmbedBuilder()
        .setTitle(`${ticketInfo.name}`)
        .setColor(0xF39C12)
        .setImage(config.EMBED_IMAGE_URL)
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

    if (ticket) {
      await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        SendMessages: false
      }).catch(() => {});
    }

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

    if (ticket) {
      const creatorMember = await guild.members.fetch(ticket.userId).catch(() => null);
      if (creatorMember) {
        const reviewRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('⭐ Leave a Customer Review')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/channels/${guild.id}/${config.REVIEWS_CHANNEL_ID}`)
        );

        creatorMember.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Ticket Closed')
              .setColor(0xE67E22)
              .setDescription(
                `Hello ${creatorMember.user}, your ticket **#${interaction.channel.name}** at KodebyKarl.net has been closed.\n\n` +
                `Thank you for reaching out! If you enjoyed our service, please leave us a review in <#${config.REVIEWS_CHANNEL_ID}>!`
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

    if (ticket) {
      await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        SendMessages: true
      }).catch(() => {});
    }

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

  // Handle Ticket Delete Button (With Transcript Export)
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
}

module.exports = { handleTicketInteractions };
