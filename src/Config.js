/**
 * Config.js
 * 定数・シート名・列定義など、プロジェクト全体で使う設定をまとめたファイル。
 * ※ APIキーなどの秘密情報はここに書かず、スクリプトプロパティに保存すること。
 */

/** アプリ名(画面・メールで表示) */
const APP_NAME = '問い合わせ管理ツール';

/** シート名 */
const SHEET_NAMES = {
  INQUIRIES: '問い合わせ',
  STAFF: '担当者',
  SETTINGS: '設定',
  LOGS: 'ログ',
};

/**
 * 「問い合わせ」シートの列定義(1始まりの列番号)
 * 列を追加・変更する場合はここと INQUIRY_HEADERS をあわせて修正する。
 */
const INQUIRY_COLS = {
  ID: 1,            // A 問い合わせID
  RECEIVED_AT: 2,   // B 受付日時
  NAME: 3,          // C 氏名
  EMAIL: 4,         // D メールアドレス
  PHONE: 5,         // E 電話番号
  BODY: 6,          // F 問い合わせ内容
  CATEGORY: 7,      // G 種別
  URGENCY: 8,       // H 緊急度
  SUMMARY: 9,       // I AI要約
  STATUS: 10,       // J ステータス
  ASSIGNEE: 11,     // K 担当者
  ASSIGNED_AT: 12,  // L 担当確定日時
  COMPLETED_AT: 13, // M 完了日時
  MEMO: 14,         // N 対応メモ
  REPLY_DRAFT: 15,  // O 返信下書き
  AI_MODE: 16,      // P AI判定モード
};

/** 「問い合わせ」シートの見出し行 */
const INQUIRY_HEADERS = [
  '問い合わせID', '受付日時', '氏名', 'メールアドレス', '電話番号',
  '問い合わせ内容', '種別', '緊急度', 'AI要約', 'ステータス',
  '担当者', '担当確定日時', '完了日時', '対応メモ', '返信下書き', 'AI判定モード',
];

/** 「担当者」シートの列定義 */
const STAFF_COLS = {
  NAME: 1,      // A 担当者名
  EMAIL: 2,     // B メールアドレス(通知先)
  SPECIALTY: 3, // C 得意な種別(カンマ区切り)
};
const STAFF_HEADERS = ['担当者名', 'メールアドレス', '得意な種別'];

/** 「設定」シート(A列:キー、B列:値、C列:説明) */
const SETTINGS_HEADERS = ['キー', '値', '説明'];

/** 「ログ」シート */
const LOG_HEADERS = ['日時', '処理名', '結果', 'エラー内容'];

/** 問い合わせIDの形式(INQ-0001) */
const INQUIRY_ID_PREFIX = 'INQ-';
const INQUIRY_ID_DIGITS = 4;

/** 種別 */
const CATEGORIES = {
  NEW: '新規相談',
  ESTIMATE: '見積依頼',
  IN_PROGRESS: '工事中の相談',
  AFTER: 'アフター・不具合',
  CLAIM: 'クレーム',
  OTHER: 'その他',
};
const CATEGORY_LIST = Object.values(CATEGORIES);

/** 緊急度(並び替え用に優先度の数値も持つ。小さいほど優先) */
const URGENCY = {
  HIGH: '高',
  MID: '中',
  LOW: '低',
};
const URGENCY_ORDER = { '高': 0, '中': 1, '低': 2 };

/** ステータス */
const STATUS = {
  OPEN: '未対応',
  IN_PROGRESS: '対応中',
  DONE: '完了',
};

/** AIモード */
const AI_PROVIDERS = {
  MOCK: 'MOCK',
  CLAUDE: 'CLAUDE',
  GEMINI: 'GEMINI',
};

