export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-6xl">
          Comienza tu nuevo proyecto
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
          Esta es tu página de inicio. Puedes empezar a editarla en{' '}
          <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm dark:bg-gray-800">
            src/app/page.tsx
          </code>
        </p>
      </div>
    </main>
  );
}
