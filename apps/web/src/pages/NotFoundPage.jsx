import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home, Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 shadow-2xl">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">404</h1>
      <h2 className="text-base font-semibold text-zinc-300 mb-2">Page Not Found</h2>
      <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
        The route or channel you are searching for does not exist or has been relocated.
      </p>
      <Link to="/">
        <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
          Back to Safety
        </Button>
      </Link>
    </div>
  );
}
