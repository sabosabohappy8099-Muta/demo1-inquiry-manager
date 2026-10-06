/**
 * DummyData.js
 * ダッシュボードの見栄え確認用に、架空の問い合わせデータを生成・削除する。
 * 生成したIDはスクリプトプロパティ DUMMY_IDS に保存し、clearDummyData() で一括削除する。
 */

/** 生成する件数と期間 */
const DUMMY_COUNT = 40;
const DUMMY_DAYS = 30;

/** 架空の氏名(漢字・メール用ローマ字) */
const DUMMY_PEOPLE = [
  ['佐倉 一郎', 'sakura.ichiro'], ['宮野 恵子', 'miyano.keiko'], ['石原 拓也', 'ishihara.takuya'],
  ['北村 由美', 'kitamura.yumi'], ['大川 誠', 'okawa.makoto'], ['野田 さくら', 'noda.sakura'],
  ['浜田 浩二', 'hamada.koji'], ['杉山 真理', 'sugiyama.mari'], ['今井 大輔', 'imai.daisuke'],
  ['松岡 理恵', 'matsuoka.rie'], ['内田 修', 'uchida.osamu'], ['川口 千尋', 'kawaguchi.chihiro'],
  ['平野 学', 'hirano.manabu'], ['藤井 香織', 'fujii.kaori'], ['岡本 隆', 'okamoto.takashi'],
  ['吉川 直美', 'yoshikawa.naomi'], ['西田 健一', 'nishida.kenichi'], ['坂本 彩', 'sakamoto.aya'],
  ['村上 俊介', 'murakami.shunsuke'], ['中島 陽子', 'nakajima.yoko'],
];

/**
 * 種別ごとの問い合わせ文と要約のテンプレート。
 * weight は出現しやすさ(ダッシュボードで種別がバラけるように調整)。
 */
