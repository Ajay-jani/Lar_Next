# Dev Utilities Hub

A comprehensive collection of developer utilities built with Next.js, React, and Tailwind CSS. This project provides essential tools for developers including code debugging, text processing, content improvement, and design utilities.

## 🚀 Features

- **Code Debugger**: Analyze JavaScript/TypeScript code for potential issues and improvements
- **Text Summarizer**: Generate concise summaries from long text content
- **Content Improver**: Enhance writing with grammar corrections and clarity improvements
- **Hash Generator**: Generate MD5, SHA1, and SHA256 cryptographic hashes
- **Color Palette Generator**: Create beautiful color schemes using color theory principles

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Next.js built-in bundler

## 📦 Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd dev-utilities-hub
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── utilities/         # Individual utility pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/
│   ├── ui/               # Reusable UI components
│   └── features/         # Feature-specific components
├── lib/
│   └── utilities/        # Utility logic and registry
└── types/                # TypeScript type definitions
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

## ➕ Adding New Utilities

This project is designed to be easily extensible. To add a new utility:

1. **Read the Guide**: Check `NEW_UTILITY_GUIDE.md` for detailed instructions
2. **Create Utility Logic**: Add your core logic in `src/lib/utilities/`
3. **Build Components**: Create React components in `src/components/features/utilities/`
4. **Add Route**: Create a new page in `src/app/utilities/`
5. **Register Utility**: Update `src/lib/utilities/registry.ts`

## 🎨 Design System

The project uses a consistent design system built with Tailwind CSS:

- **Colors**: Blue primary, semantic colors for different states
- **Typography**: Inter font family with consistent sizing
- **Components**: Reusable UI components in `src/components/ui/`
- **Layout**: Responsive grid system with mobile-first approach

## 📱 Responsive Design

All utilities are fully responsive and work seamlessly across:

- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🔒 Security

- Client-side processing for sensitive data
- No data storage or external API calls for core utilities
- Secure hash generation implementations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-utility`
3. Follow the utility creation guide in `NEW_UTILITY_GUIDE.md`
4. Commit your changes: `git commit -am 'Add new utility'`
5. Push to the branch: `git push origin feature/new-utility`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- Inspired by developer productivity tools
