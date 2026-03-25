import express from 'express';
import path from 'path';
import fs from 'fs';
import validator from 'validator';

const app = express();
const port = 3000;

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, '../public')));

// Middleware for parsing form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'TudatAI - Professzionális vállalati weboldal', currentPath: req.path });
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'About - TudatAI', currentPath: req.path });
});

app.get('/contact', (req, res) => {
  const success = req.query.success === '1';
  const error = req.query.error;
  res.render('contact', { title: 'Contact - TudatAI', currentPath: req.path, success, error });
});

app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  // Validation
  if (!validator.isEmail(email)) {
    return res.render('contact', { title: 'Contact - TudatAI', currentPath: req.path, success: false, error: 'Érvénytelen email cím.' });
  }
  if (message.length > 200) {
    return res.render('contact', { title: 'Contact - TudatAI', currentPath: req.path, success: false, error: 'Az üzenet maximum 200 karakter lehet.' });
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
  res.render('privacy', { title: 'Adatvédelmi irányelvek - TudatAI', currentPath: req.path });
});

app.get('/terms', (req, res) => {
  res.render('terms', { title: 'ÁSZF - TudatAI', currentPath: req.path });
});

app.get('/offline-ai', (req, res) => {
  res.render('offline-ai', { title: 'Offline AI Megoldások - TudatAI', currentPath: req.path });
});

app.get('/cloud-ai', (req, res) => {
  res.render('cloud-ai', { title: 'Cloud AI Megoldások - TudatAI', currentPath: req.path });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});