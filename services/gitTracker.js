const { EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const config = require('../config');
const { loadCommitState, saveCommitState } = require('../utils/database');

/**
 * Helper to fetch and check for git repository commit updates.
 * Sends log embed to DEV_GITHUB_CHANNEL_ID when a new commit is detected.
 * Optionally pulls changes if AUTO_PULL_UPDATES is true.
 *
 * @param {import('discord.js').Guild} guild 
 * @param {boolean} manualTrigger 
 * @returns {Promise<{newCommit: boolean, hash?: string, message?: string, author?: string, output?: string}>}
 */
async function checkGitUpdates(guild, manualTrigger = false) {
  try {
    // 1. Fetch remote references asynchronously
    await execPromise('git fetch origin').catch(() => {});

    // 2. Get local HEAD commit hash
    const { stdout: localHashRaw } = await execPromise('git rev-parse HEAD').catch(() => ({ stdout: '' }));
    const localHash = localHashRaw.trim();
    if (!localHash) {
      if (manualTrigger) return { newCommit: false, output: 'Failed to retrieve git commit hash (not a valid git repository).' };
      return { newCommit: false };
    }

    // 3. Get remote tracking branch commit hash if available
    let remoteHash = localHash;
    try {
      const { stdout: rHash } = await execPromise('git rev-parse @{u}');
      remoteHash = rHash.trim();
    } catch {
      try {
        const { stdout: rHash } = await execPromise('git rev-parse origin/main');
        remoteHash = rHash.trim();
      } catch {
        try {
          const { stdout: rHash } = await execPromise('git rev-parse origin/master');
          remoteHash = rHash.trim();
        } catch {
          remoteHash = localHash;
        }
      }
    }

    const state = loadCommitState();
    const isFirstRun = !state.lastHash;

    if (isFirstRun) {
      state.lastHash = localHash;
      saveCommitState(state);
      if (manualTrigger) {
        return { newCommit: false, hash: localHash, output: `Git commit tracking initialized at commit \`${localHash.slice(0, 7)}\`.` };
      }
      return { newCommit: false, hash: localHash };
    }

    const hasRemoteUpdate = remoteHash && remoteHash !== localHash && remoteHash !== state.lastHash;
    const hasLocalUpdate = localHash !== state.lastHash;

    if (!hasRemoteUpdate && !hasLocalUpdate) {
      if (manualTrigger) {
        return { newCommit: false, hash: localHash, output: `Bot repository is up to date! Current commit: \`${localHash.slice(0, 7)}\`.` };
      }
      return { newCommit: false, hash: localHash };
    }

    const targetHash = hasRemoteUpdate ? remoteHash : localHash;

    // Get details for target commit
    const { stdout: commitInfo } = await execPromise(`git log -1 --format="%h|%an|%ar|%s" ${targetHash}`).catch(() => ({
      stdout: `${targetHash.slice(0, 7)}|Developer|Recently|New repository commit`
    }));

    const parts = commitInfo.trim().split('|');
    const shortHash = parts[0] || targetHash.slice(0, 7);
    const author = parts[1] || 'Developer';
    const relativeDate = parts[2] || 'Recently';
    const commitMsg = parts[3] || 'New repository update detected';

    const autoPullEnabled = config.AUTO_PULL_UPDATES;
    let pullStatusText = 'ℹ️ Auto-pull disabled (Code saved locally)';

    if (hasRemoteUpdate && autoPullEnabled) {
      try {
        await execPromise('git stash').catch(() => {});
        await execPromise('git pull origin main');
        pullStatusText = '✅ Code successfully updated via git pull';
        console.log(`[GIT AUTO UPDATE] Auto-pulled commit ${shortHash}`);
      } catch (pullErr) {
        try {
          await execPromise('git fetch origin && git reset --hard origin/main');
          pullStatusText = '✅ Code successfully updated via git reset';
          console.log(`[GIT AUTO UPDATE] Auto-updated via git reset to commit ${shortHash}`);
        } catch (resetErr) {
          pullStatusText = `⚠️ git pull attempted but failed: ${pullErr.message}`;
          console.error('[GIT AUTO UPDATE ERROR]', pullErr.message);
        }
      }
    }

    // Save state
    state.lastHash = targetHash;
    saveCommitState(state);

    // Send update embed to DEV_GITHUB_CHANNEL_ID
    if (guild) {
      const channelId = process.env.DEV_GITHUB_CHANNEL_ID || config.DEV_GITHUB_CHANNEL_ID;
      const targetChannel = await guild.channels.fetch(channelId).catch(() => null);

      if (targetChannel && targetChannel.isTextBased()) {
        const updateEmbed = new EmbedBuilder()
          .setTitle(`🚀 New Script/Bot Commit Detected: ${shortHash}`)
          .setColor(0x2ECC71)
          .setImage(config.EMBED_IMAGE_URL)
          .setDescription(
            `**Changelog / Commit Message:**\n\`\`\`${commitMsg}\`\`\`\n` +
            `**Repository Link:** [GitHub Repository](${config.GITHUB_URL})`
          )
          .addFields(
            { name: 'Commit Hash', value: `\`${shortHash}\``, inline: true },
            { name: 'Developer / Author', value: `${author}`, inline: true },
            { name: 'Time', value: `${relativeDate}`, inline: true },
            { name: 'Update Status', value: pullStatusText, inline: false }
          )
          .setFooter({ text: 'KODEBYKARL.NET - Auto Git Commit Tracker' })
          .setTimestamp();

        await targetChannel.send({ embeds: [updateEmbed] }).catch((err) => console.error('[GIT LOG SEND ERROR]', err.message));
      }
    }

    return {
      newCommit: true,
      hash: shortHash,
      message: commitMsg,
      author,
      output: `New commit detected: \`${shortHash}\` - ${commitMsg}`
    };
  } catch (err) {
    console.error('[GIT CHECK ERROR] Exception in checkGitUpdates:', err);
    return { newCommit: false, output: `Git check error: ${err.message}` };
  }
}

module.exports = { checkGitUpdates, execPromise };
