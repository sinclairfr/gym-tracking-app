# GYM TRACKER

Fausse app mobile pour tracker tes séries de gym.
Marker virtuel organique, tally marks, semaine L M M V S D.

## Stack

- React 18
- js-cookie (persistence)
- Canvas API (drawing engine)
- Pas de dépendances UI — tout custom

## Run local

```bash
npm install
npm start
```

## Build

```bash
npm run build
```

## Deploy sur GitHub Pages

```bash
npm install -g gh-pages
```

Ajoute dans `package.json` :
```json
"homepage": "https://<ton-username>.github.io/gym-tracker"
```

Et dans `scripts` :
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d build"
```

Puis :
```bash
npm run deploy
```

## Deploy sur Vercel / Netlify

Pointe directement sur le repo GitHub, build command = `npm run build`, publish dir = `build`.

## Encapsuler en app mobile (PWA → Capacitor)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "GymTracker" "com.medo.gymtracker"
npm run build
npx cap add ios  # ou android
npx cap copy
npx cap open ios  # ouvre Xcode
```

## Cookies

- `gym_strokes` — tally marks par exercice (365j)
- `gym_week` — jours cochés de la semaine
- `gym_ink` — dernière couleur d'encre
- `gym_week_stamp` — semaine ISO courante (auto-reset le lundi)

Les données se réinitialisent automatiquement chaque lundi.
