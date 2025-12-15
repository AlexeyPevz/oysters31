import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oysters · премиальная доставка",
    short_name: "Oysters",
    description: "Свежие устрицы, крабы и деликатесы с доставкой день-в-день по Москве и Подмосковью.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#050505",
    theme_color: "#050505",
    lang: "ru",
    orientation: "portrait",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      {
        src: "/images/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/images/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/images/logo.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "apple-touch-icon",
      },
    ],
    shortcuts: [
      {
        name: "Каталог",
        description: "Открыть мобильный каталог деликатесов",
        url: "/catalog",
      },
      {
        name: "Быстрый заказ",
        description: "Создать заказ в один клик",
        url: "/cart",
      },
    ],
    prefer_related_applications: false,
  }
}