/** スクリプトプロパティのキー名(値はGASエディタの「プロジェクトの設定」で登録) */
const PROP_KEYS = {
  AI_PROVIDER: 'AI_PROVIDER',             // MOCK / CLAUDE / GEMINI(未設定時は MOCK)
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY', // Anthropic API キー
  GEMINI_API_KEY: 'GEMINI_API_KEY',       // Gemini API キー
  SPREADSHEET_ID: 'SPREADSHEET_ID',       // setup() 実行時に自動保存
  FORM_ID: 'FORM_ID',                     // setup() 実行時に自動保存
  DUMMY_IDS: 'DUMMY_IDS',                 // generateDummyData() で作ったIDの一覧(削除用)
  CLAUDE_MODEL: 'CLAUDE_MODEL',           // 任意:Claude のモデル名(未設定時は AiService.js の既定値)
  GEMINI_MODEL: 'GEMINI_MODEL',           // 任意:Gemini のモデル名(未設定時は AiService.js の既定値)
};

/** フォームの質問項目(フォーム作成と回答の読み取りで共通して使う) */
const FORM_ITEMS = {
  NAME: '氏名',
  EMAIL: 'メールアドレス',
  PHONE: '電話番号',
  BODY: 'お問い合わせ内容',
};

/** フォーム送信時に呼ばれる関数名(FormHandler.js で定義) */
const FORM_SUBMIT_HANDLER = 'onInquiryFormSubmit';

/** 「設定」シートの初期値 */
const DEFAULT_SETTINGS = [
  ['COMPANY_NAME', 'ひだまりリフォーム株式会社', '会社名(画面・メールに表示)'],
  ['SIGNATURE', 'ひだまりリフォーム株式会社\nお客様窓口\nTEL: 000-0000-0000(架空)', '返信メールの署名'],
  ['NOTIFY_ENABLED', 'ON', '担当者へのメール通知(ON / OFF)'],
];

/** Webアプリの自動更新間隔(ミリ秒) */
const AUTO_REFRESH_MS = 30 * 1000;

/** 排他制御(LockService)の待ち時間(ミリ秒) */
const LOCK_TIMEOUT_MS = 10 * 1000;

/** ログシートの最大行数(超えたら古い行から LOG_TRIM_ROWS 行ずつ削除) */
const LOG_MAX_ROWS = 2000;
const LOG_TRIM_ROWS = 200;
const LOG_MESSAGE_MAX_LENGTH = 2000;

/** 画面から保存できる文章の最大文字数(セルの上限は5万文字) */
const TEXT_MAX_LENGTH = 10000;

/** 日時の表示形式 */
const DATETIME_FORMAT = 'yyyy/MM/dd HH:mm';

// ------------------------------------------------------------
// 共通ヘルパー
// ------------------------------------------------------------

/**
 * スクリプトプロパティの値を取得する。
 * @param {string} key
 * @return {string|null}
 */
function getProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * 現在のAIモードを取得する(未設定・不正値の場合は MOCK)。
 * @return {string}
 */
function getAiProvider_() {
  // 公開デモでは API を使わない(費用がかからず、外部への通信の権限も持たせない)
  if (PUBLIC_DEMO_MODE) return AI_PROVIDERS.MOCK;
  const value = String(getProp_(PROP_KEYS.AI_PROVIDER) || '').trim().toUpperCase();
  return AI_PROVIDERS[value] || AI_PROVIDERS.MOCK;
}

/**
 * 対象のスプレッドシートを取得する。
 * トリガーやWebアプリからも確実に開けるよう、保存済みのIDを優先する。
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet_() {
  // 公開デモは「このスクリプトが付いているスプレッドシート」しか開けない権限で動かす
  if (PUBLIC_DEMO_MODE) return SpreadsheetApp.getActiveSpreadsheet();
  const id = getProp_(PROP_KEYS.SPREADSHEET_ID);
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * シート名からシートを取得する。
 * @param {string} name SHEET_NAMES の値
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) {
    throw new Error('シート「' + name + '」が見つかりません。先に setup() を実行してください。');
  }
  return sheet;
}

/**
 * 数値から問い合わせIDを作る(例:1 → INQ-0001)。
 * @param {number} num
 * @return {string}
 */
