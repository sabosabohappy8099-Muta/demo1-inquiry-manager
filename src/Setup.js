/**
 * Setup.js
 * 初期セットアップ。GASエディタから setup() を1回実行する。
 * 何度実行しても、既にあるシート・フォーム・データは作り直さない。
 */

/** フォームの回答がそのまま入るシートの名前(原本として残す) */
const FORM_RESPONSE_SHEET_NAME = 'フォーム回答(原本)';

/** 架空の担当者(メールアドレスは実行したアカウントのものを自動で設定) */
const DEMO_STAFF = [
  ['日向 太郎', '見積依頼,新規相談'],
  ['森川 花子', 'アフター・不具合'],
  ['青木 健', '工事中の相談'],
  ['小春 美咲', 'クレーム,その他'],
];

/**
 * 初期セットアップを実行する。
 */
function setup() {
  runWithLog_('setup', setupInternal_);
}

/** setup() の本体 */
function setupInternal_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('スプレッドシートに紐付いたスクリプトから実行してください。');
  }
  const props = PropertiesService.getScriptProperties();
  props.setProperty(PROP_KEYS.SPREADSHEET_ID, ss.getId());

  // 1. シートの作成
  setupInquirySheet_(ss);
  setupSimpleSheet_(ss, SHEET_NAMES.STAFF, STAFF_HEADERS, [140, 260, 220]);
  setupSimpleSheet_(ss, SHEET_NAMES.SETTINGS, SETTINGS_HEADERS, [160, 360, 260]);
  setupSimpleSheet_(ss, SHEET_NAMES.LOGS, LOG_HEADERS, [150, 200, 100, 400]);

  // 2. 初期データ
  seedSettings_(ss);
  seedStaff_(ss);

  // 3. フォームとトリガー
  const form = setupForm_(ss);
  setupFormTrigger_(form);

  // 4. 初期状態の空シート(シート1)を削除
  removeDefaultSheet_(ss);

  const message = 'フォームURL(回答用): ' + form.getPublishedUrl() + '\n'
    + 'フォームURL(編集用): ' + form.getEditUrl();
  console.log('セットアップが完了しました。\n' + message);
  writeLog_('setup', '成功', message);
}

/**
 * 「問い合わせ」シートを作成し、見出し・書式・入力規則を設定する。
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function setupInquirySheet_(ss) {
  const sheet = setupSimpleSheet_(ss, SHEET_NAMES.INQUIRIES, INQUIRY_HEADERS, [
    100, 130, 110, 200, 120, 320, 120, 70, 300, 80, 100, 130, 130, 220, 300, 100,
  ]);
  const maxRows = sheet.getMaxRows();

  // 日時列の表示形式
  [INQUIRY_COLS.RECEIVED_AT, INQUIRY_COLS.ASSIGNED_AT, INQUIRY_COLS.COMPLETED_AT].forEach(function (col) {
    sheet.getRange(2, col, maxRows - 1, 1).setNumberFormat(DATETIME_FORMAT);
  });

  // 種別・緊急度・ステータスはプルダウンにする
  const lists = [
    [INQUIRY_COLS.CATEGORY, CATEGORY_LIST],
    [INQUIRY_COLS.URGENCY, Object.values(URGENCY)],
    [INQUIRY_COLS.STATUS, Object.values(STATUS)],
  ];
  lists.forEach(function (item) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(item[1], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, item[0], maxRows - 1, 1).setDataValidation(rule);
  });

  // 緊急度「高」は赤く表示(条件付き書式が未設定のときだけ追加)
  if (sheet.getConditionalFormatRules().length === 0) {
    const urgencyRange = sheet.getRange(2, INQUIRY_COLS.URGENCY, maxRows - 1, 1);
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(URGENCY.HIGH)
      .setFontColor('#c62828')
      .setBold(true)
      .setRanges([urgencyRange])
      .build();
    sheet.setConditionalFormatRules([rule]);
  }

  // 本文・要約・下書きは折り返して表示
  [INQUIRY_COLS.BODY, INQUIRY_COLS.SUMMARY, INQUIRY_COLS.MEMO, INQUIRY_COLS.REPLY_DRAFT].forEach(function (col) {
    sheet.getRange(2, col, maxRows - 1, 1).setWrap(true);
  });
}

/**
 * シートが無ければ作成し、見出し行を設定する。既にある場合は何もしない。
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} name シート名
 * @param {string[]} headers 見出し
 * @param {number[]} widths 列幅(ピクセル)
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function setupSimpleSheet_(ss, name, headers, widths) {
  let sheet = ss.getSheetByName(name);
  if (sheet) {
    console.log('シート「' + name + '」は既にあるため、作成をスキップしました。');
    return sheet;
  }
  sheet = ss.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#f1f3f4');
  sheet.setFrozenRows(1);
  widths.forEach(function (w, i) {
    sheet.setColumnWidth(i + 1, w);
  });
  // 見出しより右の余分な列を削除して見やすくする
  const extraCols = sheet.getMaxColumns() - headers.length;
  if (extraCols > 0) sheet.deleteColumns(headers.length + 1, extraCols);
  console.log('シート「' + name + '」を作成しました。');
  return sheet;
}

/**
 * 「設定」シートに初期値を登録する(未登録のキーだけ追加)。
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function seedSettings_(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  const lastRow = sheet.getLastRow();
  const existingKeys = lastRow < 2 ? [] :
    sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function (r) { return r[0]; });
  const rows = DEFAULT_SETTINGS.filter(function (row) {
    return existingKeys.indexOf(row[0]) === -1;
  });
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

/**
 * 「担当者」シートに架空の担当者を登録する(担当者が1人もいない場合のみ)。
 * 通知先は、デモ用に setup() を実行したアカウントのメールアドレスを全員に設定する。
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function seedStaff_(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.STAFF);
  if (sheet.getLastRow() >= 2) {
    console.log('担当者は既に登録済みのため、追加をスキップしました。');
    return;
  }
  const myEmail = Session.getEffectiveUser().getEmail();
  const rows = DEMO_STAFF.map(function (s) {
    return [s[0], myEmail, s[1]];
  });
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

/**
 * 問い合わせフォームを作成し、回答先をこのスプレッドシートに設定する。
 * 既に作成済み(FORM_ID が保存済みで開ける)の場合はそれを返す。
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {GoogleAppsScript.Forms.Form}
 */
