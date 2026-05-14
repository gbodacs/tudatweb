# Tudatai - TudatAI Weboldal

Ez a projekt az TudatAI vállalati weboldalának TypeScript Node.js implementációja Express.js és EJS template engine használatával.

## Telepítés

1. Klónozd a repository-t
2. Futtasd `npm install` a függőségek telepítéséhez
3. Hozz létre egy `.env` fájlt az `.env.example` alapján

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

A szerver alapértelmezett portja: 8080

## Környezeti változók

Az AI proxy futásához ezek a változók szükségesek a `.env` fájlban:

```env
OPENAI_MODEL=openai.gpt-oss-120b
OPENAI_BASE_URL=https://bedrock-mantle.eu-central-1.api.aws/v1
OPENAI_API_KEY=...
```

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
- OpenAI-kompatibilis backend chat proxy a `POST /chatapi/tudatai` endpointon
- Streamelt chat valaszok OpenAI-kompatibilis SSE formatumban
- Közös header és footer komponensek (egyszerű módosíthatóság)
- Statikus CSS szolgálás
- Reszponzív design

## teszt

```bash
curl -X POST http://127.0.0.1:8080/chatapi/tudatai \
  -H "Content-Type: application/json" \
  -d '{"text":"yxyxyx"}'

curl -N -X POST http://127.0.0.1:8080/chatapi/tudatai \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"yxyxyx"}],"stream":true}'
```
