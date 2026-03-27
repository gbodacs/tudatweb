import express from 'express';
import path from 'path';
import fs from 'fs';
import validator from 'validator';

const app = express();
const port = 8080;

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// SEO helpers
const defaultKeywords = 'AI, mesterséges intelligencia, offline AI, felhős AI, automatizálás, prediktív analitika';
const defaultImage = '/images/og-image.png';

function renderSEO(
  res: express.Response,
  view: string,
  title: string,
  description: string,
  currentPath: string,
  extra: Record<string, unknown> = {}
) {
  res.render(view, {
    title,
    description,
    keywords: defaultKeywords,
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    ogUrl: `https://tudatai.hu${currentPath}`,
    ogImage: defaultImage,
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
  renderSEO(res, 'index', 'TudatAI - Offline és felhős AI megoldások', 'TudatAI: Skálázható, biztonságos offline és felhős AI megoldások vállalatoknak.', req.path);
});

app.get('/about', (req, res) => {
  renderSEO(res, 'about', 'Rólunk - TudatAI', 'Ismerje meg a TudatAI csapatát, küldetését és szakértői AI szolgáltatásait.', req.path);
});

app.get('/contact', (req, res) => {
  const success = req.query.success === '1';
  const error = req.query.error;
  renderSEO(res, 'contact', 'Kapcsolat - TudatAI', 'Lépjen kapcsolatba velünk: kérjen bemutatót vagy árajánlatot offline és felhős AI megoldásokra.', req.path, { success, error });
});

app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  // Validation
  if (!validator.isEmail(email)) {
    return renderSEO(res, 'contact', 'Kapcsolat - TudatAI', 'Lépjen kapcsolatba velünk: kérjen bemutatót vagy árajánlatot offline és felhős AI megoldásokra.', req.path, { success: false, error: 'Érvénytelen email cím.' });
  }
  if (message.length > 200) {
    return renderSEO(res, 'contact', 'Kapcsolat - TudatAI', 'Lépjen kapcsolatba velünk: kérjen bemutatót vagy árajánlatot offline és felhős AI megoldásokra.', req.path, { success: false, error: 'Az üzenet maximum 200 karakter lehet.' });
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
      return res.render('contact', { title: 'Contact - TudatAI', currentPath: req.path, success: false, error: 'Hiba történt az üzenet mentésekor.' });
    }
    res.redirect('/contact?success=1');
  });
});

app.get('/privacy', (req, res) => {
  renderSEO(res, 'privacy', 'Adatvédelmi irányelvek - TudatAI', 'Áttekintés az adatkezelési gyakorlatainkról a TudatAI rendszerben.', req.path);
});

app.get('/terms', (req, res) => {
  renderSEO(res, 'terms', 'ÁSZF - TudatAI', 'Általános szerződési feltételek az offline és felhős AI szolgáltatásainkhoz.', req.path);
});

app.get('/offline-ai', (req, res) => {
  renderSEO(res, 'offline-ai', 'Offline AI Megoldások - TudatAI', 'Biztonságos, internetkapcsolat nélküli AI rendszereinkkel teljes adatkontroll és magas rendelkezésre állás.', req.path);
});

app.get('/cloud-ai', (req, res) => {
  renderSEO(res, 'cloud-ai', 'Felhős AI Megoldások - TudatAI', 'Skálázható, felhőalapú AI megoldások és harmadik fél integrációk üzleti növekedéshez.', req.path);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});