import WhiteboardCanvas from './components/whiteboardCanvas';
import Login from './components/auth/login';
import './App.css'
import Signup from './components/auth/signup';
import { AuthProvider } from './hook/authContext';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen w-full bg-white text-gray-900">
        <div className="relative flex min-h-screen flex-col items-start justify-start gap-6 p-6 md:p-10">
          <div className="absolute inset-0 z-0 opacity-30">
            <WhiteboardCanvas />
          </div>

          <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <Login />
          </div>

          <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <Signup />
          </div>
        </div>
      </div>
    </AuthProvider>
  )
}

export default App
