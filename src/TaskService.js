/**
 * TaskService.js
 * タスク(問い合わせ)の取得・担当確定・ステータス更新。
 * 書き込みはすべて LockService で排他制御し、同時操作による重複対応を防ぐ。
 */

/**
 * 画面に表示するためのエラー(この例外のメッセージはそのまま画面に出す)。
 */
class AppError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * すべての問い合わせを取得する。
 * 日時は画面に渡せるよう、ミリ秒の数値に変換する。
 * @return {Object[]}
 */
function getAllTasks_() {
  const sheet = getSheet_(SHEET_NAMES.INQUIRIES);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, INQUIRY_HEADERS.length).getValues()
    .filter(function (row) { return row[INQUIRY_COLS.ID - 1]; })
    .map(rowToTask_);
}

/**
 * 担当者名の一覧を取得する。
 * @return {string[]}
 */
function getStaffNames_() {
  const sheet = getSheet_(SHEET_NAMES.STAFF);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, STAFF_COLS.NAME, lastRow - 1, 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (name) { return name; });
}

/**
 * 「対応する」:担当を確定する。
 * すでに他の人が担当している場合はエラーにする。
 * @param {string} id 問い合わせID
 * @param {string} staffName 操作した担当者
 * @return {{message: string}}
 */
function claimTask_(id, staffName) {
  validateStaff_(staffName);
  return withLock_(function () {
    const found = findTaskRow_(id);
    const task = found.task;
    if (task.status === STATUS.DONE) {
      throw new AppError(id + ' は既に完了しています。');
    }
    if (task.status === STATUS.IN_PROGRESS) {
      if (task.assignee === staffName) {
        return { message: id + ' は既にあなたが担当しています。' };
      }
      writeLog_('担当確定', '重複防止', id + ' ' + staffName + ' → 既に ' + task.assignee + ' が担当');
      throw new AppError(task.assignee + 'さんが対応中です。');
    }
    setTaskFields_(found.rowIndex, {
      STATUS: STATUS.IN_PROGRESS,
      ASSIGNEE: staffName,
      ASSIGNED_AT: new Date(),
    });
    writeLog_('担当確定', '成功', id + ' ' + staffName);
    return { message: id + ' の担当になりました。' };
  });
}

/**
 * 「担当を外す」:未対応に戻す(担当者本人のみ)。
 * @param {string} id
 * @param {string} staffName
 * @return {{message: string}}
 */
function releaseTask_(id, staffName) {
  validateStaff_(staffName);
  return withLock_(function () {
    const found = findTaskRow_(id);
    assertMyTask_(found.task, staffName);
    setTaskFields_(found.rowIndex, {
      STATUS: STATUS.OPEN,
      ASSIGNEE: '',
      ASSIGNED_AT: '',
    });
    writeLog_('担当解除', '成功', id + ' ' + staffName);
    return { message: id + ' を未対応に戻しました。' };
  });
}

/**
 * 「完了にする」:完了日時を記録する(担当者本人のみ)。
 * @param {string} id
 * @param {string} staffName
 * @return {{message: string}}
 */
function completeTask_(id, staffName) {
  validateStaff_(staffName);
  return withLock_(function () {
    const found = findTaskRow_(id);
    assertMyTask_(found.task, staffName);
    setTaskFields_(found.rowIndex, {
      STATUS: STATUS.DONE,
      COMPLETED_AT: new Date(),
    });
    writeLog_('完了', '成功', id + ' ' + staffName);
    return { message: id + ' を完了にしました。おつかれさまでした!' };
  });
}

/**
 * 対応メモを保存する。
 * @param {string} id
 * @param {string} memo
 * @param {string} staffName
 * @return {{message: string}}
 */
function saveMemo_(id, memo, staffName) {
  validateStaff_(staffName);
  assertTextLength_(memo, '対応メモ');
  return withLock_(function () {
    const found = findTaskRow_(id);
    setTaskFields_(found.rowIndex, { MEMO: String(memo || '') });
    writeLog_('メモ保存', '成功', id + ' ' + staffName);
    return { message: '対応メモを保存しました。' };
  });
}

/**
 * 「返信文を作成」:AIで返信下書きを作り、シートにも保存する(担当者本人のみ)。
 * @param {string} id
 * @param {string} staffName
 * @return {{message: string, replyText: string}}
 */
function createReplyDraft_(id, staffName) {
  validateStaff_(staffName);
  const task = findTaskRow_(id).task;
  assertMyTask_(task, staffName);

  // AIの呼び出しは時間がかかる可能性があるため、排他制御の外で行う
  const draft = generateReplyDraft(task, staffName);

  withLock_(function () {
    setTaskFields_(findTaskRow_(id).rowIndex, { REPLY_DRAFT: draft.text });
  });
  writeLog_('返信下書き作成', '成功', id + ' ' + staffName + ' 判定=' + draft.mode);
  return { message: '返信文を作成しました。内容を確認・修正してください。', replyText: draft.text };
}

