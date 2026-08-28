const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { loadReviews, saveReviews } = require('../utils/database');

/**
 * Helper to deploy or update the Customer Review Panel in REVIEWS_CHANNEL_ID.
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').Client} client 
 */
async function deployReviewPanel(guild, client) {
  try {
    const channelId = process.env.REVIEWS_CHANNEL_ID || config.REVIEWS_CHANNEL_ID;
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
      .setImage(config.EMBED_IMAGE_URL)
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
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').Client} client 
 */
async function syncReviewsToChannel(guild, client) {
  try {
    const channelId = process.env.REVIEWS_CHANNEL_ID || config.REVIEWS_CHANNEL_ID;
    if (!channelId || !guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error(`[REVIEWS SYNC ERROR] Review channel (ID: ${channelId}) was not found or is not a text channel.`);
      return;
    }

    const reviews = loadReviews();
    if (reviews.length === 0) return;

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
        .setImage(config.EMBED_IMAGE_URL)
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

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log('[REVIEWS SYNC] All unposted reviews successfully published and verified!');
  } catch (err) {
    console.error('[REVIEWS SYNC ERROR] Failed to sync reviews to channel:', err);
  }
}

module.exports = { deployReviewPanel, syncReviewsToChannel };
