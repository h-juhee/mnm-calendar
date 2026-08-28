import CustomerApp from './apps/CustomerApp';
import InternalApp from './apps/InternalApp';
import LegalPage from './components/LegalPage';

const appMode = import.meta.env.VITE_APP_MODE === 'customer' ? 'customer' : 'internal';

function App() {
  if (window.location.pathname === '/privacy') return <LegalPage type="privacy" />;
  if (window.location.pathname === '/terms') return <LegalPage type="terms" />;
  return appMode === 'customer' ? <CustomerApp /> : <InternalApp />;
}

export default App;
