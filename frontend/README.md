# Is School On? - The Gap, QLD

A modern, mobile-first web app to check if schools in The Gap, Queensland, Australia are open on a specific date.

## Features

- 🎨 Beautiful Australian-themed design with natural color palette
- 🎭 Playful animations using Framer Motion
- 📱 Mobile-first responsive design
- 🏫 Support for multiple schools in The Gap area
- 📅 Date picker with default to today
- ⚡ Fast and smooth user experience

## Tech Stack

- **React** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animation library
- **Lucide React** - Icon library

## Getting Started

### Prerequisites

- Node.js (v20.19.0 or higher recommended)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── LoadingAnimation.jsx    # Playful loading animation
│   │   └── SchoolResult.jsx        # Animated result display
│   ├── utils/
│   │   └── mockApi.js              # Mock API with delay simulation
│   ├── App.jsx                     # Main app component
│   ├── main.jsx                    # Entry point
│   └── index.css                   # Tailwind CSS imports
├── public/                         # Static assets
├── index.html                      # HTML template
└── package.json                    # Dependencies
```

## Schools Supported

- The Gap State High
- The Gap State School
- Hilder Road State School
- Payne Road State School

## Mock Data

Currently, the app uses mock data that simulates:
- Weekend detection (Saturday/Sunday)
- QLD Public Holidays (New Year's Day, Australia Day, Anzac Day, Queen's Birthday, Christmas Day, Boxing Day)
- Regular school days

The mock API includes a 1.5-second delay to demonstrate loading states.

## Design Theme

The app uses an Australian-inspired color palette:
- **Eucalyptus Green** - For positive/open states
- **Warm Sandstone** - Background accents
- **Muted Ocean Blue** - Primary UI elements
- **Sunshine Yellow** - Accent colors
- **Warm Red** - For closed/negative states

## License

MIT