const DUMMY_TEMPLATES = [
  // 新規相談
  { category: '新規相談', urgency: '中', weight: 3,
    body: '築25年の戸建てに住んでいます。キッチンが古くなってきたので、システムキッチンへの入れ替えを検討しています。どのような流れで進むのか教えていただけますか。',
    summary: '築25年の戸建てでシステムキッチンへの入れ替えを検討中。進め方を知りたい。' },
  { category: '新規相談', urgency: '低', weight: 3,
    body: '来年あたりに浴室とトイレのリフォームをしたいと考えています。まだ具体的ではないのですが、ショールームの見学などは可能でしょうか。',
    summary: '来年の浴室・トイレのリフォームを検討中。ショールーム見学の可否を確認したい。' },
  { category: '新規相談', urgency: '中', weight: 2,
    body: '親との同居に向けて、和室を洋室に変更し、廊下に手すりを付けたいと考えています。一度相談に乗っていただけますか。',
    summary: '同居に向けて和室の洋室化と手すり設置を相談したい。' },
  // 見積依頼
  { category: '見積依頼', urgency: '中', weight: 4,
    body: '外壁の塗装を検討しています。2階建て、延床30坪ほどです。おおよその費用を知りたいので、お見積りをお願いできますか。',
    summary: '2階建て約30坪の外壁塗装の見積依頼。' },
  { category: '見積依頼', urgency: '低', weight: 3,
    body: 'リビングのフローリングを張り替えたいです。広さは12畳ほどです。費用はいくらくらいになりますか。',
    summary: 'リビング12畳のフローリング張り替え費用を知りたい。' },
  { category: '見積依頼', urgency: '中', weight: 3,
    body: 'ユニットバスの交換を考えています。現地を見ていただいたうえで見積りを出してもらうことは可能でしょうか。平日の午後なら在宅しています。',
    summary: 'ユニットバス交換の現地調査と見積を希望。平日午後なら在宅。' },
  { category: '見積依頼', urgency: '高', weight: 1,
    body: '来月中に工事を終えたいので、至急トイレ2か所の交換の見積りをお願いします。すぐに日程を調整していただけると助かります。',
    summary: '来月中に完了希望。トイレ2か所交換の至急見積依頼。' },
  // 工事中の相談
  { category: '工事中の相談', urgency: '中', weight: 2,
    body: '現在キッチンの工事をしていただいています。工事の進捗と、完了予定日に変更がないか確認したいです。',
    summary: 'キッチン工事中。進捗と完了予定日の確認をしたい。' },
  { category: '工事中の相談', urgency: '低', weight: 2,
    body: '工事中の職人さんの駐車場所について、近所から問い合わせがありました。明日以降の駐車場所を確認させてください。',
    summary: '工事車両の駐車場所について近隣から問い合わせあり。確認したい。' },
  { category: '工事中の相談', urgency: '高', weight: 1,
    body: '工事中の浴室の配管から水漏れしているようです。床が濡れてきているので、すぐに見に来ていただけますか。',
    summary: '工事中の浴室配管から水漏れ。至急訪問を希望。' },
  // アフター・不具合
  { category: 'アフター・不具合', urgency: '中', weight: 2,
    body: '昨年リフォームしていただいた洗面台の扉の開け閉めが固くなってきました。保証の範囲で点検していただけますか。',
    summary: '昨年施工の洗面台の扉が固い。保証での点検を希望。' },
  { category: 'アフター・不具合', urgency: '高', weight: 2,
    body: '先日の大雨で、2階の天井から雨漏りしています。以前屋根の工事をお願いした者です。できるだけ早く見ていただきたいです。',
    summary: '以前屋根工事をした住宅で雨漏り発生。早急な対応を希望。' },
  { category: 'アフター・不具合', urgency: '低', weight: 2,
    body: '施工から1年が経ったので、無料点検の案内を見て連絡しました。都合の良い日程を相談させてください。',
    summary: '施工1年後の無料点検の日程を相談したい。' },
  // クレーム
  { category: 'クレーム', urgency: '高', weight: 1,
    body: '先週の工事で、壁紙の継ぎ目が目立つ仕上がりになっています。説明もなく不満です。対応をお願いします。',
    summary: '壁紙の継ぎ目の仕上がりに不満。説明不足への指摘あり。' },
  { category: 'クレーム', urgency: '高', weight: 1,
    body: '工事の日程が連絡なく2回変更されました。対応が悪いと感じています。今後の進め方について説明してください。',
    summary: '連絡なしの日程変更が2回あり不満。今後の説明を求めている。' },
  // その他
  { category: 'その他', urgency: '低', weight: 2,
    body: '御社のリフォーム事例をホームページで拝見しました。カタログやパンフレットを郵送していただくことはできますか。',
    summary: 'リフォーム事例のカタログ・パンフレットの郵送を希望。' },
  { category: 'その他', urgency: '低', weight: 1,
    body: '自治体のリフォーム補助金について、御社で申請のサポートはしていただけますか。',
    summary: 'リフォーム補助金の申請サポートの有無を確認したい。' },
];

/** 完了済みの対応メモの例 */
const DUMMY_MEMOS = {
  '新規相談': ['電話でヒアリング済み。現地調査の日程を調整中。', 'ショールーム見学の予約を案内した。'],
  '見積依頼': ['現地調査済み。見積書をメールで送付。', '概算費用を電話で案内。正式見積は来週送付予定。'],
  '工事中の相談': ['現場責任者から進捗を共有済み。', '駐車場所を変更し、近隣にもあいさつ済み。'],
  'アフター・不具合': ['点検訪問し、扉の調整で解消。', '屋根の補修を手配。保証対応で完了。'],
  'クレーム': ['訪問して謝罪。補修日程を確定。', '日程管理の手順を見直す旨をお伝えし、了承いただいた。'],
  'その他': ['カタログを郵送済み。', '補助金の概要と申請の流れをメールで案内。'],
};

/**
 * ダミーデータを生成して「問い合わせ」シートに追加する。
 * 既にダミーデータがある場合は、二重に作らないよう中止する。
 */
function generateDummyData() {
  runWithLog_('generateDummyData', generateDummyDataInternal_);
}

