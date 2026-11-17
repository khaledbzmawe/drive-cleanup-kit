/**
 * Drive Cleanup Kit
 * Audit who can see your Google Drive files, take access back, and clear out duplicates
 * and empty files, from a Google Sheet you own. Nothing leaves your account.
 *
 * MIT licence. See README.md and LICENSE.
 */

function onOpen() {
  try { ensureSettings_(); } catch (e) { /* first open before authorisation */ }
  SpreadsheetApp.getUi()
    .createMenu(t_('menu'))
    .addItem(t_('m_scan'), 'scanSharing')
    .addItem(t_('m_plan'), 'buildSharingPlan')
    .addItem(t_('m_apply'), 'applySharingPlan')
    .addSeparator()
    .addItem(t_('m_find'), 'findCleanupCandidates')
    .addItem(t_('m_trash'), 'trashTickedItems')
    .addSeparator()
    .addItem(t_('m_reset'), 'stopAndReset')
    .addToUi();
}

/** Cancels any background continuation and forgets an unfinished scan. Changes nothing in Drive. */
function stopAndReset() {
  ['continueScan', 'continueApply', 'continueTrash'].forEach(cancelContinue_);
  props_().deleteProperty(SCAN_KEY);
  notify_(t_('reset_done'));
}
