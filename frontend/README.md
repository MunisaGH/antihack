# AI Recruiting Platform - Frontend

Zamonaviy AI Recruiting Platform uchun React frontend ilovasi.

## 🚀 Xususiyatlar

- **Zamonaviy Dizayn**: GitHub, Vercel, Linear va Stripe dizaynlariga asoslangan
- **Responsive**: Barcha qurilmalarda to'liq ishlaydi
- **Dark/Light Mode**: Qorong'i va yorug' rejimlar
- **JWT Authentication**: Xavfsiz autentifikatsiya
- **Real-time Validation**: Forma validatsiyasi
- **Toast Notifications**: Foydalanuvchi xabarnomalari

## 📋 Sahifalar

### Autentifikatsiya
- **Login**: Tizimga kirish sahifasi

### Dashboard
- **Dashboard**: Asosiy boshqaruv paneli
- **Statistikalar**: Kompaniya, vakansiya va ariza statistikasi
- **Tezkor Amallar**: Ko'p ishlatiladigan funksiyalar

### Kompaniyalar
- **Kompaniyalar Ro'yxati**: Barcha kompaniyalar
- **Yangi Kompaniya**: Kompaniya qo'shish
- **Kompaniyani Tahrirlash**: Mavjud kompaniyani o'zgartirish

### Vakansiyalar
- **Vakansiyalar Ro'yxati**: Barcha vakansiyalar
- **Yangi Vakansiya**: Vakansiya yaratish
- **Vakansiyani Tahrirlash**: Mavjud vakansiyani o'zgartirish
- **Havola Generator**: Vakansiya uchun noyob havola

## 🛠 Texnologiyalar

- **React 18** - Asosiy framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## 🎨 Dizayn

- **Ranglar**: Ko'k gradientlar (#3B82F6 to #1E40AF)
- **Typography**: Inter font oilasi
- **Animatsiyalar**: Smooth transitions va hover effects
- **Shadows**: Zamonaviy soyalar
- **Components**: Modern cards, buttons, forms

## 🚀 O'rnatish

```bash
# Paketlarni o'rnatish
npm install

# Development serverini ishga tushirish
npm run dev

# Production build
npm run build

# Build preview
npm run preview
```

## 🔧 Konfiguratsiya

API endpoint manzilini o'zgartirish uchun `src/utils/api.js` faylida `API_BASE_URL` ni o'zgartiring:

```javascript
const API_BASE_URL = 'http://localhost:8000/api';
```

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🎯 API Endpoints

- `POST /api/auth/login/` - Tizimga kirish
- `GET /api/dashboard/` - Dashboard statistikasi
- `GET/POST /api/companies/` - Kompaniyalar
- `GET/POST /api/vacancies/` - Vakansiyalar
- `GET /api/applications/` - Arizalar

## 🔐 Autentifikatsiya

JWT token asosida ishlaydi. Token localStorage da saqlanadi va har bir API so'rovida avtomatik qo'shiladi.

## 📦 Struktura

```
src/
├── components/
│   ├── layout/          # Layout komponentlari
│   └── ui/             # UI komponentlari
├── pages/              # Sahifalar
│   ├── auth/           # Autentifikatsiya
│   ├── dashboard/      # Dashboard
│   ├── companies/      # Kompaniyalar
│   └── vacancies/      # Vakansiyalar
├── utils/              # Utility funksiyalar
│   ├── api.js          # API xizmatlari
│   └── auth.js         # Autentifikatsiya
└── index.css           # Global stillar
```

## 🎨 Komponentlar

### UI Komponentlar
- **Button**: Turli xil variantlar va o'lchamlar
- **Input**: Form inputlari
- **Card**: Zamonaviy kartalar
- **Badge**: Status va label komponentlari

### Layout Komponentlar
- **DashboardLayout**: Asosiy layout
- **Sidebar**: Navigatsiya paneli
- **Header**: Yuqori panel

## 🔄 State Management

React hooks va localStorage yordamida state boshqariladi:
- **useState**: Local state
- **useEffect**: Side effects
- **localStorage**: Persistence

## 🎯 Keyingi Qadamlar

- [ ] Dark mode toggle
- [ ] Arizalar sahifasi
- [ ] Foydalanuvchi profili
- [ ] Sozlamalar sahifasi
- [ ] Export/Import funksiyalari
- [ ] Real-time notifications
- [ ] Advanced filtering
- [ ] Analytics dashboard

## 📄 License

MIT License
