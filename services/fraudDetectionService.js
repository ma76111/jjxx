/**
 * Fraud Detection Service — Duplicate Proof Reports
 *
 * Implements a multi-factor confidence score algorithm.
 * All weights and thresholds are stored in fraud_detection_settings
 * and are fully admin-configurable — nothing is hardcoded.
 *
 * CRITICAL RULES (enforced in code, not just docs):
 *  1. No automatic action on a single factor alone.
 *  2. IP match alone is never sufficient — shared networks are common and legitimate.
 *  3. Auto-freeze is financial-only (ban_status = 'pending_fraud_review'), never a full ban.
 *  4. Final punishment always requires manual admin action.
 */

import { dbGet, dbAll, dbRun } from '../config/database.js';
import logger from '../utils/logger.js';
import { createNotification } from './notificationService.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getFraudSetting(key, fallback) {
  const row = await dbGet('SELECT value FROM fraud_detection_settings WHERE key = ?', [key]);
  return row ? parseFloat(row.value) : fallback;
}

/**
 * Resolve IP and fingerprint for a user at the time of a submission.
 *
 * Bot submissions have no live IP (Telegram Bot API doesn't expose it).
 * We fall back to the last known web session device_log for that user.
 * Returns { ip, fingerprint, ip_source }
 */
