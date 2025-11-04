import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Steam, Shield, Zap, Globe } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, fetchCurrentUser, login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're returning from Steam OAuth with a token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      localStorage.setItem('token', token);
      fetchCurrentUser().then(() => {
        navigate('/marketplace');
      });
    } else if (isAuthenticated) {
      navigate('/marketplace');
    }
  }, [isAuthenticated, fetchCurrentUser, navigate]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 to-purple-900/20" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white via-primary-200 to-primary-400 bg-clip-text text-transparent">
              Trade CS2 Skins
              <br />
              Instantly
            </h1>
            <p className="text-xl md:text-2xl text-dark-300 mb-8 max-w-2xl mx-auto">
              The fastest and most secure marketplace for CS2 skins.
              Buy, sell, and trade with confidence.
            </p>

            {!isAuthenticated && (
              <button
                onClick={login}
                className="inline-flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-2xl"
              >
                <Steam className="w-8 h-8" />
                <span className="text-xl">Login with Steam</span>
              </button>
            )}

            {isAuthenticated && (
              <button
                onClick={() => navigate('/marketplace')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-xl"
              >
                Go to Marketplace
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-800/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">
            Why Choose Our Marketplace?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Secure Trading</h3>
              <p className="text-dark-300">
                Escrow protection and verified transactions ensure your trades are always safe.
              </p>
            </div>

            <div className="card text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Instant Delivery</h3>
              <p className="text-dark-300">
                Automated Steam trade offers deliver your skins instantly after purchase.
              </p>
            </div>

            <div className="card text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Global Market</h3>
              <p className="text-dark-300">
                Access to thousands of listings from players around the world.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-primary-400 mb-2">10K+</div>
              <div className="text-dark-300">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-primary-400 mb-2">50K+</div>
              <div className="text-dark-300">Skins Listed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-primary-400 mb-2">$2M+</div>
              <div className="text-dark-300">Total Volume</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-primary-400 mb-2">99.9%</div>
              <div className="text-dark-300">Uptime</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
