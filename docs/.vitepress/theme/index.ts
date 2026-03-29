import Theme from 'vitepress/theme';
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client';
import '@shikijs/vitepress-twoslash/style.css';
import 'virtual:group-icons.css';
import './custom.css';

export default {
  extends: Theme,
  enhanceApp({ app }: { app: { use: (plugin: unknown) => void } }) {
    app.use(TwoslashFloatingVue);
  },
};
