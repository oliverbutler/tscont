import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import sdk from '@stackblitz/sdk';
import Layout from '@theme/Layout';
import clsx from 'clsx';
import React, { useEffect } from 'react';
import { Code } from '../components/Code';
import { CodeVideo } from '../components/CodeVideo';
import HomepageFeatures from '../components/HomepageFeatures';
import styles from './index.module.css';
// @ts-ignore
import logo from '../../static/img/logo.png';
// @ts-ignore
import react from '../../static/img/react.png';
// @ts-ignore
import solidJs from '../../static/img/solid.png';
// @ts-ignore
import express from '../../static/img/express.png';
// @ts-ignore
import koa from '../../static/img/koa.png';
// @ts-ignore
import nest from '../../static/img/nest.png';
// @ts-ignore
import fastify from '../../static/img/fastify.png';
// @ts-ignore
import openApi from '../../static/img/swagger.png';
// @ts-ignore
import vercel from '../../static/img/vercel.png';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  useEffect(() => {
    sdk.embedProjectId('stack-blitz', 'typescript-pw8hhy', {
      forceEmbedLayout: true,
      openFile: ['client.ts', 'contract.ts'],
      view: 'editor',
      height: '500px',
      hideExplorer: true,
    });
  }, []);

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <div id="stack-blitz" />
        </div>
      </div>
    </header>
  );
}

const QuickstartButton = () => {
  return (
    <div className="relative w-fit h-fit mx-auto items-center flex flex-col">
      <Link to="/docs/quickstart">
        <button
          className="transition-all text-white shadow-xl shadow-purple-600/10 bg-purple-500 dark:bg-purple-800 cursor-pointer hover:bg-purple-700
    p-4 rounded-xl appearance-none border-none text-2xl font-bold flex flex-row items-center gap-2"
        >
          Quickstart Guide{' '}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="feather feather-zap inline"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </button>
      </Link>
      <iframe
        className="mt-4 ml-7"
        src="https://ghbtns.com/github-btn.html?user=ts-rest&repo=ts-rest&type=star&count=true&size=large"
        frameBorder="0"
        scrolling="0"
        width="170"
        height="30"
        title="GitHub"
      ></iframe>
    </div>
  );
};

