# Test Spec Archive: 技术栈基线确认

## Acceptance Tests

- 检查技术栈基线文档覆盖所有层级。
- 检查根文档与 agent brief 不含过时默认栈。
- 运行 ai-scaffold build/test/status/doctor/gate。
- 运行 ai-adapter compileall/unittest。
- 运行 work-item link 检查，确保代码/脚手架改造绑定 F002。