/**
 * 「Gmailの下書きに保存」:顧客宛のGmail下書きを作成する。自動送信はしない(担当者本人のみ)。
 * @param {string} id
 * @param {string} replyText 画面で編集した返信文
 * @param {string} staffName
 * @return {{message: string}}
 */
function saveGmailDraft_(id, replyText, staffName) {
  validateStaff_(staffName);
  const text = String(replyText || '').trim();
  assertTextLength_(text, '返信文');
  if (!text) {
    throw new AppError('返信文が空です。先に「返信文を作成」を押すか、本文を入力してください。');
  }
  const task = findTaskRow_(id).task;
  assertMyTask_(task, staffName);
  if (!task.email) {
    throw new AppError('お客様のメールアドレスが登録されていません。');
  }

  const companyName = getSetting_('COMPANY_NAME');
  const subject = '【' + companyName + '】お問い合わせの件につきまして(' + id + ')';
  GmailApp.createDraft(task.email, subject, text, { name: companyName });

  withLock_(function () {
    setTaskFields_(findTaskRow_(id).rowIndex, { REPLY_DRAFT: text });
  });
  writeLog_('Gmail下書き保存', '成功', id + ' ' + staffName);
  return { message: 'Gmailの下書きに保存しました。Gmailで内容を確認してから送信してください。' };
}

// ------------------------------------------------------------
// 内部用の関数
// ------------------------------------------------------------

/**
 * スクリプトロックを取得して処理を実行する。
 * @param {Function} fn
 * @return {*} fn の戻り値
 */
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    throw new AppError('ただいま混み合っています。少し待ってからもう一度お試しください。');
  }
  try {
    const result = fn();
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * 問い合わせIDから行を探す(行の位置は変わる可能性があるため、毎回IDで検索する)。
 * @param {string} id
 * @return {{rowIndex: number, task: Object}}
 */
function findTaskRow_(id) {
  const sheet = getSheet_(SHEET_NAMES.INQUIRIES);
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, INQUIRY_HEADERS.length).getValues();
    for (let i = 0; i < values.length; i++) {
      if (values[i][INQUIRY_COLS.ID - 1] === id) {
        return { rowIndex: i + 2, task: rowToTask_(values[i]) };
      }
    }
  }
  throw new AppError('問い合わせ ' + id + ' が見つかりません。画面を更新してください。');
}

/**
 * 指定した列に値を書き込む。
 * @param {number} rowIndex シートの行番号
 * @param {Object<string, *>} fields INQUIRY_COLS のキーと値
 */
function setTaskFields_(rowIndex, fields) {
  const sheet = getSheet_(SHEET_NAMES.INQUIRIES);
  Object.keys(fields).forEach(function (key) {
    sheet.getRange(rowIndex, INQUIRY_COLS[key]).setValue(sanitizeCell_(fields[key]));
  });
}

/** 担当者シートに登録された名前かを確認する */
function validateStaff_(staffName) {
  if (!staffName) {
    throw new AppError('画面上部の「あなたの名前」を選んでください。');
  }
  if (getStaffNames_().indexOf(staffName) === -1) {
    throw new AppError('「' + staffName + '」は担当者に登録されていません。');
  }
}

/** 画面から保存する文章が長すぎないかを確認する */
function assertTextLength_(text, label) {
  if (String(text || '').length > TEXT_MAX_LENGTH) {
    throw new AppError(label + 'が長すぎます(' + TEXT_MAX_LENGTH + '文字まで)。');
  }
}

/** 自分が担当している対応中のタスクかを確認する */
function assertMyTask_(task, staffName) {
  if (task.status !== STATUS.IN_PROGRESS) {
    throw new AppError(task.id + ' は対応中ではありません(現在:' + task.status + ')。');
  }
  if (task.assignee !== staffName) {
    throw new AppError(task.assignee + 'さんが対応中のため、操作できません。');
  }
}

/** シートの1行をタスクのオブジェクトに変換する */
function rowToTask_(row) {
  const get = function (key) { return row[INQUIRY_COLS[key] - 1]; };
  const toMs = function (v) { return v instanceof Date ? v.getTime() : null; };
  return {
    id: String(get('ID')),
    receivedAt: toMs(get('RECEIVED_AT')),
    name: String(get('NAME')),
    email: String(get('EMAIL')),
    phone: String(get('PHONE')),
    body: String(get('BODY')),
    category: String(get('CATEGORY')),
    urgency: String(get('URGENCY')),
    summary: String(get('SUMMARY')),
    status: String(get('STATUS')),
    assignee: String(get('ASSIGNEE')),
    assignedAt: toMs(get('ASSIGNED_AT')),
    completedAt: toMs(get('COMPLETED_AT')),
    memo: String(get('MEMO')),
    replyDraft: String(get('REPLY_DRAFT')),
    aiMode: String(get('AI_MODE')),
  };
}
