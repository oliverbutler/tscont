import * as waitOn from 'wait-on';
import { spawn } from 'child_process';

jest.setTimeout(60000);

describe('example-cloudflare-worker', () => {
  let serverProcess: any;

  beforeAll(async () => {
    // Start the server in the background
    serverProcess = spawn(
      'pnpm',
      ['wrangler', 'dev', 'apps/example-cloudflare-worker/src/index.ts'],
      {
        stdio: 'pipe',
        shell: true,
      },
    );

    // Optional: Log server output for debugging
    serverProcess.stdout.on('data', (data: any) => {
      console.log(`Server output: ${data}`);
    });

    serverProcess.stderr.on('data', (data: any) => {
      console.error(`Server error: ${data}`);
    });

    // Wait for the server to be ready
    await waitOn({
      resources: ['tcp:127.0.0.1:8787'],
      timeout: 30000,
      validateStatus: (status) => status === 200,
      headers: { 'x-api-key': 'foo' },
    });
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  it('GET /posts should return an array of posts', async () => {
    const response = await fetch('http://127.0.0.1:8787/posts?skip=0&take=10', {
      headers: {
        'x-api-key': 'foo',
        'x-pagination': '5',
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.posts).toHaveLength(2);
    expect(body.skip).toStrictEqual(0);
    expect(body.take).toStrictEqual(10);
    expect(response.headers.get('x-geo-country')).toStrictEqual('US');
  });

  it('should error on invalid pagination header', async () => {
    const response = await fetch('http://127.0.0.1:8787/posts?skip=0&take=10', {
      headers: {
        'x-api-key': 'foo',
        'x-pagination': 'not a number',
      },
    });
    const body = await response.json();

    expect(response.status).toStrictEqual(400);
    expect(body).toEqual({
      message: 'Request validation failed',
      bodyErrors: null,
      headerErrors: {
        name: 'ValidationError',
        issues: [
          {
            code: 'invalid_type',
            expected: 'number',
            message: 'Expected number, received nan',
            path: ['x-pagination'],
            received: 'nan',
          },
        ],
      },
      pathParameterErrors: null,
      queryParameterErrors: null,
    });
  });

  it('should error if a required query param is missing', async () => {
    const response = await fetch('http://127.0.0.1:8787/posts?skip=0', {
      headers: {
        'x-api-key': 'foo',
        'x-pagination': '5',
      },
    });
    const body = await response.json();

    expect(response.status).toStrictEqual(400);
    expect(body).toEqual({
      message: 'Request validation failed',
      bodyErrors: null,
      headerErrors: null,
      pathParameterErrors: null,
      queryParameterErrors: {
        name: 'ValidationError',
        issues: [
          {
            code: 'invalid_type',
            expected: 'string',
            message: 'Required',
            path: ['take'],
            received: 'undefined',
          },
        ],
      },
    });
  });

  it('should error if body is incorrect', async () => {
    const response = await fetch('http://127.0.0.1:8787/posts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'foo',
      },
      body: JSON.stringify({
        title: 'Good title',
        content: 123,
      }),
    });
    const body = await response.json();

    expect(response.status).toStrictEqual(400);
    expect(body).toEqual({
      message: 'Request validation failed',
      bodyErrors: {
        name: 'ValidationError',
        issues: [
          {
            code: 'invalid_type',
            expected: 'string',
            message: 'Expected string, received number',
            path: ['content'],
            received: 'number',
          },
        ],
      },
      headerErrors: null,
      pathParameterErrors: null,
      queryParameterErrors: null,
    });
  });

  it('should error if api key header is missing', async () => {
    const response = await fetch('http://127.0.0.1:8787/posts?skip=0&take=10');
    const body = await response.json();

    expect(response.status).toStrictEqual(400);
    expect(body).toEqual({
      message: 'Request validation failed',
      bodyErrors: null,
      headerErrors: {
        name: 'ValidationError',
        issues: [
          {
            code: 'invalid_type',
            expected: 'string',
            message: 'Required',
            path: ['x-api-key'],
            received: 'undefined',
          },
        ],
      },
      pathParameterErrors: null,
      queryParameterErrors: null,
    });
  });

  it('should transform body correctly', async () => {
    const response = await fetch('http://127.0.0.1:8787/posts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'foo',
      },
      body: JSON.stringify({
        title: 'Title with extra spaces     ',
        content: 'content',
      }),
    });
    const body = await response.json();

    expect(response.status).toStrictEqual(201);
    expect(body.title).toStrictEqual('Title with extra spaces');
  });

  it('should format params using pathParams correctly', async () => {
    const response = await fetch('http://127.0.0.1:8787/test/123/name', {
      headers: {
        'x-api-key': 'foo',
      },
    });
    const body = await response.json();

    expect(response.status).toStrictEqual(200);
    expect(body).toEqual({
      id: 123,
      name: 'name',
      defaultValue: 'hello world',
    });
  });
});
