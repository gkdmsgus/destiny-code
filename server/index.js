require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const characterRouter = require('./routes/character');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

app.use('/api/character', characterRouter);

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
