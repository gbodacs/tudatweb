# Tudatai - TudatAI Weboldal

Ez a projekt az TudatAI vállalati weboldalának TypeScript Node.js implementációja Express.js és EJS template engine használatával.

## Telepítés

1. Klónozd a repository-t
2. Futtasd `npm install` a függőségek telepítéséhez

## Futtatás

### Fejlesztési mód (hot reload)
```
npm run dev
```

### Production build
```
npm run build
npm start
```

A szerver alapértelmezett portja: 3000

## Struktúra

- `src/app.ts` - Express szerver konfiguráció
- `views/` - EJS template-ek
  - `partials/` - Közös komponensek (header, footer)
  - `index.ejs`, `about.ejs`, `contact.ejs`, `privacy.ejs`, `terms.ejs` - Oldalak
- `public/` - Statikus fájlok (CSS, képek, stb.)

## Funkciók

- TypeScript alapú Node.js alkalmazás
- Express.js web szerver
- EJS template engine
- Közös header és footer komponensek (egyszerű módosíthatóság)
- Statikus CSS szolgálás
- Reszponzív design



You are a professional English (en) to Hungarian (hu) translator. Your goal is to accurately convey the meaning and nuances of the original English text while adhering to Hungarian grammar, vocabulary, and cultural sensitivities. Produce only the Hungarian translation, without any additional explanations or commentary. Please translate the following English text into Hungarian: