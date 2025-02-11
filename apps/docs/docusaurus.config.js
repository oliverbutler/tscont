const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/vsDark');

const vercelAttribution = `
  <div style="padding-top: 25px;">
    <a
      href="https://vercel.com/?utm_source=ts-rest&utm_campaign=oss"
      target="_blank"
      rel="noreferrer"
    >
      <img
        src="/img/powered-by-vercel.svg"
        alt="Powered by Vercel"
        style="height: 40px"
      />
    </a>
  </div>
`.trim();

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'ts-rest',
  tagline: 'Incrementally adoptable type-safety for your new and existing APIs',
  url: 'https://ts-rest.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'ts-rest', // Usually your GitHub org/user name.
  projectName: 'ts-rest', // Usually your repo name.
  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: [
          './libs/ts-rest/core',
          './libs/ts-rest/express',
          './libs/ts-rest/fastify',
          './libs/ts-rest/koa',
          './libs/ts-rest/nest',
          './libs/ts-rest/next',
          './libs/ts-rest/open-api',
          './libs/ts-rest/react-query',
          './libs/ts-rest/solid-query',
        ],
        entryPointStrategy: 'packages',
        sidebar: {
          fullNames: true,
        },
      },
    ],
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/ts-rest/ts-rest/blob/main/apps/docs',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/ts-rest/ts-rest',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        gtag: {
          trackingID: 'G-5HT1M8FM3Z',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      algolia: {
        appId: '2TFBRG9081',
        apiKey: '2f0471d89771f7e3cd3796164c0a6f09',
        indexName: 'ts-rest',
      },
      // announcementBar: {
      //   id: 'support_us',
      //   content:
      //     "We're making some big changes to our docs, please give us a ⭐️ and help out by <a target='_blank' rel='noopener noreferrer' href='https://github.com/ts-rest/ts-rest'>contributing</a>!",
      //   backgroundColor: '#007667',
      //   textColor: '#ffffff',
      //   isCloseable: false,
      // },
      colorMode: {
        respectPrefersColorScheme: true,
      },
      metadata: [
        {
          name: 'keywords',
          content: 'ts-rest, ts rest, typesafe, typescript, API, REST',
        },
      ],
      image: 'img/banner.jpg',
      navbar: {
        logo: {
          alt: 'ts-rest logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Docs',
          },
          {
            type: 'doc',
            docId: 'quickstart',
            position: 'left',
            label: 'Quickstart',
          },
          {
            href: 'https://github.com/ts-rest/ts-rest',
            className: 'header-social-link header-github-link',
            'aria-label': 'GitHub Repository',
            position: 'right',
          },
          {
            href: 'https://twitter.com/ts_rest',
            className: 'header-social-link header-twitter-link',
            'aria-label': 'Twitter',
            position: 'right',
          },
          {
            href: 'https://discord.com/invite/2Megk85k5a',
            className: 'header-social-link header-discord-link',
            'aria-label': 'Discord',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Introduction',
                to: '/docs/intro',
              },
              {
                label: 'Quickstart',
                to: '/docs/quickstart',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/ts-rest/ts-rest',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/_oliverbutler',
              },
              {
                label: 'Discord',
                href: 'https://discord.com/invite/2Megk85k5a',
              },
            ],
          },
          {
            title: 'Links',
            items: [
              {
                label: 'NPM @ts-rest/core',
                href: 'https://npmjs.com/package/@ts-rest/core',
              },
            ],
          },
        ],
        copyright: vercelAttribution,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
