import { Link, useLocation } from 'react-router-dom';
import { Zap, Home, ArrowLeft } from 'lucide-react';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div>
          <div className="text-7xl font-bold font-mono text-primary/20 mb-2">404</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Page introuvable</h2>
          <p className="text-sm text-muted-foreground">
            La page <span className="font-mono text-foreground">/{pageName}</span> n'existe pas dans Ghost Trader.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <Link to="/"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
            <Home className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}