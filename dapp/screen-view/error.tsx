export default function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-red-600">
      <h1 className="text-2xl font-bold">Error</h1>
      <p>{message}</p>
    </div>
  );
} 