const config = require('../config');

/**
 * Helper to fetch live FiveM server metrics (Profile, Status, Online Players)
 * @param {string} ip 
 * @param {string|number} port 
 * @returns {Promise<{online: boolean, serverName: string, gameType: string, onlinePlayers: number, maxPlayers: number, ping: number}>}
 */
async function fetchFiveMServerStatus(ip = config.FIVE_M_SERVER_IP, port = config.FIVE_M_SERVER_PORT) {
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

module.exports = { fetchFiveMServerStatus };