function setupForm_(ss) {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty(PROP_KEYS.FORM_ID);
  if (savedId) {
    try {
      const existing = FormApp.openById(savedId);
      console.log('フォームは作成済みのため、既存のフォームを使います。');
      return existing;
    } catch (e) {
      console.warn('保存済みのフォームが開けないため、新しく作成します: ' + e);
    }
  }

  const companyName = getSetting_('COMPANY_NAME');
  const form = FormApp.create(companyName + ' お問い合わせフォーム');
  form.setDescription(
    'リフォームに関するご相談・お見積りのご依頼など、お気軽にお問い合わせください。\n'
    + '担当者より順次ご連絡いたします。\n\n'
    + '※ このフォームはポートフォリオ用のデモです(架空の会社です)。'
  );
  form.setConfirmationMessage('お問い合わせありがとうございます。担当者より折り返しご連絡いたします。');

  form.addTextItem().setTitle(FORM_ITEMS.NAME).setRequired(true);
  form.addTextItem()
    .setTitle(FORM_ITEMS.EMAIL)
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .requireTextIsEmail()
      .setHelpText('メールアドレスの形式で入力してください。')
      .build());
  form.addTextItem().setTitle(FORM_ITEMS.PHONE).setHelpText('日中にご連絡のつく番号(任意)');
  form.addParagraphTextItem().setTitle(FORM_ITEMS.BODY).setRequired(true);

  // 回答先をこのスプレッドシートに設定(回答はシート「フォーム回答(原本)」にも残る)
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  props.setProperty(PROP_KEYS.FORM_ID, form.getId());
  renameFormResponseSheet_(ss, form);

  console.log('フォームを作成しました。');
  return form;
}

/**
 * フォームの回答先として自動作成されたシートの名前を分かりやすく変更する。
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {GoogleAppsScript.Forms.Form} form
 */
function renameFormResponseSheet_(ss, form) {
  SpreadsheetApp.flush();
  const formId = form.getId();
  const target = ss.getSheets().find(function (sheet) {
    const url = sheet.getFormUrl();
    return url && url.indexOf(formId) !== -1;
  });
  if (target && !ss.getSheetByName(FORM_RESPONSE_SHEET_NAME)) {
    target.setName(FORM_RESPONSE_SHEET_NAME);
  }
}

/**
 * フォーム送信時トリガーを登録する(同じ関数のトリガーは作り直して重複を防ぐ)。
 * @param {GoogleAppsScript.Forms.Form} form
 */
function setupFormTrigger_(form) {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === FORM_SUBMIT_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger(FORM_SUBMIT_HANDLER).forForm(form).onFormSubmit().create();
  console.log('フォーム送信時トリガーを登録しました(' + FORM_SUBMIT_HANDLER + ')。');
}

/**
 * 新規スプレッドシートに最初からある空のシートを削除する。
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function removeDefaultSheet_(ss) {
  ['シート1', 'Sheet1'].forEach(function (name) {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet);
    }
  });
}

