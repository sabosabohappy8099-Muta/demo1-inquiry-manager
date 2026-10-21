/**
 * Notifier.js
 * 担当者へのメール通知。
 */

/**
 * 新しい問い合わせを担当者全員にメールで通知する。
 * 「設定」シートの NOTIFY_ENABLED が OFF の場合は送らない。
 * @param {Object} inquiry 問い合わせ(FormHandler.js の processInquiry_ が作るもの)
 * @return {boolean} 送信した場合 true
 */
function notifyNewInquiry_(inquiry) {
  if (getSetting_('NOTIFY_ENABLED', 'ON').toUpperCase() !== 'ON') {
    writeLog_('メール通知', 'スキップ', '通知がOFFのため送信しませんでした(' + inquiry.id + ')。');
    return false;
  }

  const recipients = getStaffEmails_();
  if (recipients.length === 0) {
    writeLog_('メール通知', '警告', '担当者のメールアドレスが登録されていません(' + inquiry.id + ')。');
    return false;
  }

  const subject = buildNotifySubject_(inquiry);
  const body = buildNotifyBody_(inquiry);
  sendNotifyMail_(recipients.join(','), subject, body);
  return true;
}

/**
 * 担当者への通知メールを送る。公開デモでは送らずに「送信記録(デモ)」シートに残す。
 */
function sendNotifyMail_(to, subject, body) {
  if (PUBLIC_DEMO_MODE) {
    recordDemoMail_('担当者への通知', to, subject, body);
    return;
  }
  GmailApp.sendEmail(to, subject, body, { name: getSetting_('COMPANY_NAME') + ' ' + APP_NAME });
}

/**
 * お客様への返信を Gmail の下書きに保存する。公開デモでは保存せずに「送信記録(デモ)」シートに残す。
 */
function createCustomerDraft_(to, subject, body) {
  if (PUBLIC_DEMO_MODE) {
    recordDemoMail_('返信の下書き', to, subject, body);
    return;
  }
  GmailApp.createDraft(to, subject, body, { name: getSetting_('COMPANY_NAME') });
}

/**
 * 件名を作る。緊急度「高」は先頭に【至急】を付ける。
 * 例:【至急】[緊急度:高/見積依頼] 新しいお問い合わせ INQ-0041 佐倉 一郎 様
 */
function buildNotifySubject_(inquiry) {
  const prefix = inquiry.urgency === URGENCY.HIGH ? '【至急】' : '';
  return prefix + '[緊急度:' + inquiry.urgency + '/' + inquiry.category + '] '
    + '新しいお問い合わせ ' + inquiry.id + ' ' + inquiry.name + ' 様';
}

/** 本文を作る */
function buildNotifyBody_(inquiry) {
  return [
    '新しいお問い合わせが届きました。',
    'タスク一覧を開き、「対応する」を押してから対応を始めてください。',
    '',
    '■ 問い合わせID:' + inquiry.id,
    '■ 受付日時  :' + formatDateTime_(inquiry.receivedAt),
    '■ 種別    :' + inquiry.category,
    '■ 緊急度   :' + inquiry.urgency,
    '■ AI要約   :' + inquiry.summary,
    '',
    '■ お客様情報',
    '氏名:' + inquiry.name,
    'メール:' + inquiry.email,
    '電話:' + (inquiry.phone || '(未入力)'),
    '',
    '■ お問い合わせ内容',
    inquiry.body,
    '',
    '――――――――――――――',
    'タスク一覧:' + getTaskListUrl_(),
    '(このメールは ' + APP_NAME + ' から自動送信されています)',
  ].join('\n');
}

/**
 * 担当者シートのメールアドレス一覧(重複を除く)を返す。
 * @return {string[]}
 */
function getStaffEmails_() {
  const sheet = getSheet_(SHEET_NAMES.STAFF);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const emails = sheet.getRange(2, STAFF_COLS.EMAIL, lastRow - 1, 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (email) { return email; });
  return emails.filter(function (email, i) { return emails.indexOf(email) === i; });
}

/**
 * タスク一覧のURLを返す。Webアプリが未デプロイの場合はスプレッドシートのURL。
 * @return {string}
 */
function getTaskListUrl_() {
  try {
    const url = ScriptApp.getService().getUrl();
    if (url) return url;
  } catch (e) {
    // 未デプロイの場合は下のスプレッドシートURLを使う
  }
  return getSpreadsheet_().getUrl();
}
