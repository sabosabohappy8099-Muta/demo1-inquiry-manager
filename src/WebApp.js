/**
 * WebApp.js
 * Webアプリの入口(doGet)と、画面から google.script.run で呼ばれる関数。
 * 画面から呼ぶ関数は名前の末尾に _ を付けない(_ 付きは画面から呼べないため)。
 */

/**
 * Webアプリを表示する。
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet() {
  try {
    // 必要なシートがそろっているか先に確認する(未セットアップ時は案内を表示)
    getSheet_(SHEET_NAMES.INQUIRIES);
    getSheet_(SHEET_NAMES.STAFF);
    const template = HtmlService.createTemplateFromFile('index');
    template.companyName = getSetting_('COMPANY_NAME');
    template.appName = APP_NAME;
    return template.evaluate()
      .setTitle(APP_NAME + '|' + template.companyName)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    writeLog_('画面表示', '失敗', String(err && err.stack || err));
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;max-width:560px;margin:48px auto;padding:0 16px;line-height:1.7">'
      + '<h1 style="font-size:20px">' + APP_NAME + ' を表示できませんでした</h1>'
      + '<p>初期セットアップが完了していない可能性があります。管理者の方は、Apps Script エディタで '
      + '<code>setup()</code> を実行してから、もう一度このページを開いてください。</p>'
      + '</div>'
    ).setTitle(APP_NAME).addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
}

/**
 * HTMLファイルを読み込む(index.html から css / js を取り込むために使う)。
 * @param {string} filename
 * @return {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ------------------------------------------------------------
// 画面から呼ばれる関数
// 戻り値はすべて { ok, message, tasks, ... } の形にそろえる
// ------------------------------------------------------------

/** 初期表示用のデータ */
function apiGetInitialData() {
  return respond_('初期表示', function () {
    return {
      staff: getStaffNames_(),
      refreshMs: AUTO_REFRESH_MS,
    };
  });
}

/** タスク一覧を取得する */
function apiGetTasks() {
  return respond_('一覧取得', function () { return {}; });
}

/** 「対応する」 */
function apiClaimTask(id, staffName) {
  return respond_('担当確定', function () { return claimTask_(id, staffName); });
}

/** 「担当を外す」 */
function apiReleaseTask(id, staffName) {
  return respond_('担当解除', function () { return releaseTask_(id, staffName); });
}

/** 「完了にする」 */
function apiCompleteTask(id, staffName) {
  return respond_('完了', function () { return completeTask_(id, staffName); });
}

/** 対応メモの保存 */
function apiSaveMemo(id, memo, staffName) {
  return respond_('メモ保存', function () { return saveMemo_(id, memo, staffName); });
}

/** 「返信文を作成」 */
function apiCreateReplyDraft(id, staffName) {
  return respond_('返信下書き作成', function () { return createReplyDraft_(id, staffName); });
}

/** 「Gmailの下書きに保存」 */
function apiSaveGmailDraft(id, replyText, staffName) {
  return respond_('Gmail下書き保存', function () { return saveGmailDraft_(id, replyText, staffName); });
}

/**
 * 処理を実行し、結果と最新のタスク一覧をまとめて返す。
 * AppError はそのまま画面に表示し、想定外のエラーはログに記録して汎用メッセージを返す。
 * @param {string} processName ログに残す処理名
 * @param {Function} fn
 * @return {Object}
 */
function respond_(processName, fn) {
  let response;
  try {
    response = Object.assign({ ok: true }, fn());
  } catch (err) {
    if (err instanceof AppError) {
      response = { ok: false, message: err.message };
    } else {
      writeLog_(processName, '失敗', String(err && err.stack || err));
      response = { ok: false, message: '処理中にエラーが発生しました。時間をおいてもう一度お試しください。' };
    }
  }
  try {
    response.tasks = getAllTasks_();
  } catch (err) {
    writeLog_(processName + '(一覧取得)', '失敗', String(err && err.stack || err));
    response.tasks = null;
  }
  return response;
}
