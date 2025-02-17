import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest: {
        short_name: "Mercado Forte®", // Nome do seu novo projeto
        name: "Mercado Forte®", // Nome completo do projeto
        icons: [
          {
            src: "/images/cart.png", // Substitua pelo caminho do ícone do seu projeto
            sizes: "192x192",
            type: "image/png"
          }
        ],
        start_url: "/", // URL de início do PWA
        display: "standalone", // Exibição como app independente
        theme_color: "#ffffff", // Cor do tema
        background_color: "#ffffff" // Cor de fundo
      },
      registerType: 'auto',
      injectRegister: 'inline',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png']
    })
  ]
});