function formatInquiryId_(num) {
  return INQUIRY_ID_PREFIX + String(num).padStart(INQUIRY_ID_DIGITS, '0');
}

/**
 * 「設定」シートから値を取得する。
 * @param {string} key DEFAULT_SETTINGS のキー
 * @param {string=} defaultValue 見つからない場合の値
 * @return {string}
 */
function getSetting_(key, defaultValue) {
  const sheet = getSpreadsheet_().getSheetByName(SHEET_NAMES.SETTINGS);
  if (sheet) {
    const row = sheet.getDataRange().getValues().find(function (r) { return r[0] === key; });
    if (row && row[1] !== '') return String(row[1]);
  }
  if (defaultValue !== undefined) return defaultValue;
  const def = DEFAULT_SETTINGS.find(function (r) { return r[0] === key; });
  return def ? def[1] : '';
}

/**
 * 「問い合わせ」シートの次の番号を返す(既存IDの最大値 + 1)。
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @return {number}
 */
function getNextInquiryNumber_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  const ids = sheet.getRange(2, INQUIRY_COLS.ID, lastRow - 1, 1).getValues();
  let max = 0;
  ids.forEach(function (row) {
    const num = parseInt(String(row[0]).replace(INQUIRY_ID_PREFIX, ''), 10);
    if (!isNaN(num) && num > max) max = num;
  });
  return max + 1;
}

/**
 * 「ログ」シートに1行記録する。ログの書き込み自体の失敗で処理を止めないようにする。
 * @param {string} processName 処理名
 * @param {string} result 結果(成功 / 失敗 / 警告 など)
 * @param {string=} errorMessage エラー内容
 */
function writeLog_(processName, result, errorMessage) {
  const message = String(errorMessage || '').slice(0, LOG_MESSAGE_MAX_LENGTH);
  // 実行ログ(GASエディタの「実行数」)にも残す
  if (result === '失敗') {
    console.error(processName + ' / ' + result + ' / ' + message);
  } else {
    console.log(processName + ' / ' + result + ' / ' + message);
  }
  try {
    const sheet = getSpreadsheet_().getSheetByName(SHEET_NAMES.LOGS);
    if (!sheet) return;
    sheet.appendRow([new Date(), processName, result, sanitizeCell_(message)]);
    // 古いログを削除して、シートが大きくなりすぎないようにする
    const dataRows = sheet.getLastRow() - 1;
    if (dataRows > LOG_MAX_ROWS) {
      sheet.deleteRows(2, dataRows - LOG_MAX_ROWS + LOG_TRIM_ROWS);
    }
  } catch (e) {
    console.error('ログの書き込みに失敗しました: ' + e);
  }
}

/**
 * 処理を実行し、失敗した場合はログシートに記録してから例外を投げ直す。
 * GASエディタから手動で実行する関数(setup など)で使う。
 * @param {string} processName
 * @param {Function} fn
 * @return {*}
 */
function runWithLog_(processName, fn) {
  try {
    return fn();
  } catch (err) {
    writeLog_(processName, '失敗', String(err && err.stack || err));
    throw err;
  }
}

/**
 * お客様の入力などをセルに書き込む前に、数式として実行されないようにする。
 * 「=」「+」「-」「@」で始まる文字列は先頭に ' を付けて文字列として扱わせる
 * (' はセルの表示や getValues() の値には含まれない)。
 * @param {*} value
 * @return {*}
 */
function sanitizeCell_(value) {
  if (typeof value !== 'string') return value;
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

/**
 * 日時を表示用の文字列にする。
 * @param {Date} date
 * @return {string}
 */
function formatDateTime_(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), DATETIME_FORMAT);
}
