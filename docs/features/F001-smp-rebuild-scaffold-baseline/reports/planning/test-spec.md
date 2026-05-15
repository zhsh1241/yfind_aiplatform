# Test Spec Archive

验证命令：

- `npm --prefix tools/ai-scaffold test`
- `node tools/ai-scaffold/dist/cli.js gate --skip-backend-integration`
- `python -m compileall app tests`
- `python -m unittest discover -s tests -v`
- `git diff --name-only | node tools/ai-scaffold/dist/cli.js check-work-item-link --stdin`

预期：全部通过。
