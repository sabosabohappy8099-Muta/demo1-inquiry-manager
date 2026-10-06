/**
 * FormHandler.js
 * フォーム送信時の処理。
 * 回答の転記 → AI判定 → 「問い合わせ」シートへ登録 → 担当者へメール通知 → ログ記録
 */

/**
 * フォーム送信時トリガーから呼ばれる関数(setup() で登録済み)。
 * @param {GoogleAppsScript.Events.FormsOnFormSubmit} e
 */
function onInquiryFormSubmit(e) {
  try {
    const answers = {};
    e.response.getItemResponses().forEach(function (itemResponse) {
      answers[itemResponse.getItem().getTitle()] = String(itemResponse.getResponse() || '').trim();
    });
    processInquiry_({
      receivedAt: e.response.getTimestamp(),
      name: answers[FORM_ITEMS.NAME] || '',
      email: answers[FORM_ITEMS.EMAIL] || '',
      phone: answers[FORM_ITEMS.PHONE] || '',
      body: answers[FORM_ITEMS.BODY] || '',
    });
  } catch (err) {
    writeLog_('フォーム受付', '失敗', String(err && err.stack || err));
    throw err; // トリガーの失敗としてGoogleからも通知されるようにする
  }
}

/**
 * 問い合わせを1件登録する(フォーム送信時・テスト実行時の共通処理)。
 * @param {{receivedAt: Date, name: string, email: string, phone: string, body: string}} input
 * @return {Object} 登録した問い合わせ
 */
function processInquiry_(input) {
  // 1. AI判定(時間がかかる可能性があるため、排他制御の外で行う)
  const result = classifyInquiry(input.body);

  // 2. 採番とシートへの書き込み(同時送信でIDが重複しないよう排他制御する)
  const sheet = getSheet_(SHEET_NAMES.INQUIRIES);
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_TIMEOUT_MS);
  let inquiry;
  try {
    inquiry = {
      id: formatInquiryId_(getNextInquiryNumber_(sheet)),
      receivedAt: input.receivedAt || new Date(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      body: input.body,
      category: result.category,
      urgency: result.urgency,
      summary: result.summary,
      status: STATUS.OPEN,
      mode: result.mode,
    };
    const row = new Array(INQUIRY_HEADERS.length).fill('');
    row[INQUIRY_COLS.ID - 1] = inquiry.id;
    row[INQUIRY_COLS.RECEIVED_AT - 1] = inquiry.receivedAt;
    row[INQUIRY_COLS.NAME - 1] = sanitizeCell_(inquiry.name);
    row[INQUIRY_COLS.EMAIL - 1] = sanitizeCell_(inquiry.email);
    row[INQUIRY_COLS.PHONE - 1] = inquiry.phone;
    row[INQUIRY_COLS.BODY - 1] = sanitizeCell_(inquiry.body);
    row[INQUIRY_COLS.CATEGORY - 1] = inquiry.category;
    row[INQUIRY_COLS.URGENCY - 1] = inquiry.urgency;
    row[INQUIRY_COLS.SUMMARY - 1] = sanitizeCell_(inquiry.summary);
    row[INQUIRY_COLS.STATUS - 1] = inquiry.status;
    row[INQUIRY_COLS.AI_MODE - 1] = inquiry.mode;

    const newRow = sheet.getLastRow() + 1;
    // 電話番号の先頭の0が消えないよう、文字列(書式なしテキスト)として書き込む
    // ※ その他のお客様の入力は sanitizeCell_ で数式として実行されないようにしている
    sheet.getRange(newRow, INQUIRY_COLS.PHONE).setNumberFormat('@');
    sheet.getRange(newRow, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  const detail = inquiry.id + ' 種別=' + inquiry.category + ' 緊急度=' + inquiry.urgency + ' 判定=' + inquiry.mode;
  writeLog_('フォーム受付', '成功', detail);

  // 3. メール通知(失敗しても登録は完了しているので、ログに残して処理を続ける)
  try {
    if (notifyNewInquiry_(inquiry)) {
      writeLog_('メール通知', '成功', inquiry.id);
    }
  } catch (err) {
    writeLog_('メール通知', '失敗', inquiry.id + ': ' + err);
  }

  return inquiry;
}

/**
 * 動作確認用:フォームを使わずに、架空の問い合わせを1件登録する。
 * GASエディタから実行すると、Gmail送信の権限承認もあわせて行える。
 */
function testFormSubmit() {
  const inquiry = processInquiry_({
    receivedAt: new Date(),
    name: 'テスト 太郎',
    email: 'test.taro@example.com',
    phone: '090-0000-1234',
    body: '2階のトイレの床から水漏れしています。至急見に来ていただけますか。修理の費用も知りたいです。',
  });
  console.log('テスト登録しました: ' + JSON.stringify(inquiry));
}
