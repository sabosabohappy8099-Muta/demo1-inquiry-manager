// 公開デモの版を確かめる(bin/build-public.sh から自動で実行する)
// - メール通知・下書きの保存をしても Gmail が呼ばれず、「送信記録(デモ)」に残ること
// - AI の API を設定していても MOCK になること
// 実行:node bin/check-public.js build/public
const fs = require("fs");
const vm = require("vm");

const dir = process.argv[2] || "build/public";
const gmailCalls = [];
const ctx = {
  console,
  GmailApp: {
    sendEmail: (to) => gmailCalls.push(["送信", to]),
    createDraft: (to) => gmailCalls.push(["下書き", to]),
  },
};
vm.createContext(ctx);
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
  vm.runInContext(fs.readFileSync(`${dir}/${file}`, "utf8"), ctx, { filename: file });
}
vm.runInContext(`
  var __recorded = [];
  recordDemoMail_ = function (kind, to) { __recorded.push([kind, to]); };
  getSetting_ = function () { return "架空の会社"; };
  getProp_ = function () { return "CLAUDE"; };
  sendNotifyMail_("staff@example.com", "件名", "本文");
  createCustomerDraft_("customer@example.com", "件名", "本文");
`, ctx);

const errors = [];
if (!vm.runInContext("PUBLIC_DEMO_MODE", ctx)) errors.push("PUBLIC_DEMO_MODE が true ではありません");
if (gmailCalls.length > 0) errors.push(`Gmail が呼ばれました:${JSON.stringify(gmailCalls)}`);
if (vm.runInContext("__recorded.length", ctx) !== 2) errors.push("送信記録に2件残っていません");
if (vm.runInContext("getAiProvider_()", ctx) !== "MOCK") errors.push("AI が MOCK になっていません");

if (errors.length > 0) {
  console.error("公開デモの確認で問題が見つかりました:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("公開デモの確認:OK(Gmail は呼ばれない・送信記録に残る・AI は MOCK)");
