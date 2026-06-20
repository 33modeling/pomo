# 🍅 Pomo — Focus & To-Do

심플하고 세련된 **뽀모도로 집중 타이머 + 할 일 관리** PWA입니다.
설치형 안드로이드 앱처럼 동작하며, **로그인 없이** 모든 데이터가 기기에만 저장되고 **오프라인**에서도 완전하게 작동합니다.

> Focus To-Do 스타일의 기능을 처음부터 새로 구현한 **오리지널** 프로젝트입니다. (코드·디자인·아이콘·문구 모두 자체 제작)

## ✨ 기능

- **뽀모도로 타이머** — 집중 / 짧은 휴식 / 긴 휴식, 원형 진행 표시, 시작·일시정지·초기화·건너뛰기
  - 긴 휴식 간격, 자동 시작(휴식/집중) 옵션
  - 백그라운드/새로고침 후에도 남은 시간 복원 (타임스탬프 기반, 드리프트 없음)
- **할 일 관리** — 프로젝트(색상 분류) · 작업 · 하위 작업(체크리스트)
  - 예상 뽀모도로, 우선순위, 마감일, 메모
  - 오늘 / 예정 / 언젠가 / 완료 그룹핑, 작업에서 바로 집중 시작
- **통계 & 리포트** — 오늘/주/월/년, 집중 시간·완료 뽀모도로·완료한 일·연속일(streak)
  - 시간대/요일/일/월별 막대 그래프, 프로젝트별 집중 분포
- **사운드** — 백색·핑크·브라운 노이즈, 빗소리·파도·모닥불 (모두 **Web Audio로 실시간 합성**, 오디오 파일 0개)
  - 초침 소리, 종료 알림음(벨/차임/디지털/핑) — 역시 합성
- **다크 모드** — 라이트 / 다크 / 시스템 자동
- **네이티브 알람(APK)** — 종료 시각에 OS 알림을 예약해 앱이 **백그라운드·화면 꺼짐** 상태여도 알람이 울림. 진행 중 알림에서 **시작/일시정지/종료**를 바로 제어 (Capacitor Local Notifications, actionTypes). 웹에서는 Web Notification으로 자동 폴백
- **PWA** — 홈 화면 설치, 오프라인 캐싱, 알림, 진동, 화면 켜짐 유지(Wake Lock)

## 🛠 기술 스택

- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS 3** (CSS 변수 기반 시맨틱 테마 토큰)
- **Dexie** (IndexedDB) — 작업/프로젝트/세션 영속화 · `dexie-react-hooks`로 반응형 조회
- **Zustand** — 타이머/설정/테마 상태 (`persist`로 로컬 저장)
- **vite-plugin-pwa** (Workbox) — 서비스 워커 · 매니페스트
- **Web Audio API** — 노이즈/틱/알람 합성 · **lucide-react** 아이콘

