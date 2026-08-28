const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const { loadReviews, saveReviews } = require('../utils/database');
const { logToChannel } = require('../utils/logger');

/**
 * Helper to update Bot Status Activity with live review count
 * @param {import('discord.js').Client} client 
 */
function updateBotPresence(client) {
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

/**
 * Handle Review Interactions (Buttons & Modal Submissions)
 * @param {import('discord.js').Interaction} interaction 
 * @param {import('discord.js').Client} client 
 */
async function handleReviewInteractions(interaction, client) {
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
    const channelId = process.env.REVIEWS_CHANNEL_ID || config.REVIEWS_CHANNEL_ID;
    const reviewChannel = await interaction.guild?.channels.fetch(channelId).catch(() => null);

    if (!reviewChannel || !reviewChannel.isTextBased()) {
      return interaction.editReply({ content: `Review channel (ID: \`${channelId}\`) was not found or is invalid.` });
    }

    const anonIndex = reviews.filter((r) => r.isAnon).length + 1;
    const displayUsername = isAnon ? `Anony ${anonIndex}` : interaction.user.tag;

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

    updateBotPresence(client);

    const authorName = isAnon ? `Anonymous Customer (${displayUsername})` : interaction.user.tag;
    const authorIcon = isAnon ? undefined : interaction.user.displayAvatarURL({ dynamic: true });

    const reviewEmbed = new EmbedBuilder()
      .setAuthor({ name: authorName, iconURL: authorIcon })
      .setTitle(`Customer Review - ${stars} (${ratingNum}/5)`)
      .setColor(0xF1C40F)
      .setImage(config.EMBED_IMAGE_URL)
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
  }
}

module.exports = { handleReviewInteractions, updateBotPresence };