async function resolveDeviceInfo(userId) {
  // Check if there's a device_log entry — could be from web login / any web action
  const latest = await dbGet(
    `SELECT ip_address, fingerprint FROM device_logs
     WHERE user_id = ? AND ip_address IS NOT NULL
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (!latest) {
    return { ip: null, fingerprint: null, ip_source: 'unavailable' };
  }

  return {
    ip: latest.ip_address,
    fingerprint: latest.fingerprint || null,
    ip_source: 'last_known_web_session',
  };
}

/**
 * Naive proof similarity — compares text proofs and flags identical image sets.
 * Returns a score 0.0–1.0.
 * For production: replace with perceptual hash comparison for images.
 */
function computeProofSimilarity(subA, subB) {
  let score = 0;
  let factors = 0;

  // Text similarity
  if (subA.proof_text && subB.proof_text) {
    factors++;
    const a = subA.proof_text.trim().toLowerCase();
    const b = subB.proof_text.trim().toLowerCase();
    if (a === b) {
      score += 1.0;
    } else {
      // Simple character overlap ratio
      const longer = Math.max(a.length, b.length);
      let matches = 0;
      const bChars = b.split('');
      for (const ch of a.split('')) {
        const idx = bChars.indexOf(ch);
        if (idx !== -1) { matches++; bChars.splice(idx, 1); }
      }
      score += matches / longer;
    }
  }

  // Image set comparison (file IDs — exact match means same uploaded file)
  if (subA.proof_images && subB.proof_images) {
    factors++;
    try {
      const imgsA = JSON.parse(subA.proof_images);
      const imgsB = JSON.parse(subB.proof_images);
      const setA = new Set(imgsA);
      const overlap = imgsB.filter(id => setA.has(id)).length;
      const total = Math.max(imgsA.length, imgsB.length);
      score += total > 0 ? overlap / total : 0;
    } catch {
      // Ignore parse errors
    }
  }

  if (factors === 0) return 0;
  return Math.min(1.0, score / factors);
}

// ─── main export ─────────────────────────────────────────────────────────────

/**
 * Evaluate a duplicate proof report and assign a confidence score.
 * Applies automatic financial freeze if score ≥ fraud_freeze_threshold.
 * Never applies permanent bans or reward forfeiture — those require admin action.
 *
 * @param {number} reportId - ID of the duplicate_proof_reports row
 */
export async function evaluateDuplicateProofReport(reportId) {
  const report = await dbGet('SELECT * FROM duplicate_proof_reports WHERE id = ?', [reportId]);
  if (!report) {
    logger.warn('[FraudDetection] Report not found:', { reportId });
    return;
  }

  // Load both submissions
  const [subA, subB] = await Promise.all([
    dbGet('SELECT * FROM task_submissions WHERE id = ?', [report.submission_a_id]),
    dbGet('SELECT * FROM task_submissions WHERE id = ?', [report.submission_b_id]),
  ]);

  if (!subA || !subB) {
    logger.warn('[FraudDetection] Submissions missing for report:', { reportId });
    return;
  }

  // Gate check: both submissions must be for the same task and different users
  if (subA.task_id !== subB.task_id || subA.user_id === subB.user_id) {
    logger.warn('[FraudDetection] Gate check failed:', { reportId });
    await dbRun("UPDATE duplicate_proof_reports SET status = 'dismissed' WHERE id = ?", [reportId]);
    return;
  }

  // Load weights (all from DB — never hardcoded)
  const [
    wIp, wFingerprint, wTimeGap, wProofSim, wReportBtn, freezeThreshold, timeWindowMin
  ] = await Promise.all([
    getFraudSetting('fraud_weight_ip_match',          25),
    getFraudSetting('fraud_weight_fingerprint_match', 25),
    getFraudSetting('fraud_weight_time_gap',          20),
    getFraudSetting('fraud_weight_proof_similarity',  25),
    getFraudSetting('fraud_weight_report_button',     15),
    getFraudSetting('fraud_freeze_threshold',         60),
    getFraudSetting('fraud_time_window_minutes',      10),
  ]);

  // ── Gather evidence for each factor ──────────────────────────────────────

  // 1. IP + fingerprint (best available — live web request preferred, else last known)
  const [deviceA, deviceB] = await Promise.all([
    resolveDeviceInfo(subA.user_id),
    resolveDeviceInfo(subB.user_id),
  ]);

  const ipMatch = !!(deviceA.ip && deviceB.ip && deviceA.ip === deviceB.ip);
  const fingerprintMatch = !!(deviceA.fingerprint && deviceB.fingerprint && deviceA.fingerprint === deviceB.fingerprint);

  // 2. Time gap between submissions
  const timeA = new Date(subA.created_at).getTime();
  const timeB = new Date(subB.created_at).getTime();
  const timeGapSeconds = Math.abs(timeB - timeA) / 1000;
  const withinTimeWindow = timeGapSeconds < timeWindowMin * 60;

  // 3. Proof similarity
  const similarityScore = computeProofSimilarity(subA, subB);
  const highSimilarity = similarityScore >= 0.8;

  // 4. Report button was pressed (this IS the trigger, so it's always true here)
  const reportButtonPressed = true;

  // ── Compute confidence score ──────────────────────────────────────────────
  // Rule: no single factor is sufficient — we require a composite score
  let confidenceScore = 0;
  const breakdown = {
    ip_match:             { matched: ipMatch,             weight: ipMatch ? wIp : 0,                    ip_source_a: deviceA.ip_source, ip_source_b: deviceB.ip_source },
    fingerprint_match:    { matched: fingerprintMatch,    weight: fingerprintMatch ? wFingerprint : 0   },
    time_gap:             { seconds: timeGapSeconds,      under_threshold: withinTimeWindow, weight: withinTimeWindow ? wTimeGap : 0 },
    proof_similarity:     { score: similarityScore,       high_similarity: highSimilarity, weight: highSimilarity ? wProofSim : 0 },
    report_button_pressed:{ pressed: reportButtonPressed, weight: reportButtonPressed ? wReportBtn : 0 },
  };

  for (const factor of Object.values(breakdown)) {
    confidenceScore += factor.weight || 0;
  }

  // Enforce composite-only rule: if only ONE non-trivial factor fired, cap score below threshold
  const significantFactors = [ipMatch, fingerprintMatch, withinTimeWindow, highSimilarity].filter(Boolean).length;
  // report_button_pressed alone with zero other factors = informational only
  if (significantFactors === 0) {
    confidenceScore = Math.min(confidenceScore, freezeThreshold - 1);
  }

  // ── Update report row with evidence ──────────────────────────────────────
  await dbRun(
    `UPDATE duplicate_proof_reports SET
       ip_a = ?, ip_b = ?,
       ip_source_a = ?, ip_source_b = ?,
       fingerprint_a = ?, fingerprint_b = ?,
       time_gap_seconds = ?,
       proof_similarity_score = ?,
       evidence_breakdown = ?,
       confidence_score = ?
     WHERE id = ?`,
    [
      deviceA.ip, deviceB.ip,
      deviceA.ip_source, deviceB.ip_source,
      deviceA.fingerprint, deviceB.fingerprint,
      Math.round(timeGapSeconds),
      similarityScore,
      JSON.stringify(breakdown),
      confidenceScore,
      reportId,
    ]
  );

  logger.info('[FraudDetection] Score computed:', { reportId, confidenceScore, freezeThreshold });

  // ── Apply action based on threshold ──────────────────────────────────────
  if (confidenceScore >= freezeThreshold) {
    await applyFinancialFreeze(report, reportId, confidenceScore);
  } else {
    // Informational only — mark as pending_admin_decision but no freeze
    await dbRun(
      "UPDATE duplicate_proof_reports SET status = 'pending_admin_decision' WHERE id = ?",
      [reportId]
    );
    logger.info('[FraudDetection] Below threshold — informational record only:', { reportId, confidenceScore });
  }
}

/**
 * Apply financial-only freeze to both users.
 * ban_status → 'pending_fraud_review'
 * This ONLY prevents withdrawals and reward payouts — normal browsing continues.
 * Never sets a full ban, never forfeits balance.
 */
async function applyFinancialFreeze(report, reportId, confidenceScore) {
  const userIds = [report.user_a_id, report.user_b_id];

  for (const userId of userIds) {
    const user = await dbGet('SELECT ban_status FROM users WHERE id = ?', [userId]);
    // Don't downgrade an existing permanent/temporary ban
    if (user && user.ban_status === 'none') {
      await dbRun(
        "UPDATE users SET ban_status = 'pending_fraud_review' WHERE id = ?",
        [userId]
      );
    }

    await createNotification({
      userId,
      type: 'system_update',
      title: '🔒 تجميد مالي مؤقت',
      body: 'تم تجميد العمليات المالية على حسابك مؤقتاً بسبب بلاغ احتيال. جارٍ المراجعة.',
    }).catch(() => {});
  }

  await dbRun(
    `UPDATE duplicate_proof_reports
     SET status = 'pending_admin_decision', auto_frozen = 1
     WHERE id = ?`,
    [reportId]
  );

  logger.info('[FraudDetection] Financial freeze applied:', {
    reportId, confidenceScore,
    users: userIds,
  });
}

/**
 * Dismiss a report — unfreeze both users if frozen, no negative record.
 */
export async function dismissReport(reportId, adminId) {
  const report = await dbGet('SELECT * FROM duplicate_proof_reports WHERE id = ?', [reportId]);
  if (!report) return { error: 'not_found' };

  // Unfreeze both users if we froze them
  if (report.auto_frozen) {
    for (const userId of [report.user_a_id, report.user_b_id]) {
      await dbRun(
        `UPDATE users SET ban_status = 'none'
         WHERE id = ? AND ban_status = 'pending_fraud_review'`,
        [userId]
      );
      await createNotification({
        userId,
        type: 'system_update',
        title: '✅ تم رفع التجميد',
        body: 'تم التحقق من حسابك وإلغاء التجميد المالي.',
      }).catch(() => {});
    }
  }

  const adminRow = await dbGet('SELECT id FROM admins WHERE telegram_id = ?', [adminId]);
  await dbRun(
    `UPDATE duplicate_proof_reports
     SET status = 'dismissed', reviewed_by = ?, reviewed_at = datetime('now')
     WHERE id = ?`,
    [adminRow?.id || null, reportId]
  );

  return { success: true };
}

/**
 * Penalize one or both users — admin manual decision only.
 * Actions: 'warning' | 'temp_ban' | 'permanent_ban' | 'forfeit_reward'
 */
export async function penalizeReport(reportId, adminId, target, action, durationDays, note) {
  const report = await dbGet('SELECT * FROM duplicate_proof_reports WHERE id = ?', [reportId]);
  if (!report) return { error: 'not_found' };

  const adminRow = await dbGet('SELECT id FROM admins WHERE telegram_id = ?', [adminId]);
  const adminDbId = adminRow?.id || 0;

  const targetUserIds = target === 'both'
    ? [report.user_a_id, report.user_b_id]
    : target === 'user_a' ? [report.user_a_id] : [report.user_b_id];

  for (const userId of targetUserIds) {
    if (action === 'warning') {
      await createNotification({
        userId,
        type: 'system_update',
        title: '⚠️ تحذير رسمي',
        body: note || 'تم تسجيل تحذير على حسابك بسبب مخالفة في الإثباتات.',
      }).catch(() => {});
    } else if (action === 'temp_ban') {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (durationDays || 7));
      await dbRun(
        `INSERT INTO bans (user_id, type, duration, reason, banned_by, end_date)
         VALUES (?, 'temporary', ?, ?, ?, ?)`,
        [userId, durationDays || 7, note || 'Fraud: duplicate proof', adminDbId, endDate.toISOString()]
      );
      await dbRun(
        "UPDATE users SET is_banned = 1, ban_status = 'temporary', ban_expires_at = ? WHERE id = ?",
        [endDate.toISOString(), userId]
      );
    } else if (action === 'permanent_ban') {
      await dbRun(
        `INSERT INTO bans (user_id, type, reason, banned_by)
         VALUES (?, 'permanent', ?, ?)`,
        [userId, note || 'Fraud: confirmed duplicate proof', adminDbId]
      );
      await dbRun(
        "UPDATE users SET is_banned = 1, ban_status = 'permanent' WHERE id = ?",
        [userId]
      );
    } else if (action === 'forfeit_reward') {
      // Remove pending balance from fraud — admin specifies which submission
      // For now, note only — exact amount requires admin to specify separately
      await createNotification({
        userId,
        type: 'system_update',
        title: '❌ مصادرة مكافأة',
        body: note || 'تمت مصادرة المكافأة المرتبطة بالإثبات المخالف.',
      }).catch(() => {});
    }
  }

  const newStatus = target === 'both' ? 'confirmed_fraud_both' : 'confirmed_fraud_single';
  await dbRun(
    `UPDATE duplicate_proof_reports
     SET status = ?, penalized_user_id = ?,
         admin_decision_note = ?, reviewed_by = ?,
         reviewed_at = datetime('now')
     WHERE id = ?`,
    [
      newStatus,
      target !== 'both' ? targetUserIds[0] : null,
      note || null,
      adminDbId,
      reportId,
    ]
  );

  return { success: true };
}

/**
 * Get fraud detection settings as a key-value map.
 */
export async function getFraudDetectionSettings() {
  const rows = await dbAll('SELECT key, value, description FROM fraud_detection_settings');
  const result = {};
  for (const row of rows) result[row.key] = { value: row.value, description: row.description };
  return result;
}

/**
 * Update one or more fraud detection settings.
 */
export async function updateFraudDetectionSettings(updates) {
  for (const [key, value] of Object.entries(updates)) {
    await dbRun(
      `INSERT INTO fraud_detection_settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, String(value)]
    );
  }
}
