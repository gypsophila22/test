import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

describe('[통합] 이미지 업로드', () => {
  let app: import('express').Express;
  const projectRoot = path.resolve(process.cwd());
  const savedDir = path.join(projectRoot, 'src', 'uploads', 'saved');

  beforeAll(async () => {
    // 라우터가 이미 test-app에 마운트되어 있다고 가정
    const { createTestApp } = await import('./_helper/test-app.js');
    app = await createTestApp();

    // 디스크 스토리지 경로가 존재해야 저장 에러가 안 남
    fs.mkdirSync(savedDir, { recursive: true });
  });

  afterEach(() => {
    // 테스트 중 생성된 파일 정리
    if (!fs.existsSync(savedDir)) return;
    for (const f of fs.readdirSync(savedDir)) {
      try {
        fs.unlinkSync(path.join(savedDir, f));
      } catch {}
    }
  });

  test('단일 업로드: 이미지(jpg) → 200 + 파일 생성', async () => {
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]); // 최소 JPEG 마커
    const res = await request(app)
      .post('/images/upload/single')
      .attach('myImage', jpg, { filename: 'a.jpg', contentType: 'image/jpeg' })
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        message: expect.any(String),
        filename: expect.stringMatching(/myImage-\d+\.jpg$/),
        filepath: expect.stringMatching(/^\/uploads\/myImage-\d+\.jpg$/),
      })
    );

    // 실제 파일이 디스크에 존재하는지 확인
    const filename: string = res.body.filename;
    const onDisk = path.join(savedDir, filename);
    expect(fs.existsSync(onDisk)).toBe(true);
    expect(fs.statSync(onDisk).size).toBeGreaterThan(0);
  });

  test('여러 파일 업로드(<=5개) → 200 + files 배열', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG 시그니처 일부
    const req = request(app).post('/images/upload/array');
    for (let i = 0; i < 3; i++) {
      req.attach('myImages', png, {
        filename: `b${i}.png`,
        contentType: 'image/png',
      });
    }
    const res = await req.expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        message: expect.any(String),
        files: expect.any(Array),
      })
    );
    expect(res.body.files).toHaveLength(3);
    for (const f of res.body.files as Array<{
      filename: string;
      filepath: string;
    }>) {
      expect(f.filename).toMatch(/^myImages-\d+\.png$/);
      expect(fs.existsSync(path.join(savedDir, f.filename))).toBe(true);
    }
  });

  test('허용되지 않는 형식(text/plain) → 400', async () => {
    // fileFilter에서 Error 던지므로 400으로 매핑되어야 함(전역 에러핸들러 필요)
    const txt = Buffer.from('hello');
    await request(app)
      .post('/images/upload/single')
      .attach('myImage', txt, { filename: 'c.txt', contentType: 'text/plain' })
      .expect(400);
  });

  test('파일 개수 초과(6개) → 400 (LIMIT_FILE_COUNT)', async () => {
    const webp = Buffer.from('RIFF'); // 대충 바이트
    let req = request(app).post('/images/upload/array');
    for (let i = 0; i < 6; i++) {
      req = req.attach('myImages', webp, {
        filename: `d${i}.webp`,
        contentType: 'image/webp',
      });
    }
    const res = await req.expect(400);

    // 전역 errorHandler가 MulterError.code를 내려주도록 되어 있으면 다음도 가능:
    // expect(res.body.code).toBe('LIMIT_FILE_COUNT');
  });

  test('파일 크기 초과(>5MB) → 400 (LIMIT_FILE_SIZE)', async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 0); // 5MB + 1
    const res = await request(app)
      .post('/images/upload/single')
      .attach('myImage', big, { filename: 'e.jpg', contentType: 'image/jpeg' })
      .expect(400);

    // 에러 코드 단언(옵션): errorHandler가 code를 노출하면 아래 활성화
    // expect(res.body.code).toBe('LIMIT_FILE_SIZE');
  });
});
