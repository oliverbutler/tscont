import { PostService } from './post.service';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PostController } from './post.controller';

describe('PostController', () => {
  let app: INestApplication;
  let postService: PostService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        {
          provide: PostService,
          useValue: {
            getPosts: jest.fn(),
            createPost: jest.fn(),
          },
        },
      ],
    }).compile();

    postService = moduleRef.get<PostService>(PostService);

    app = moduleRef.createNestApplication();
    await app.init();
  });

  describe('GET /posts', () => {
    it('should transform skip and take into numbers', async () => {
      jest.spyOn(postService, 'getPosts').mockResolvedValue({
        posts: [],
        totalPosts: 0,
      });

      return request(app.getHttpServer())
        .get('/posts')
        .set('x-api-key', 'foo')
        .query('skip=0&take=10')
        .expect(200)
        .expect({
          posts: [],
          count: 0,
          skip: 0,
          take: 10,
        });
    });

    it('should fetch pagination header', async () => {
      jest.spyOn(postService, 'getPosts').mockResolvedValue({
        posts: [],
        totalPosts: 0,
      });

      return request(app.getHttpServer())
        .get('/posts')
        .set('x-api-key', 'foo')
        .set('x-pagination', '123')
        .query('skip=0&take=10')
        .expect(200)
        .expect({
          posts: [],
          count: 0,
          skip: 0,
          take: 10,
          pagination: 123,
        });
    });

    it('should error if a required query param is missing', async () => {
      return request(app.getHttpServer())
        .get('/posts')
        .set('x-api-key', 'foo')
        .query('skip=0')
        .expect(400)
        .expect({
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
        });
    });
  });

  describe('POST /posts', () => {
    it('should error if body is incorrect', async () => {
      return request(app.getHttpServer())
        .post('/posts')
        .set('x-api-key', 'foo')
        .send({
          title: 'Good title',
          content: 123,
        })
        .expect(400)
        .expect({
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
        });
    });

    it('should transform body correctly', async () => {
      jest
        .spyOn(postService, 'createPost')
        .mockImplementationOnce(async (post) => post as any);

      return request(app.getHttpServer())
        .post('/posts')
        .set('x-api-key', 'foo')
        .send({
          title: 'Title with extra spaces     ',
          content: 'content',
        })
        .expect(201)
        .expect({
          title: 'Title with extra spaces',
          content: 'content',
        });
    });
  });

  it('should format params using pathParams correctly', async () => {
    return request(app.getHttpServer())
      .get('/test/123/name')
      .set('x-api-key', 'foo')
      .expect(200)
      .expect({
        id: 123,
        name: 'name',
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
