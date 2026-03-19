// Metadados extras para PWA em iOS (Add to Home Screen) e melhorias de compatibilidade.
export default function Head() {
  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Maph Pro 3D" />

      {/* Ajuda o iOS/Safari a tratar a cor do cabeçalho em modo "standalone" */}
      <meta name="theme-color" content="#06b6d4" />
    </>
  );
}