export default function Home(): JSX.Element {
  return (
    <Layout
      title={`🪄`}
      description="Incrementally adoptable type-safety for your new and existing APIs"
      wrapperClassName="homepage"
    >
      <div className="container mt-12 md:mt-24 mx-auto">
        <div className="flex items-center justify-center mb-6">
          <svg
            className={'w-2/3 max-w-2xl dark:fill-white fill-black'}
            viewBox="0 0 316 70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="316" height="70" fill="transparent" />
            <path
              d="M44.04 55V20.448H57.536V15.8H25.224V20.448H38.72V55H44.04ZM79.6096 55.448C89.8576 55.448 94.6736 50.296 94.6736 44.36C94.6736 29.968 70.8736 36.072 70.8736 26.328C70.8736 22.8 73.7856 19.944 80.5056 19.944C83.9776 19.944 87.8976 20.952 91.3136 23.136L93.0496 18.88C89.8016 16.64 85.0976 15.352 80.5616 15.352C70.2576 15.352 65.6096 20.504 65.6096 26.496C65.6096 41.056 89.4096 34.896 89.4096 44.696C89.4096 48.168 86.4416 50.856 79.6096 50.856C74.5696 50.856 69.5856 48.952 66.6736 46.32L64.6576 50.464C67.7376 53.432 73.6176 55.448 79.6096 55.448ZM121.202 41.896V37.416H106.25V41.896H121.202ZM158.263 41.784C163.751 39.824 166.943 35.512 166.943 29.464C166.943 20.896 160.783 15.8 150.647 15.8H135.471V20.448H150.479C157.759 20.448 161.567 23.752 161.567 29.464C161.567 35.12 157.759 38.424 150.479 38.424H135.471V55H140.791V43.016H150.647C151.543 43.016 152.383 42.96 153.223 42.904L161.735 55H167.615L158.263 41.784ZM181.144 37.36H208.64V32.824H181.144V37.36ZM181.144 20.224H208.64V15.576H181.144V20.224ZM181.144 50.352H208.64V55H181.144V50.352ZM235.012 55.448C245.26 55.448 250.076 50.296 250.076 44.36C250.076 29.968 226.276 36.072 226.276 26.328C226.276 22.8 229.188 19.944 235.908 19.944C239.38 19.944 243.3 20.952 246.716 23.136L248.452 18.88C245.204 16.64 240.5 15.352 235.964 15.352C225.66 15.352 221.012 20.504 221.012 26.496C221.012 41.056 244.812 34.896 244.812 44.696C244.812 48.168 241.844 50.856 235.012 50.856C229.972 50.856 224.988 48.952 222.076 46.32L220.06 50.464C223.14 53.432 229.02 55.448 235.012 55.448ZM275.968 55V20.448H289.464V15.8H257.152V20.448H270.648V55H275.968Z"
              fill="inherit"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-dark text-center dark:text-gray-200 md:text-3xl mb-0">
          Incrementally adoptable type-safety for your new and existing APIs
        </h1>
      </div>

      <div className="mt-6">
        <QuickstartButton />
      </div>

      <div className="mt-12">
        <div className="md:hidden">
          <Code />
        </div>
        <div className="hidden md:block">
          <CodeVideo />
        </div>
      </div>

      <div className="mt-24">
        <HomepageFeatures />
      </div>

      <div className="mt-24 container mx-auto">
        <div className=" bg-purple-100/40 dark:bg-purple-700/5 p-5 border-solid border-0 border-l-4 border-purple-600 dark:border-purple-700/80">
          <h3>Quick Dip</h3>

          <p>
            ts-rest was designed for and by TS-first teams who want to improve
            the stability and safety without a large investment into a new
            solution/tech (such as GraphQL), and need a simple, safe API with a
            focus on DX and adoption speed.
          </p>

          <ul>
            <li>
              A{' '}
              <a
                href="https://bundlephobia.com/package/@ts-rest/core"
                target="blank"
                rel="noopener noreferrer"
              >
                seriously tiny
              </a>{' '}
              type-safe wrapper around existing, battle-tested, established tech
            </li>
            <li>
              An incrementally adoptable tool, for TS-first teams who care about
              stability + safety
            </li>
            <li>
              No opinionated API structure, should be compatible with your
              existing structures
            </li>
          </ul>
        </div>
      </div>

      <div className="container mt-24">
        <h4 className="text-primary">Don't just take our word for it</h4>
        <h1 className="">Give it a go</h1>
        <p>
          We've made a basic Stackblitz demo using a contract with Zod, client,
          and server - try and follow through the instructions to learn how
          ts-rest works!
        </p>
        <iframe
          className="w-full h-[40rem]"
          src="https://stackblitz.com/edit/typescript-x7pinn?embed=1&file=index.ts&view=editor"
        />
      </div>

      <div className="container mt-24">
        <h4 className="text-primary">We've got you covered.</h4>
        <h1 className="">Explore ts-rest's Ecosystem</h1>
        <p>
          One of the core values of ts-rest, is to be as unobtrusive as possible
          to your existing tech stack, as such, we've started making official
          first party integrations for your favourite clients
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4  gap-6">
          {[
            {
              name: '@ts-rest/core',
              description:
                'The core package for ts-rest, define contracts and fetch client',
              image: logo,
            },
            {
              name: '@ts-rest/react-query',
              description: '@tanstack/react-query integration',
              image: react,
            },
            {
              name: '@ts-rest/solid-query',
              description: '@tanstack/solid-query integration',
              image: solidJs,
            },
            {
              name: '@ts-rest/express',
              description: 'Express integration',
              image: express,
            },
            {
              name: '@ts-rest/next',
              description:
                'Next.js integration for full stack, simple, type safety',
              image: vercel,
              classNames: 'dark:invert',
            },
            {
              name: '@ts-rest/nest',
              description: 'Nest.js integration',
              image: nest,
            },
            {
              name: '@ts-rest/fastify',
              description: 'Fastify integration 🆕',
              image: fastify,
            },
            {
              name: '@ts-rest/koa',
              description: 'Koa integration 🆕',
              image: koa,
            },
            {
              name: '@ts-rest/open-api',
              description:
                'Ability to generate OpenAPI schemas on the fly with your server deployments',
              image: openApi,
            },
          ].map((item) => (
            <a
              key={item.name}
              href={`https://npmjs.com/package/${item.name}`}
              target={'_blank'}
              className="no-underline"
            >
              <div
                className="outline rounded-md p-4 outline-gray-600/20 hover:outline-2 hover:outline-purple-600
            /30 transition-all cursor-pointer h-full"
              >
                <img
                  height={45}
                  width={45}
                  className={'m-2 object-contain ' + item.classNames}
                  src={item.image}
                ></img>
                <h4>{item.name}</h4>
                <small className="dark:text-white text-black">
                  {item.description}
                </small>
              </div>
            </a>
          ))}
          <div className="rounded-md p-4  opacity-70 bg-gray-200/50 dark:bg-gray-900/50 h-full">
            <img
              height={45}
              width={45}
              className="m-2 object-contain"
              src={logo}
            ></img>
            <h4>Something Missing?</h4>
            <small className="dark:text-white text-black">
              Please add an issue to{' '}
              <a href="https://github.com/ts-rest/ts-rest" target="_blank">
                GitHub
              </a>{' '}
              or consider contributing!
            </small>
          </div>
        </div>
      </div>

      <div className="my-12">
        <QuickstartButton />
      </div>
    </Layout>
  );
}
