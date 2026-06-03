#!/bin/bash
# TimeFlow - GitHubへの一括アップロードスクリプト
# 使い方: bash upload.sh <GitHubトークン>

TOKEN=$1
REPO="FightingKazuo/time-flow"
BRANCH="main"

if [ -z "$TOKEN" ]; then
  echo "使い方: bash upload.sh <GitHubトークン>"
  echo "GitHubトークンは Settings > Developer settings > Personal access tokens で発行"
  exit 1
fi

API="https://api.github.com/repos/$REPO/contents"

upload_file() {
  local LOCAL_PATH=$1
  local REMOTE_PATH=$2
  local CONTENT=$(base64 -i "$LOCAL_PATH" | tr -d '\n')

  # 既存ファイルのSHAを取得
  local SHA=$(curl -s -H "Authorization: token $TOKEN" \
    "$API/$REMOTE_PATH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null)

  local BODY
  if [ -n "$SHA" ]; then
    BODY="{\"message\":\"update $REMOTE_PATH\",\"content\":\"$CONTENT\",\"sha\":\"$SHA\",\"branch\":\"$BRANCH\"}"
  else
    BODY="{\"message\":\"add $REMOTE_PATH\",\"content\":\"$CONTENT\",\"branch\":\"$BRANCH\"}"
  fi

  local RESULT=$(curl -s -X PUT \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$BODY" \
    "$API/$REMOTE_PATH")

  if echo "$RESULT" | grep -q '"sha"'; then
    echo "✓ $REMOTE_PATH"
  else
    echo "✗ $REMOTE_PATH (エラー)"
    echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','unknown error'))" 2>/dev/null
  fi
}

echo "=== TimeFlow アップロード開始 ==="
echo ""

upload_file "src/constants.js"              "src/constants.js"
upload_file "src/App.jsx"                   "src/App.jsx"
upload_file "src/hooks/useTimer.js"         "src/hooks/useTimer.js"
upload_file "src/hooks/useWeekReset.js"     "src/hooks/useWeekReset.js"
upload_file "src/components/RingTimer.jsx"          "src/components/RingTimer.jsx"
upload_file "src/components/TimelineBar.jsx"        "src/components/TimelineBar.jsx"
upload_file "src/components/CategoryDial.jsx"       "src/components/CategoryDial.jsx"
upload_file "src/components/ColorPicker.jsx"        "src/components/ColorPicker.jsx"
upload_file "src/components/TaskInput.jsx"          "src/components/TaskInput.jsx"
upload_file "src/components/WeeklyProgress.jsx"     "src/components/WeeklyProgress.jsx"
upload_file "src/components/modals/DiaryModal.jsx"          "src/components/modals/DiaryModal.jsx"
upload_file "src/components/modals/DiaryListModal.jsx"      "src/components/modals/DiaryListModal.jsx"
upload_file "src/components/modals/EditLogModal.jsx"        "src/components/modals/EditLogModal.jsx"
upload_file "src/components/modals/CatManagerModal.jsx"     "src/components/modals/CatManagerModal.jsx"
upload_file "src/components/modals/BackupModal.jsx"         "src/components/modals/BackupModal.jsx"
upload_file "src/components/modals/WeekHistoryModal.jsx"    "src/components/modals/WeekHistoryModal.jsx"
upload_file "src/components/modals/LongTermModal.jsx"       "src/components/modals/LongTermModal.jsx"
upload_file "src/components/modals/WeeklyTemplateManager.jsx" "src/components/modals/WeeklyTemplateManager.jsx"
upload_file "src/components/modals/MoveTaskPopup.jsx"       "src/components/modals/MoveTaskPopup.jsx"

echo ""
echo "=== 完了 ==="
echo "Vercelが自動でビルドを開始します（1〜2分）"
echo "https://time-flow-qcr5.vercel.app で確認してください"
