/**
 * PublicMode.js(公開デモ用)
 * 公開デモ(ログインなしで誰でも触れる版)として動かす。
 * - メールは送らず、Gmail の下書きも作らない(「送信記録(デモ)」シートに残すだけ)
 * - AI は API を使わない MOCK に固定する
 * - データは毎晩リセットする(PublicDemo.js の resetPublicDemo)
 * 使える権限は public/appsscript.json の oauthScopes に限る(Gmail・ドライブ・外部通信は使えない)
 */
const PUBLIC_DEMO_MODE = true;