/** generateDummyData() の本体 */
function generateDummyDataInternal_() {
  const props = PropertiesService.getScriptProperties();
  if (getDummyIds_().length > 0) {
    throw new Error('ダミーデータは既に作成済みです。作り直す場合は先に clearDummyData() を実行してください。');
  }

  const sheet = getSheet_(SHEET_NAMES.INQUIRIES);
  const staffNames = getStaffNamesForDummy_();
  if (staffNames.length === 0) {
    throw new Error('担当者が登録されていません。先に setup() を実行してください。');
  }

  const now = new Date();
  // 受付日時を先に決め、古い順に並べてから採番する
  const receivedDates = [];
  for (let i = 0; i < DUMMY_COUNT; i++) {
    receivedDates.push(randomPastDate_(now, DUMMY_DAYS));
  }
  receivedDates.sort(function (a, b) { return a - b; });

  let nextNum = getNextInquiryNumber_(sheet);
  const ids = [];
  const rows = receivedDates.map(function (receivedAt, i) {
    const template = pickWeighted_(DUMMY_TEMPLATES);
    const person = DUMMY_PEOPLE[i % DUMMY_PEOPLE.length];
    const id = formatInquiryId_(nextNum++);
    ids.push(id);

    const status = decideDummyStatus_(receivedAt, now);
    let assignee = '';
    let assignedAt = '';
    let completedAt = '';
    let memo = '';

    if (status !== STATUS.OPEN) {
      assignee = pickAssignee_(staffNames, template.category);
      // 初動時間:緊急度「高」は早め(10分〜2時間)、それ以外は30分〜1日
      const delayMin = template.urgency === URGENCY.HIGH ? randomInt_(10, 120) : randomInt_(30, 24 * 60);
      assignedAt = minDate_(addMinutes_(receivedAt, delayMin), now);
    }
    if (status === STATUS.DONE) {
      completedAt = minDate_(addMinutes_(assignedAt, randomInt_(60, 5 * 24 * 60)), now);
      memo = pickRandom_(DUMMY_MEMOS[template.category]);
    }

    const row = new Array(INQUIRY_HEADERS.length).fill('');
    row[INQUIRY_COLS.ID - 1] = id;
    row[INQUIRY_COLS.RECEIVED_AT - 1] = receivedAt;
    row[INQUIRY_COLS.NAME - 1] = person[0];
    row[INQUIRY_COLS.EMAIL - 1] = person[1] + '@example.com';
    row[INQUIRY_COLS.PHONE - 1] = '090-0000-' + String(randomInt_(0, 9999)).padStart(4, '0');
    row[INQUIRY_COLS.BODY - 1] = template.body;
    row[INQUIRY_COLS.CATEGORY - 1] = template.category;
    row[INQUIRY_COLS.URGENCY - 1] = template.urgency;
    row[INQUIRY_COLS.SUMMARY - 1] = template.summary;
    row[INQUIRY_COLS.STATUS - 1] = status;
    row[INQUIRY_COLS.ASSIGNEE - 1] = assignee;
    row[INQUIRY_COLS.ASSIGNED_AT - 1] = assignedAt;
    row[INQUIRY_COLS.COMPLETED_AT - 1] = completedAt;
    row[INQUIRY_COLS.MEMO - 1] = memo;
    row[INQUIRY_COLS.AI_MODE - 1] = AI_PROVIDERS.MOCK;
    return row;
  });

  // 電話番号が数値として扱われないよう、書式を文字列にしてから書き込む
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, INQUIRY_COLS.PHONE, rows.length, 1).setNumberFormat('@');
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);

  props.setProperty(PROP_KEYS.DUMMY_IDS, JSON.stringify(ids));
  const message = rows.length + '件のダミーデータを作成しました(' + ids[0] + '〜' + ids[ids.length - 1] + ')。';
  console.log(message);
  writeLog_('generateDummyData', '成功', message);
}

/**
 * generateDummyData() で作成したデータだけを削除する。
 * フォームから届いた実際の問い合わせは削除しない。
 */
function clearDummyData() {
  runWithLog_('clearDummyData', clearDummyDataInternal_);
}

