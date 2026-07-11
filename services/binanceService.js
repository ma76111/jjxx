import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const BASE_URL = 'https://api.binance.com';

function hasBinanceKeys() {
  return !!(config.BINANCE_API_KEY && config.BINANCE_API_SECRET);
}

function sign(query) {
  return crypto
    .createHmac('sha256', config.BINANCE_API_SECRET)
    .update(query)
    .digest('hex');
}

/**
 * Verify a TXID against Binance API.
 * Falls back to manual review if keys are not configured.
 */
export async function verifyTxid(txid, expectedAmount, network) {
  if (!hasBinanceKeys()) {
    logger.info('[Binance] No API keys — manual review mode');
    return { verified: false, reason: 'no_api_keys' };
  }

  try {
    const timestamp = Date.now();
    const query = `txId=${txid}&timestamp=${timestamp}`;
    const signature = sign(query);

    const response = await axios.get(`${BASE_URL}/sapi/v1/capital/deposit/hisrec`, {
      params: { txId: txid, timestamp, signature },
      headers: {
        'X-MBX-APIKEY': config.BINANCE_API_KEY,
      },
      timeout: 10000,
    });

    const deposits = response.data;
    if (!Array.isArray(deposits) || deposits.length === 0) {
      return { verified: false, reason: 'txid_not_found' };
    }

    const deposit = deposits[0];
    // Status 1 = success in Binance
    if (deposit.status !== 1) {
      return { verified: false, reason: 'tx_not_confirmed' };
    }

    const actualAmount = parseFloat(deposit.amount);
    if (Math.abs(actualAmount - expectedAmount) > 0.001) {
      return { verified: false, reason: 'amount_mismatch', actual: actualAmount };
    }

    return { verified: true, actual_amount: actualAmount };
  } catch (err) {
    logger.error('[Binance] API error:', { err: err.message });
    return { verified: false, reason: 'api_error' };
  }
}

export function isBinanceConfigured() {
  return hasBinanceKeys();
}
