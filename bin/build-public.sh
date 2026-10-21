#!/usr/bin/env bash
# 公開デモ(ログインなしで誰でも触れる版)を組み立てて、公開デモ用の GAS プロジェクトに送る
#
#   bin/build-public.sh          … build/public に組み立てるだけ
#   bin/build-public.sh --push   … 組み立てて clasp push する(.clasp.public.json が必要)
#                                  .public-deployment-id があれば、公開中の Web アプリ(同じ URL)も新しい版に更新する
#
# 組み立て方:src をそのまま写し、次の2つだけを公開デモ用に差し替える
#   public/PublicMode.js   … PUBLIC_DEMO_MODE = true(メールを送らない・AI は MOCK・毎晩リセット)
#   public/appsscript.json … 使える権限を最小限にする(Gmail・ドライブ・外部通信は使えない)
set -euo pipefail
cd "$(dirname "$0")/.."

out=build/public
rm -rf "$out"
mkdir -p "$out"
cp src/* "$out/"
cp public/PublicMode.js public/appsscript.json "$out/"

# 念のため:公開デモに Gmail・ドライブ・外部通信の権限が入っていないことを確かめる
if grep -Eq 'auth/(gmail|drive|script\.external_request|userinfo)|mail\.google\.com' "$out/appsscript.json"; then
  echo "公開デモの appsscript.json に、使わせない権限が入っています。中止します" >&2
  exit 1
fi
# 公開デモの版が、Gmail を呼ばず・AI は MOCK で動くことを確かめる(問題があれば止める)
node bin/check-public.js "$out"
echo "組み立てました:$out"

if [[ "${1:-}" == "--push" ]]; then
  if [[ ! -f .clasp.public.json ]]; then
    echo ".clasp.public.json(公開デモ用の scriptId)がありません。README の「公開デモ」の手順で作ってください" >&2
    exit 1
  fi
  sed 's#"rootDir": *"[^"]*"#"rootDir": "."#' .clasp.public.json > "$out/.clasp.json"
  (cd "$out" && clasp push --force)
  if [[ -f .public-deployment-id ]]; then
    deployment_id="$(tr -d '[:space:]' < .public-deployment-id)"
    (cd "$out" && clasp update-deployment "$deployment_id" --description "公開デモ $(date '+%Y-%m-%d %H:%M')")
    echo "公開中の Web アプリを更新しました:https://script.google.com/macros/s/${deployment_id}/exec"
  fi
fi
