# Oysters Platform

Платформа для продажи устриц и морепродуктов с системой поставок и предзаказов.

## Технологии

- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: MySQL 8.0
- **Authentication**: NextAuth.js
- **Deployment**: PM2, Nginx

## Основные функции

- 🦪 Каталог продуктов с фильтрацией
- 📦 Система поставок с таймером
- 🛒 Корзина для предзаказов
- 📊 Админ-панель с аналитикой
- 👥 Управление пользователями
- 📧 Email/SMS уведомления

## Установка

### Требования

- Node.js 18+
- MySQL 8.0
- npm или yarn

### Локальная разработка

```bash
# Клонировать репозиторий
git clone <repository-url>
cd oysters31.ru

# Установить зависимости
npm install

# Настроить переменные окружения
cp .env.example .env.local
# Отредактировать .env.local с вашими настройками

# Настроить базу данных
npx prisma generate
npx prisma db push

# Запустить dev сервер
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

## Переменные окружения

Создайте `.env.local` файл:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/oysters"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Email (опционально)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-password"

# SMS (опционально)
SMS_API_KEY="your-sms-api-key"
```

## Структура проекта

```
oysters31.ru/
├── prisma/              # Database schema
├── public/              # Static files
├── src/
│   ├── app/            # Next.js 14 app directory
│   │   ├── admin/      # Admin panel
│   │   ├── api/        # API routes
│   │   └── catalog/    # Product catalog
│   ├── components/     # React components
│   ├── lib/            # Utilities & services
│   └── styles/         # Global styles
├── .env.local          # Local environment variables
└── package.json
```

## Скрипты

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:push      # Push schema to database
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database

# Code quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript check
```

## Production Deployment

### С PM2

```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name oysters -- run start
pm2 save
pm2 startup
```

### С Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Основные модули

### Система поставок
- Создание поставок с датой прибытия
- Таймер обратного отсчета
- Управление доступным количеством
- Резервирование товаров

### Предзаказы (Waitlist)
- Корзина с несколькими товарами
- Выбор даты и времени доставки
- Расчет общей суммы
- Контактная информация

### Аналитика
- Метрики по поставкам
- Статистика предзаказов
- Отслеживание посетителей
- Потенциальная выручка

### Админ-панель
- Управление товарами
- Управление поставками
- Просмотр предзаказов
- Управление пользователями
- Дашборд с аналитикой

## API Endpoints

### Public
- `GET /api/supplies/active` - Активная поставка
- `POST /api/supplies/[id]/waitlist` - Добавить в предзаказ
- `POST /api/analytics/track` - Трекинг посещений

### Admin (требуется авторизация)
- `GET /api/admin/analytics/dashboard` - Дашборд метрики
- `GET /api/admin/supplies` - Список поставок
- `POST /api/admin/supplies` - Создать поставку
- `GET /api/admin/waitlist` - Список предзаказов

## Лицензия

Proprietary - Все права защищены

## Контакты

Для вопросов и поддержки: support@oysters31.ru
