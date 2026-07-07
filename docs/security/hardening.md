# MemoryFlow 보안 하드닝 — 인프라(Nginx / Cloudflare) 적용 가이드

이 문서는 **코드로 고칠 수 없는(서버/엣지 설정) 항목**의 적용 스니펫이다.
코드 측 보안(호스트 바인딩, CORS/CSRF, 시크릿 검증, 의존성, 업로드 검증, 토큰 암호화,
API 응답 helmet 헤더 등)은 앱에 이미 반영되어 있다.

> 배포 실행: 운영은 개발 모드(`tsx watch`)가 아니라 빌드 산출물로 실행한다.
> `NODE_ENV=production HOST=127.0.0.1 node server/dist/index.js` (또는 `pnpm start`).
> `HOST`는 Nginx가 같은 호스트면 `127.0.0.1`, 다른 호스트/컨테이너면 해당 인터페이스로.

---

## 1. 보안 헤더 (SPA HTML/정적 응답)

정적 SPA를 서빙하는 Nginx `server`(또는 정적 `location`)에 추가한다. Fastify(`/api`)는
`@fastify/helmet`으로 자체 헤더를 붙이므로, 아래는 **HTML/정적 자산** 대상이다.

```nginx
# --- 보안 헤더 (정적 SPA) ---
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=15552000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; worker-src 'self'; manifest-src 'self'; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net" always;
```

주의:
- `style-src`에 `'unsafe-inline'`은 React inline style 속성과 Tailwind 주입 스타일 때문에 필요.
  완전 제거하려면 nonce/hash 파이프라인이 필요(추후).
- 외부 폰트를 self-host로 옮기면 `fonts.googleapis.com`/`gstatic`/`jsdelivr`를 CSP에서 제거 가능.
- `frame-ancestors 'none'`으로 클릭재킹 방지(별도 `X-Frame-Options` 불필요).

### Cloudflare로 적용하는 경우
Transform Rules → **Modify Response Header**에서 위 헤더들을 동일하게 추가한다.
원본(Nginx)과 **한 곳에서만** 적용해 중복 헤더가 나오지 않게 한다(중복 시 브라우저가
가장 제한적인 값을 적용하거나 경고).

---

## 2. manifest.webmanifest MIME (P2.3)

`application/octet-stream`으로 내려가면 일부 브라우저가 PWA manifest를 무시한다.

```nginx
# mime.types에 없으면 명시
location = /manifest.webmanifest {
    default_type application/manifest+json;
    add_header X-Content-Type-Options "nosniff" always;
    try_files $uri =404;
}
```
또는 `/etc/nginx/mime.types`에 `application/manifest+json  webmanifest;` 추가.

---

## 3. 없는 정적 파일은 404 (P2.2)

SPA fallback이 모든 경로를 `index.html`로 200 반환하면 `*.js.map`, `/robots.txt` 등
존재하지 않는 파일도 200 HTML이 된다. 정적 자산은 실제 파일이 있을 때만 서빙하고,
나머지 앱 라우트만 SPA fallback으로 보낸다.

```nginx
# 정적 자산: 실제 파일 없으면 404 (SPA로 넘기지 않음)
location ~* \.(?:js|css|map|json|png|jpg|jpeg|gif|svg|webp|ico|woff2?|mp4|webm|mp3|txt|xml)$ {
    try_files $uri =404;
}

# 소스맵은 아예 노출 안 함(선택)
location ~* \.map$ { return 404; }

# robots.txt는 명시 제공(선택)
location = /robots.txt { try_files $uri =404; }

# 앱 라우트만 SPA fallback
location / {
    try_files $uri /index.html;
}

# API는 백엔드로
location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Origin/Referer는 그대로 전달되어 CSRF 검증에 사용됨 (변경 금지)
}
```

---

## 4. 검증 (배포 후)

```bash
# 보안 헤더
curl -I https://memoryflow.vibeflow.kr/

# manifest MIME
curl -sI https://memoryflow.vibeflow.kr/manifest.webmanifest | grep -i content-type
# → application/manifest+json

# 없는 소스맵/파일은 404
curl -s -o /dev/null -w "%{http_code}\n" https://memoryflow.vibeflow.kr/assets/nope.js.map
# → 404

# CORS (악성 origin 미허용)
curl -i -H "Origin: http://evil.test" https://memoryflow.vibeflow.kr/api/health
# → Access-Control-Allow-Origin 없음
```

---

## 남은 항목 (코드로 처리되지 않음 · 별도 결정)

- **AI 개인정보(P2.4)**: `AI_PROVIDER=gemini`일 때 스토리 텍스트/이름이 외부로 전송된다.
  기본을 `stub`으로 두거나(현재 .env는 gemini), 고지·마스킹·관리자 옵션 정책을 별도로 결정한다.
  (`server/src/services/ai.ts`, `server/src/routes/storybook.ts`)
