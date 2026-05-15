import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'swr-login',
  description: 'Plugin-as-Hook React authentication state management',
  lang: 'en-US',

  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],

  // Domain: swr-login.dev
  // base: '/',

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'swr-login',

    nav: [
      { text: 'Guide', link: '/getting-started/' },
      { text: 'API', link: '/api/' },
      { text: 'Cookbook', link: '/cookbook/' },
      { text: 'Migration', link: '/migration/' },
      { text: 'v0.9.0-alpha.0', link: 'https://github.com/tobytovi/swr-login/releases' },
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started/' },
            { text: 'Quick Start', link: '/getting-started/quick-start' },
            { text: 'Installation', link: '/getting-started/installation' },
          ],
        },
      ],
      '/concepts/': [
        {
          text: 'Concepts',
          items: [
            { text: 'Plugin-as-Hook', link: '/concepts/' },
            { text: 'Method Registry', link: '/concepts/method-registry' },
            { text: 'Credential', link: '/concepts/credential' },
            { text: 'Session Store', link: '/concepts/session-store' },
            { text: 'Events', link: '/concepts/events' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'AuthHookRegistry', link: '/api/auth-hook-registry' },
            { text: 'useSession', link: '/api/use-session' },
            { text: 'useLoginMethod', link: '/api/use-login-method' },
            { text: 'useLoginMethods', link: '/api/use-login-methods' },
            { text: 'useAuthInternal', link: '/api/use-auth-internal' },
            { text: 'useSessionEvent', link: '/api/use-session-event' },
            { text: 'useLogout', link: '/api/use-logout' },
            { text: 'useCredential', link: '/api/use-credential' },
            { text: 'LoginMethod', link: '/api/login-method' },
            { text: 'LoginRejection', link: '/api/login-rejection' },
            { text: 'Credential', link: '/api/credential' },
          ],
        },
      ],
      '/cookbook/': [
        {
          text: 'Cookbook',
          items: [
            { text: 'Overview', link: '/cookbook/' },
            { text: 'OAuth Redirect Flow', link: '/cookbook/oauth-redirect' },
            { text: 'useSessionEvent', link: '/cookbook/session-event' },
            { text: '401 Interceptor', link: '/cookbook/401-interceptor' },
            { text: 'Redirect-type Method', link: '/cookbook/redirect-method' },
            { text: 'Coexist with non-swr-login', link: '/cookbook/coexist' },
            { text: 'Multi-step Method', link: '/cookbook/multi-step' },
          ],
        },
      ],
      '/method-author-guide/': [
        {
          text: 'Method Author Guide',
          items: [
            { text: 'Overview', link: '/method-author-guide/' },
            { text: 'Creating a Method', link: '/method-author-guide/creating' },
            { text: 'onRegistryMount', link: '/method-author-guide/on-registry-mount' },
            { text: 'React Compiler Compat', link: '/method-author-guide/react-compiler' },
            { text: 'Publishing', link: '/method-author-guide/publishing' },
            { text: 'Conformance Test', link: '/method-author-guide/conformance' },
          ],
        },
      ],
      '/migration/': [
        {
          text: 'Migration',
          items: [
            { text: 'v0.7 → v0.9', link: '/migration/' },
            { text: 'Concept Mapping', link: '/migration/concept-mapping' },
            { text: 'AUTH_KEY Migration', link: '/migration/auth-key' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/tobytovi/swr-login' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024–present swr-login Contributors',
    },

    search: {
      provider: 'local',
    },
  },
});
