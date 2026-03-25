import express from 'express';
import path from 'path';

const app = express();
const port = 3000;

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'TudatAI - Professzionális vállalati weboldal', currentPath: req.path });
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'About - TudatAI', currentPath: req.path });
});

app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact - TudatAI', currentPath: req.path });
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