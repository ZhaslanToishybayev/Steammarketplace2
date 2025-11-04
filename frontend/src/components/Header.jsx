import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Wallet, List } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-dark-800/80 backdrop-blur-lg border-b border-dark-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              CS2 Marketplace
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/marketplace" className="text-dark-300 hover:text-white transition-colors">
              Marketplace
            </Link>
            <Link to="/my-listings" className="text-dark-300 hover:text-white transition-colors">
              My Listings
            </Link>
          </div>

          {/* User Menu */}
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-4">
              {/* Balance */}
              <div className="hidden sm:flex items-center space-x-2 bg-dark-700 px-3 py-1.5 rounded-lg">
                <Wallet className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-medium">
                  ${user.wallet?.balance?.toFixed(2) || '0.00'}
                </span>
              </div>

              {/* User Profile */}
              <div className="relative group">
                <button className="flex items-center space-x-2 bg-dark-700 hover:bg-dark-600 px-3 py-2 rounded-lg transition-colors">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
                  ) : (
                    <User className="w-8 h-8 text-dark-300" />
                  )}
                  <span className="hidden sm:block text-sm font-medium">{user.username}</span>
                </button>

                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-2">
                    <Link to="/profile" className="flex items-center px-4 py-2 text-sm hover:bg-dark-700 transition-colors">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                    <Link to="/wallet" className="flex items-center px-4 py-2 text-sm hover:bg-dark-700 transition-colors">
                      <Wallet className="w-4 h-4 mr-2" />
                      Wallet
                    </Link>
                    <Link to="/my-listings" className="flex items-center px-4 py-2 text-sm hover:bg-dark-700 transition-colors">
                      <List className="w-4 h-4 mr-2" />
                      My Listings
                    </Link>
                    <hr className="my-2 border-dark-700" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm hover:bg-dark-700 transition-colors text-red-400"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
            >
              Login with Steam
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
