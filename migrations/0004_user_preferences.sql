-- 사용자별 워크플로우 설정을 서버에 저장.
-- 클라이언트(localStorage) 의존을 줄이고, 같은 계정이면 어느 디바이스/브라우저든 동일 설정을 보장한다.
-- 현재 저장 대상: defaultPrivacy, defaultLanguage, defaultTags (youtubeSettingsStore).
-- 향후 새 키가 추가돼도 마이그레이션 없이 JSON 안에서 확장 가능.
ALTER TABLE users ADD COLUMN preferences TEXT NOT NULL DEFAULT '{}';
