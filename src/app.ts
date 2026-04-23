import express from 'express';
import path from 'path';
import fs from 'fs';
import validator from 'validator';
import { createI18nContext, getLanguageCookieHeader } from './i18n';

const app = express();
const port = 8080;

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware for i18n
app.use((req: any, res: any, next: any) => {
  const i18n = createI18nContext(req);

  // Persist user language choice when it comes from query (?lang=...)
  const queryLang = typeof req.query?.lang === 'string' ? req.query.lang : undefined;
  if (queryLang && queryLang === i18n.language) {
    res.setHeader('Set-Cookie', getLanguageCookieHeader(i18n.language));
  }

  req.i18n = i18n;
  res.locals.i18n = i18n;
  res.locals.t = i18n.t;
  res.locals.language = i18n.language;
  res.locals.availableLanguages = i18n.availableLanguages;
  next();
});

function renderSEO(
  res: express.Response,
  view: string,
  req: any,
  titleKey: string,
  descriptionKey: string,
  currentPath: string,
  extra: Record<string, unknown> = {}
) {
  const t = (req as any).i18n.t;
  const title = t(titleKey);
  const description = t(descriptionKey);
  const language = (req as any).i18n.language;

  res.render(view, {
    title,
    description,
    keywords: t('home.metaDescription'),
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    ogUrl: `https://tudatai.hu${currentPath}`,
    ogImage: '/images/og-image.png',
    ogLocale: `${language}_${language.toUpperCase()}`,
    currentPath,
    ...extra,
  });
}

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, '../public')));

// Middleware for parsing form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  renderSEO(res, 'index', req, 'home.title', 'home.metaDescription', req.path);
});

app.get('/about', (req, res) => {
  renderSEO(res, 'about', req, 'about.title', 'about.metaDescription', req.path);
});

app.get('/contact', (req, res) => {
  const success = req.query.success === '1';
  const error = req.query.error;
  renderSEO(res, 'contact', req, 'contact.title', 'contact.metaDescription', req.path, { success, error });
});

app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  const t = (req as any).i18n.t;

  // Validation
  if (!validator.isEmail(email)) {
    return renderSEO(res, 'contact', req, 'contact.title', 'contact.metaDescription', req.path, { success: false, error: t('contact.invalidEmailError') });
  }
  if (message.length > 200) {
    return renderSEO(res, 'contact', req, 'contact.title', 'contact.metaDescription', req.path, { success: false, error: t('contact.messageTooLongError') });
  }

  // Sanitize inputs
  const sanitizedName = validator.escape(name);
  const sanitizedEmail = validator.escape(email);
  const sanitizedMessage = validator.escape(message);

  // Create filename with date and time
  const now = new Date();
  const filename = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.txt`;

  // Prepare content
  const content = `Dátum: ${now.toISOString()}\nNév: ${sanitizedName}\nEmail: ${sanitizedEmail}\nÜzenet: ${sanitizedMessage}\n`;

  // Save to file
  fs.writeFile(path.join(__dirname, '../public/aafAs5V5qdq4y3xa', filename), content, (err) => {
    if (err) {
      console.error('Error saving file:', err);
      return renderSEO(res, 'contact', req, 'contact.title', 'contact.metaDescription', req.path, { success: false, error: t('contact.saveError') });
    }
    res.redirect('/contact?success=1');
  });
});

app.get('/privacy', (req, res) => {
  renderSEO(res, 'privacy', req, 'privacy.title', 'privacy.title', req.path);
});

app.get('/cookiepolicy', (req, res) => {
  renderSEO(res, 'cookiepolicy', req, 'cookiepolicy.title', 'cookiepolicy.metaDescription', req.path);
});

app.get('/terms', (req, res) => {
  renderSEO(res, 'terms', req, 'terms.title', 'terms.title', req.path);
});

app.get('/automat-ai', (req, res) => {
  renderSEO(res, 'automat-ai', req, 'automatization.title', 'automatization.metaDescription', req.path);
});

app.get('/offline-ai', (req, res) => {
  renderSEO(res, 'offline-ai', req, 'offline.title', 'offline.metaDescription', req.path);
});

app.get('/cloud-ai', (req, res) => {
  renderSEO(res, 'cloud-ai', req, 'cloud.title', 'cloud.metaDescription', req.path);
});

app.get('/blog', (req, res) => {
  renderSEO(res, 'blog', req, 'blog.title', 'blog.metaDescription', req.path);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});