## 🚀 개발

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # 타입체크 + 프로덕션 빌드 (dist/)
npm run preview    # 빌드 결과 미리보기
npm run typecheck  # 타입 검사만
```

## 📱 안드로이드에 설치하기

1. 빌드 후 정적 호스팅(예: GitHub Pages, Netlify, Vercel)에 `dist/`를 배포합니다.
   - 서브 경로(`/pomo/` 등)에 배포한다면 `vite.config.ts`에 `base: '/pomo/'`를 추가하세요.
2. 안드로이드 **Chrome**에서 사이트를 열고 메뉴 → **"앱 설치"** / **"홈 화면에 추가"**를 선택합니다.
3. 홈 화면 아이콘으로 전체화면 앱처럼 실행됩니다.

> 알림·진동·화면 유지 등 일부 기능은 HTTPS(또는 localhost)에서만 동작합니다.

## 🤖 안드로이드 APK 빌드 (Capacitor)

PWA를 **Capacitor**로 감싸 오프라인 설치형 **APK**로 만듭니다. (웹 빌드 결과가 APK 안에 포함되어 서버 호스팅이 필요 없습니다.)

### 1) 빌드 도구 준비 (1회, sudo 불필요)

JDK 21 + Android SDK를 홈 디렉터리에 설치하는 스크립트가 포함되어 있습니다:

```bash
bash scripts/setup-android.sh
# 이후 안내대로 JAVA_HOME / ANDROID_HOME 를 export
```

> 이미 Android Studio가 있다면 이 단계는 생략하고, `android/local.properties`에 `sdk.dir=<SDK 경로>`만 맞춰주면 됩니다.

### 2) APK 빌드

```bash
npm run android:apk
# 결과: android/app/build/outputs/apk/debug/app-debug.apk
```

기기/에뮬레이터에 설치:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Android Studio로 열어서 빌드/실행하려면:

```bash
npm run android:open
```

### 웹 변경사항 반영

웹 코드를 고친 뒤에는 `npm run android:sync`(빌드 + 네이티브로 복사) 후 다시 APK를 빌드하세요.
`npm run android:apk`는 이 과정을 한 번에 처리합니다.

| 항목 | 값 |
| --- | --- |
| applicationId | `com.pomo.app` |
| minSdk / targetSdk | 23 / 35 |
| Capacitor | 7.x (JDK 21, Gradle 8.11) |

### 3) 릴리스 서명 (배포용)

디버그 APK는 디버그 키로 자동 서명되어 바로 설치되지만, 스토어 배포에는 **릴리스 서명**이 필요합니다.

1. 키스토어 생성 (최초 1회):

   ```bash
   npm run keystore     # 비밀번호 입력 → android/pomo-release.jks + android/keystore.properties 생성
   ```

   두 파일은 **gitignore**되어 커밋되지 않습니다. **반드시 백업**하세요 — 분실하면 Play 스토어에서 앱을 업데이트할 수 없습니다.

2. 서명된 결과물:

   ```bash
   npm run android:apk:release   # → android/app/build/outputs/apk/release/app-release.apk
   npm run android:aab           # → android/app/build/outputs/bundle/release/app-release.aab  (Play 업로드용)
   ```

   `keystore.properties`가 있으면 릴리스 키로 자동 서명되고, 없으면 미서명으로 빌드됩니다 (`android/app/build.gradle` 참고).

### 4) GitHub Actions 자동 빌드

`.github/workflows/android.yml`이 푸시/태그/수동 실행 시 자동으로 빌드합니다.

- **항상**: 디버그 APK 빌드 → 아티팩트 업로드 (`pomo-debug-apk`)
- **서명 시크릿이 있으면**: 서명된 APK + AAB 빌드 → 아티팩트 업로드 (`pomo-release`)
- **버전 태그(`vX.Y.Z`) 푸시 시**: 서명된 APK/AAB를 **GitHub Release**에 첨부

서명 빌드를 켜려면 저장소 **Settings → Secrets and variables → Actions**에 등록:

| 시크릿 | 값 |
| --- | --- |
| `KEYSTORE_BASE64` | `base64 -w0 android/pomo-release.jks` 결과 |
| `KEYSTORE_PASSWORD` | 키스토어 비밀번호 |
| `KEY_ALIAS` | 키 별칭 (예: `pomo`) |
| `KEY_PASSWORD` | 키 비밀번호 |

> 시크릿이 없으면 릴리스 단계는 자동으로 건너뛰고 디버그 APK만 빌드합니다.

## 🗂 구조

```
src/
  types.ts            도메인 타입 (단일 출처)
  db/                 Dexie DB + repo(CRUD/쿼리)
  store/              zustand: timer / settings / theme
  audio/              Web Audio 엔진 + 사운드 카탈로그
  lib/                포맷·날짜·알림·WakeLock·상수
  components/         재사용 UI 키트 (Button, Card, Sheet, ProgressRing ...)
  pages/              화면 (Timer, Tasks, Stats, Settings, SoundsSheet)
  App.tsx, main.tsx   라우팅 + 진입점
scripts/gen-icons.mjs 아이콘 생성기 (1회성)
```

## 🔒 개인정보

계정·서버·추적이 없습니다. 모든 데이터(작업, 통계, 설정)는 브라우저의 IndexedDB/localStorage에만 저장됩니다.

## 📄 라이선스

MIT
