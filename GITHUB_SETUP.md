# GitHub Setup Guide

## 🚨 CRITICAL: Files to NEVER Commit

**NEVER add these files to GitHub (they contain sensitive information):**
- `.env.local` - Contains your Spotify API credentials
- `.env` - Any environment files
- `error-log.txt` - Contains error logs
- Any files with API keys, secrets, or tokens

## ✅ Files to ADD to GitHub

### Core Application Files
```
├── pages/
│   ├── api/
│   │   ├── create-playlists.ts
│   │   ├── fast-recommendations.ts
│   │   ├── spotify-auth.ts
│   │   ├── spotify-callback.ts
│   │   ├── check-spotify-auth.ts
│   │   ├── test-spotify-config.ts
│   │   └── error-log.ts
│   ├── _app.tsx
│   └── index.tsx
├── components/
│   └── ui/
├── lib/
│   └── utils.ts
├── styles/
│   ├── globals.css
│   └── Home.module.css
├── public/
├── types.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── components.json
├── vercel.json
├── README.md
└── .gitignore
```

### Configuration Files (Safe to Commit)
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `next.config.js` - Next.js config
- `tailwind.config.js` - Tailwind CSS config
- `components.json` - UI components config

## 🤔 Optional: Large Data Files

**You can choose whether to include these:**

### Option 1: Include Data Files (Larger repo, but complete)
```
data-pipeline/
├── tracks_database.json
├── optimized_tracks.csv
└── exports/ (all CSV files)
```

### Option 2: Exclude Data Files (Smaller repo, users generate their own)
- Exclude `data-pipeline/` folder
- Users would need to run the data pipeline scripts themselves

## 📝 Recommended: Add a README

Create a comprehensive README.md that explains:
1. How to set up the project
2. How to get Spotify API credentials
3. How to run the data pipeline (if excluding data files)
4. How to use the application

## 🔧 Setup Instructions for Others

If someone clones your repo, they'll need to:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Spotify API:**
   - Create a Spotify app at https://developer.spotify.com/dashboard
   - Get Client ID and Client Secret
   - Create `.env.local` file:
   ```
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```

3. **Run the application:**
   ```bash
   npm run dev
   ```

## 🎯 Recommended Approach

**For a public GitHub repo, I recommend:**
- ✅ Include all code files
- ✅ Include configuration files
- ✅ Include a comprehensive README
- ❌ Exclude `.env.local` and other sensitive files
- 🤔 Exclude large data files (let users generate their own)

This keeps your repo clean, secure, and educational while allowing others to set up and run the project themselves.
