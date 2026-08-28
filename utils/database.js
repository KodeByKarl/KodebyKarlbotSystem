const fs = require('fs');
const path = require('path');

const TICKETS_FILE = path.join(__dirname, '..', 'tickets.json');
const REVIEWS_FILE = path.join(__dirname, '..', 'reviews.json');
const COMMIT_STATE_FILE = path.join(__dirname, '..', 'commit_state.json');

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

function saveTickets(tickets) {
  try {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2), 'utf8');
  } catch (err) {
    console.error('[DATABASE ERROR] Failed to save tickets.json:', err);
  }
}

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

function saveReviews(reviews) {
  try {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), 'utf8');
  } catch (err) {
    console.error('[DATABASE ERROR] Failed to save reviews.json:', err);
  }
}

function loadCommitState() {
  try {
    if (fs.existsSync(COMMIT_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(COMMIT_STATE_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[GIT ERROR] Failed to load commit_state.json:', err);
  }
  return { lastHash: null };
}

function saveCommitState(state) {
  try {
    fs.writeFileSync(COMMIT_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('[GIT ERROR] Failed to save commit_state.json:', err);
  }
}

module.exports = {
  loadTickets,
  saveTickets,
  loadReviews,
  saveReviews,
  loadCommitState,
  saveCommitState
};
