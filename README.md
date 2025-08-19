# 🎵 Music Discovery App

[![Next.js](https://img.shields.io/badge/Next.js-13-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Spotify API](https://img.shields.io/badge/Spotify_API-1.0-1DB954?style=flat-square&logo=spotify)](https://developer.spotify.com/)

A powerful AI-powered music discovery application that helps you find your next favorite songs and create personalized Spotify playlists. Built with Next.js, TypeScript, and integrated with Spotify's API for seamless playlist creation.

![Music Discovery App](https://img.shields.io/badge/Music_Discovery-120,000%2B_Tracks-1DB954?style=for-the-badge)

## ✨ Features

### 🎯 **AI-Powered Music Discovery**
- **120,000+ high-quality tracks** in the database
- **Semantic search** based on genres, moods, artists, and descriptions
- **Smart filtering** by popularity and genre quality
- **Real-time recommendations** as you type

### 🎵 **Spotify Integration**
- **Seamless authentication** with Spotify OAuth
- **Automatic playlist creation** with 25 and 100-track options
- **Direct links** to created playlists on Spotify
- **User-friendly interface** with authentication status

### 🚀 **Performance Optimized**
- **Lightning-fast search** using optimized JSON database
- **No external API calls** for recommendations (reduces latency)
- **Efficient data structure** for instant results
- **Responsive design** for all devices

### 🎨 **Modern UI/UX**
- **Beautiful gradient design** with purple/pink theme
- **Interactive track cards** with album artwork
- **Modal details** for each track
- **Loading animations** and smooth transitions
- **Error handling** with user-friendly messages

## 📊 **Database Statistics**

- **Total Tracks**: 120,000+
- **Genres**: 50+ different genres
- **Popularity Range**: 0-100 (filtered for quality)
- **Data Sources**: Multiple high-quality CSV exports
- **Search Speed**: Near-instant results

## 🛠 **Tech Stack**

### **Frontend**
- **Next.js 13** - React framework with API routes
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Hooks** - State management
- **React Modal** - Interactive components

### **Backend**
- **Next.js API Routes** - Serverless functions
- **Spotify Web API** - Music data and playlist creation
- **JSON Database** - Fast in-memory search
- **Cookie-based Auth** - Secure session management

### **Data Pipeline**
- **Python** - Data processing and cleaning
- **Pandas** - CSV manipulation and analysis
- **JSON Export** - Optimized data structure
- **Deduplication** - Clean, unique dataset

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Spotify Developer Account

### **1. Clone the Repository**
```bash
git clone https://github.com/yourusername/music-discovery-app.git
cd music-discovery-app
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Set Up Spotify API**
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://127.0.0.1:3000/api/spotify-callback`
4. Copy your Client ID and Client Secret

### **4. Configure Environment Variables**
Create a `.env.local` file in the root directory:
```env
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

### **5. Run the Application**
```bash
npm run dev
```

Visit `http://localhost:3000` to start discovering music!

## 🎯 **How to Use**

### **1. Discover Music**
- Enter a genre, mood, or artist in the search field
- Add your favorite songs for personalized recommendations
- Optionally exclude certain artists
- Click "Discover Music" to get recommendations

### **2. Connect to Spotify**
- Click "Connect to Spotify" to authorize the app
- Grant permissions for playlist creation
- Your authentication status will be displayed

### **3. Create Playlists**
- Generate music recommendations first
- Click "Generate Playlists on Spotify"
- Choose to create 25-track and 100-track playlists
- Get direct links to your new playlists

## 📁 **Project Structure**

```
├── pages/
│   ├── api/                    # API routes
│   │   ├── create-playlists.ts # Spotify playlist creation
│   │   ├── fast-recommendations.ts # Music search
│   │   ├── spotify-auth.ts     # OAuth authentication
│   │   └── spotify-callback.ts # OAuth callback
│   ├── _app.tsx               # App wrapper
│   └── index.tsx              # Main page
├── components/
│   └── ui/                    # Reusable UI components
├── data-pipeline/
│   ├── exports/               # CSV data files
│   ├── tracks_database.json   # Optimized database
│   └── *.py                   # Data processing scripts
├── styles/
│   └── globals.css            # Global styles
└── types.ts                   # TypeScript definitions
```

## 🔧 **Data Pipeline**

The application includes a comprehensive data pipeline for processing and optimizing music data:

### **Data Sources**
- Multiple CSV exports with track information
- Spotify track metadata
- Genre and popularity data

### **Processing Steps**
1. **Combine** all CSV files from exports directory
2. **Deduplicate** tracks based on Spotify IDs
3. **Filter** for quality (popularity, genre presence)
4. **Optimize** for fast JSON-based search
5. **Export** to `tracks_database.json`

### **Running the Pipeline**
```bash
cd data-pipeline
python create_fast_csv_database.py
```

## 🎨 **Customization**

### **Styling**
- Modify `tailwind.config.js` for theme changes
- Update `styles/globals.css` for custom styles
- Edit component styles in `components/ui/`

### **Data**
- Add new CSV files to `data-pipeline/exports/`
- Run the data pipeline to update the database
- Customize filtering criteria in processing scripts

### **Features**
- Extend API routes in `pages/api/`
- Add new UI components in `components/`
- Modify search logic in `fast-recommendations.ts`

## 🐛 **Troubleshooting**

### **Common Issues**

**Spotify Authentication Fails**
- Check your `.env.local` file has correct credentials
- Verify redirect URI matches your Spotify app settings
- Clear browser cookies and try again

**No Recommendations Generated**
- Ensure `tracks_database.json` exists in `data-pipeline/`
- Check the search query isn't too specific
- Verify the data pipeline has been run

**Playlist Creation Fails**
- Check Spotify API rate limits
- Verify user is properly authenticated
- Check browser console for error details

### **Debug Mode**
Enable detailed logging by checking the browser console (F12) for:
- Authentication status
- API response details
- Error messages

## 🤝 **Contributing**

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Setup**
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Spotify** for their excellent API and music data
- **Next.js** team for the amazing framework
- **Tailwind CSS** for the utility-first styling
- **The open-source community** for inspiration and tools

## 📞 **Support**

If you encounter any issues or have questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review the browser console for error messages
3. Open an issue on GitHub with detailed information
4. Check the [Spotify API documentation](https://developer.spotify.com/documentation)

---

**Happy Music Discovery!** 🎵✨

*Built with ❤️ using Next.js, TypeScript, and the Spotify API*

