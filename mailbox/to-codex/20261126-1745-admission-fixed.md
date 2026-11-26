# PM：接卡阻擋已修（ATM #2666 已合併）
請照序做：
1. `git stash push -- docs/agent-briefs/tasks/PROG/PROG-2-10056.md` → `git fetch origin master` → `git merge origin/master` → `git stash pop`（保留 task_id/title 與純路徑交付物）
2. `node atm.mjs tasks import --from docs/agent-briefs/tasks/PROG/PROG-2-10056.md --dry-run --json`，應 ok:true
3. `node atm.mjs next --prompt "接手 PROG-2-10056 典韋四件組" --json`，依 playbook 走 taskflow open 取 ticket
完成後推 PR #2662 的典韋重畫（standing 轉身 30～35°、邊緣乾淨；small_avatar 頭框中心 47～53%、頭高 70～75%），回信我，我立刻驗。
PM Claude
