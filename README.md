# TaskManager (Expo) – Mobile + Web

הפרויקט הזה בנוי על **Expo** ולכן יכול לרוץ:
- **במובייל** (Android/iOS)
- **בדפדפן** (Web)

## דרישות
- Node.js 18+

## הרצה מקומית
בתיקיית הפרויקט:

```bash
npm install
```

### מובייל

```bash
npm run start
```

לאחר מכן אפשר לבחור Android / iOS (או לסרוק QR עם Expo Go).

### Web (בדפדפן)

```bash
npm run web
```

## פריסה לאינטרנט (Hosting)
ה‑Web נבנה כאתר סטטי לתיקיית `dist/`.

### Build

```bash
npm run build:web
```

### בדיקה מקומית של ה‑build

```bash
npm run serve:web
```

### העלאה ל‑Vercel / Netlify / כל Static Hosting
- מעלים את התוכן של התיקייה **`dist/`**
- Build command: `npm run build:web`
- Output directory: `dist`

## Notes
- שכבת הדאטה משתמשת כרגע ב‑InMemory repository.
- אפשר להחליף `InMemoryTaskRepository` במימוש Supabase/DB לפי הצורך.
