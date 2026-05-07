# F006 éªè¯è®°å½

- Featureï¼F006-model-registry-mvp
- æ¥æï¼2026-05-07
- ç¶æï¼PASS

## å½åèªå¨åéªè¯

```powershell
$env:JAVA_HOME='C:\java\jdk-21.0.6'
$env:Path='C:\java\jdk-21.0.6\bin;' + [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
node tools/ai-scaffold/dist/cli.js gate --feature-dir docs/features/F006-model-registry-mvp --run-e2e
```

ç»æï¼è´¨éé¨ç¦éè¿ã

- åç«¯ `mvn verify`ï¼32/32 éè¿ï¼ä½¿ç¨ Java 21.0.6ã
- `ai-adapter`ï¼`python -m compileall app tests` éè¿ï¼`python -m unittest discover -s tests -v` 4/4 éè¿ã
- åç«¯ï¼`npm run lint` éè¿ï¼Vitest 32/32 éè¿ï¼`npm run build` éè¿ã
- Playwright E2Eï¼4/4 éè¿ï¼å¹¶å½æ¡£å° `reports/e2e/2026-05-07114-frontend-playwright-report/`ã

è¯´æï¼è¥å½å shell ç `java` / `mvn` é»è®¤æå Java 8ï¼éåæ README è®¾ç½® `JAVA_HOME=C:\java\jdk-21.0.6`ï¼å¦å Maven Surefire ä¼å  class file version 65.0 å¤±è´¥ãVite ä»ææ¢æ Ant Design chunk ä½ç§¯/å¾ªç¯æåè­¦åï¼ä¸é»æ­äº¤ä»ã

## å½åå¯ç¨è½å

- æ¨¡åä»åºåè¡¨ãçæ¬æ¶é´çº¿ãçæ¬è¯¦æãæ¹å/é©³åæµç¨å¯ç¨ã
- æ¹ååçæ¬å¯åæ¢ä¸ºâå¯é¨ç½²âç¶æã
- æ¨çæå¡é¡µæ¯ææ¬å°é¨ç½²è®°å½åæ¾ï¼ä¾¿äºéªè¯æ¨¡åå®¡æ¹å°æ¨çåå¸çé¡µé¢é¾è·¯ã

## å½åéå¶

- æ¨¡åå®¡æ¹ç»æå½åä¸»è¦ä½ç¨äº MVP åç«¯åå­ç¶æä¸åç«¯æ¼ç¤ºé¾è·¯ï¼ä¸ç­åäºçå®çäº§åå¸é¨ç¦ã
- æ¨çé¨ç½²å¨åç«¯ä¸å¯ç¨æ¶éåä¸ºæ¬å°é¨ç½²è®°å½ï¼ä¸ä¼çæ­£åå¸å° KServeã
- å æ­¤å½ååºæè¿°ä¸ºâæ¨¡åå®¡æ¹é¾è·¯å¯èµ°éï¼æ¨çåå¸å«æ¬å°æ¨¡æé­ç¯âã