/** clearDummyData() の本体 */
function clearDummyDataInternal_() {
  const props = PropertiesService.getScriptProperties();
  const dummyIds = getDummyIds_();
  if (dummyIds.length === 0) {
    console.log('削除するダミーデータはありません。');
    return;
  }

  const sheet = getSheet_(SHEET_NAMES.INQUIRIES);
  const lastRow = sheet.getLastRow();
  let removed = 0;
  if (lastRow >= 2) {
    const range = sheet.getRange(2, 1, lastRow - 1, INQUIRY_HEADERS.length);
    const values = range.getValues();
    const kept = values.filter(function (row) {
      return dummyIds.indexOf(row[INQUIRY_COLS.ID - 1]) === -1;
    });
    removed = values.length - kept.length;
    // 残す行だけを書き戻す(行削除を繰り返すより高速)
    range.clearContent();
    if (kept.length > 0) {
      sheet.getRange(2, 1, kept.length, INQUIRY_HEADERS.length).setValues(kept);
    }
  }

  props.deleteProperty(PROP_KEYS.DUMMY_IDS);
  const message = removed + '件のダミーデータを削除しました。';
  console.log(message);
  writeLog_('clearDummyData', '成功', message);
}

// ------------------------------------------------------------
// 内部用の関数
// ------------------------------------------------------------

/** 保存済みのダミーデータIDの一覧を返す */
function getDummyIds_() {
  const json = PropertiesService.getScriptProperties().getProperty(PROP_KEYS.DUMMY_IDS);
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch (e) {
    return [];
  }
}

/** 担当者シートから担当者名と得意な種別を取得する */
function getStaffNamesForDummy_() {
  const sheet = getSheet_(SHEET_NAMES.STAFF);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, STAFF_HEADERS.length).getValues()
    .filter(function (r) { return r[STAFF_COLS.NAME - 1]; })
    .map(function (r) {
      return {
        name: String(r[STAFF_COLS.NAME - 1]),
        specialties: String(r[STAFF_COLS.SPECIALTY - 1] || '').split(',').map(function (s) { return s.trim(); }),
      };
    });
}

/**
 * 担当者を選ぶ。7割は得意な種別の担当者、それ以外はランダム。
 * @param {{name: string, specialties: string[]}[]} staff
 * @param {string} category
 * @return {string}
 */
function pickAssignee_(staff, category) {
  const experts = staff.filter(function (s) { return s.specialties.indexOf(category) !== -1; });
  if (experts.length > 0 && Math.random() < 0.7) {
    return pickRandom_(experts).name;
  }
  return pickRandom_(staff).name;
}

/**
 * 受付日時の古さに応じてステータスを決める。
 * 最近のものほど未対応・対応中、古いものほど完了になりやすい。
 */
function decideDummyStatus_(receivedAt, now) {
  const daysAgo = (now - receivedAt) / (24 * 60 * 60 * 1000);
  const r = Math.random();
  if (daysAgo <= 3) {
    return r < 0.6 ? STATUS.OPEN : STATUS.IN_PROGRESS;
  }
  if (daysAgo <= 10) {
    return r < 0.15 ? STATUS.OPEN : (r < 0.55 ? STATUS.IN_PROGRESS : STATUS.DONE);
  }
  return r < 0.1 ? STATUS.IN_PROGRESS : STATUS.DONE;
}

/** 過去 days 日以内の、営業時間(8時〜20時)のランダムな日時を返す */
function randomPastDate_(now, days) {
  for (let i = 0; i < 10; i++) {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() - randomInt_(0, days - 1));
    d.setHours(randomInt_(8, 19), randomInt_(0, 59), 0, 0);
    if (d < now) return d;
  }
  // 今日の未来時刻ばかり引いた場合は1時間前にする
  return new Date(now.getTime() - 60 * 60 * 1000);
}

/** 重み付きでランダムに1つ選ぶ */
function pickWeighted_(items) {
  const total = items.reduce(function (sum, item) { return sum + item.weight; }, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= items[i].weight;
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/** 配列からランダムに1つ選ぶ */
function pickRandom_(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** min 以上 max 以下のランダムな整数 */
function randomInt_(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 日時に分を足す */
function addMinutes_(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/** 2つの日時のうち早い方を返す(未来の日時にならないようにする) */
function minDate_(a, b) {
  return a < b ? a : b;
}
