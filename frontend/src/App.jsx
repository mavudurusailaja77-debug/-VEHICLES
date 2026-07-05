import React, { useEffect, useState } from 'react';
import Showroom from './components/Showroom';
import VehicleDetail from './components/VehicleDetail';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import AuthModal from './components/AuthModal';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('showroom');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  
  const EXCHANGE_RATE = 83;
  const formatPrice = (usdAmount) => {
    if (usdAmount === undefined || usdAmount === null || isNaN(usdAmount)) return '';
    if (currency === 'INR') {
      return '₹' + Math.round(usdAmount * EXCHANGE_RATE).toLocaleString('en-IN');
    }
    return '$' + usdAmount.toLocaleString('en-US');
  };

  // Sync auth state with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const profile = {
            id: user.uid,
            username: userData.username || user.email.split('@')[0],
            email: user.email,
            role: userData.role || 'buyer',
            rating: userData.rating !== undefined ? userData.rating : 5.0
          };
          setCurrentUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        } else {
          const profile = {
            id: user.uid,
            username: user.email.split('@')[0],
            email: user.email,
            role: 'buyer',
            rating: 5.0
          };
          setCurrentUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem('user');
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to notifications in real-time from Firestore
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setNotifications(list);
    }, (err) => {
      console.error('Notifications fetch error:', err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        setCurrentUser(null);
        localStorage.removeItem('user');
        setCurrentPage('showroom');
        setNotifications([]);
        setNotificationsOpen(false);
      })
      .catch((err) => console.error(err));
  };

  const handleMarkNotificationsRead = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('user_id', '==', currentUser.id),
        where('is_read', '==', 0)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { is_read: 1 });
      });
      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-6 selection:bg-cyan-500 selection:text-slate-900">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-12 border-b border-slate-900 pb-6 relative z-40">
        <div 
          onClick={() => { setCurrentPage('showroom'); setSelectedVehicleId(null); }}
          className="flex items-center gap-2 hover:cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 group-hover:scale-105 transition-transform duration-300">
            AWS
          </div>
          <div>
            <span className="text-base font-black tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              VEHICLES
            </span>
            <span className="block text-[8px] text-slate-500 uppercase tracking-widest -mt-1 font-semibold">Second-hand portal</span>
          </div>
        </div>

        {/* Navigation / User info */}
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-6 text-xs font-bold text-slate-400">
            <button 
              onClick={() => { setCurrentPage('showroom'); setSelectedVehicleId(null); }}
              className={`hover:text-cyan-400 transition-colors ${currentPage === 'showroom' ? 'text-cyan-400' : ''}`}
            >
              Showroom
            </button>
            {currentUser && (
              <button 
                onClick={() => setCurrentPage('dashboard')}
                className={`hover:text-cyan-400 transition-colors ${currentPage === 'dashboard' ? 'text-cyan-400' : ''}`}
              >
                My Dashboard
              </button>
            )}
            {currentUser && currentUser.role === 'admin' && (
              <button 
                onClick={() => setCurrentPage('admin')}
                className={`hover:text-cyan-400 transition-colors ${currentPage === 'admin' ? 'text-cyan-400' : ''}`}
              >
                Admin Console
              </button>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {/* Currency Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-[10px] font-bold">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  currency === 'USD'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency('INR')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  currency === 'INR'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                INR (₹)
              </button>
            </div>

            {currentUser ? (
              <>
                {/* Notifications dropdown trigger */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      if (unreadCount > 0) handleMarkNotificationsRead();
                    }}
                    className="relative w-8 h-8 rounded-full border border-slate-800 bg-slate-900/40 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  >
                    🔔
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold text-[9px] flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown panel */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-2xl space-y-3 z-50">
                      <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                        <span className="text-xs font-bold text-white">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkNotificationsRead} className="text-[10px] text-cyan-400 font-semibold hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2.5 divide-y divide-slate-850">
                        {notifications.length === 0 ? (
                          <p className="text-[10px] text-slate-500 py-4 text-center">No alerts to display.</p>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className="pt-2 text-[10px] leading-relaxed text-slate-400">
                              <p className={n.is_read ? 'text-slate-500' : 'text-slate-200 font-medium'}>{n.message}</p>
                              <span className="text-[8px] text-slate-600 block mt-1">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile block */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-bold text-white leading-none">{currentUser.username}</p>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">{currentUser.role}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/40 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                  >
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/5 transition-all hover:scale-[1.01]"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main View Manager */}
      <main className="w-full flex flex-col items-center flex-grow">
        {currentPage === 'showroom' && (
          <Showroom 
            onSelectVehicle={(id) => { setSelectedVehicleId(id); setCurrentPage('detail'); }} 
            currency={currency}
            formatPrice={formatPrice}
            EXCHANGE_RATE={EXCHANGE_RATE}
          />
        )}
        
        {currentPage === 'detail' && (
          <VehicleDetail 
            vehicleId={selectedVehicleId} 
            currentUser={currentUser}
            onBack={() => { setSelectedVehicleId(null); setCurrentPage('showroom'); }}
            onAuthPrompt={() => setAuthModalOpen(true)}
            formatPrice={formatPrice}
          />
        )}

        {currentPage === 'dashboard' && currentUser && (
          <Dashboard 
            currentUser={currentUser} 
            currency={currency}
            formatPrice={formatPrice}
            EXCHANGE_RATE={EXCHANGE_RATE}
          />
        )}

        {currentPage === 'admin' && currentUser && currentUser.role === 'admin' && (
          <AdminPanel 
            currentUser={currentUser} 
            formatPrice={formatPrice}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mt-24 pt-8 border-t border-slate-900 text-center text-xs text-slate-600">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>&copy; 2026 AWS Second-Hand Vehicles Portal. Powered by AWS Cloud Infrastructure.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">GDPR Compliance</a>
          </div>
        </div>
      </footer>

      {/* Authentication Dialog */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onAuthSuccess={handleAuthSuccess} 
      />
    </div>
  );
}

export default App;
