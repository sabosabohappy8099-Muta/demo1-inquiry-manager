/**
 * PublicDemo.js
 * 公開デモ(ログインなしで誰でも触れる版)のための処理。PUBLIC_DEMO_MODE が true の版でだけ使う。
 *
 * 公開デモでは、知らない人が画面を操作するため、次のようにしている
 * - メール通知と Gmail の下書きは、実際には行わず「送信記録(デモ)」シートに残す(recordDemoMail_)
 * - AI は MOCK に固定する(Config.js の getAiProvider_)
 * - 毎晩4時にデータを最初の状態に戻す(resetPublicDemo)
 * - 使える権限を public/appsscript.json で最小限にしている
 */

/** 送信記録のシート名 */
const DEMO_MAIL_SHEET_NAME = '送信記録(デモ)';
const DEMO_MAIL_HEADERS = ['日時', '種類', '宛先', '件名', '本文'];

/** 公開デモの担当者の通知先(架空) */
const DEMO_STAFF_EMAIL = 'staff@example.com';

/** フォームの回答用URLを保存するキー */
const PUBLIC_FORM_URL_KEY = 'PUBLIC_FORM_URL';

/** 毎晩リセットする時刻(時) */
const PUBLIC_RESET_HOUR = 4;

/**
 * 公開デモの初期セットアップ。GASエディタから1回実行する。
 * シート・フォームを作り、ダミーデータを入れ、毎晩のリセットを登録する。
 */
function setupPublicDemo() {
  assertPublicDemo_();
  runWithLog_('setupPublicDemo', function () {
    setupInternal_();
    const form = FormApp.openById(getProp_(PROP_KEYS.FORM_ID));
    PropertiesService.getScriptProperties().setProperty(PUBLIC_FORM_URL_KEY, form.getPublishedUrl());
    resetPublicDemoInternal_();
    setupPublicResetTrigger_();
    console.log('公開デモの準備ができました。フォーム(回答用): ' + form.getPublishedUrl());
  });
}

/**
 * 公開デモのデータを最初の状態に戻す(毎晩のトリガーから呼ばれる)。
 * 画面から呼ばれても、デモのシートが最初の状態に戻るだけ。
 */
function resetPublicDemo() {
  assertPublicDemo_();
  runWithLog_('resetPublicDemo', resetPublicDemoInternal_);
}

/** resetPublicDemo() の本体 */
function resetPublicDemoInternal_() {
  // 問い合わせはフォームから届いたものも含めてすべて消し、ダミーデータを作り直す(日付は今日を基準に新しくなる)
  clearSheetBody_(getSheet_(SHEET_NAMES.INQUIRIES));
  PropertiesService.getScriptProperties().deleteProperty(PROP_KEYS.DUMMY_IDS);
  generateDummyDataInternal_();

  // 担当者の通知先は架空のアドレスにそろえる
  const staff = getSheet_(SHEET_NAMES.STAFF);
  if (staff.getLastRow() >= 2) {
    staff.getRange(2, STAFF_COLS.EMAIL, staff.getLastRow() - 1, 1).setValue(DEMO_STAFF_EMAIL);
  }

  clearSheetBody_(getDemoMailSheet_());
  clearSheetBody_(getSheet_(SHEET_NAMES.LOGS));
}

/** 毎晩のリセットのトリガーを登録する(作り直して重複を防ぐ) */
function setupPublicResetTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'resetPublicDemo') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('resetPublicDemo').timeBased().everyDays(1).atHour(PUBLIC_RESET_HOUR).create();
}

/**
 * メールを送る代わりに「送信記録(デモ)」シートに残す。
 * @param {string} kind 種類(担当者への通知 / 返信の下書き)
 * @param {string} to 宛先
 * @param {string} subject 件名
 * @param {string} body 本文
 */
function recordDemoMail_(kind, to, subject, body) {
  getDemoMailSheet_().appendRow([formatDateTime_(new Date()), kind, to, subject, body]);
}

/**
 * 画面に出す公開デモの案内。公開デモでなければ null。
 * @return {?{formUrl: string, resetHour: number}}
 */
function getPublicDemoInfo_() {
  if (!PUBLIC_DEMO_MODE) return null;
  return { formUrl: getProp_(PUBLIC_FORM_URL_KEY) || '', resetHour: PUBLIC_RESET_HOUR };
}

/** 送信記録のシート(なければ作る) */
function getDemoMailSheet_() {
  const ss = getSpreadsheet_();
  return ss.getSheetByName(DEMO_MAIL_SHEET_NAME)
    || setupSimpleSheet_(ss, DEMO_MAIL_SHEET_NAME, DEMO_MAIL_HEADERS, [150, 140, 200, 360, 500]);
}

/** 見出し行を残して、シートの中身を消す */
function clearSheetBody_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
}

/** 公開デモの版でなければ止める(手元の版で、うっかりデータを消さないため) */
function assertPublicDemo_() {
  if (!PUBLIC_DEMO_MODE) {
    throw new Error('この関数は公開デモの版でだけ使えます(bin/build-public.sh で組み立てた版)。');
  }
}
