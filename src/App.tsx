import CustomerApp from './apps/CustomerApp';
import InternalApp from './apps/InternalApp';

const appMode = import.meta.env.VITE_APP_MODE === 'customer' ? 'customer' : 'internal';

function App() {
  return appMode === 'customer' ? <CustomerApp /> : <InternalApp />;
}

export default App;
