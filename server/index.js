require('dotenv').config({ override: true });

// ── 필수 환경변수 검증 ──
const REQUIRED_ENV = ['OPENAI_API_KEY'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`\n❌ 필수 환경변수 누락: ${missing.join(', ')}`);
  console.error('   .env 파일에 해당 키를 추가한 후 다시 실행해주세요.\n');
  process.exit(1);
}
console.log('✅ 환경변수 확인 완료');

const express = require('express');
const cors = require('cors');
const path = require('path');
const characterRouter    = require('./routes/character');
const compatibilityRouter = require('./routes/compatibility');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

app.use('/api/character',    characterRouter);
app.use('/api/compatibility', compatibilityRouter);

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
