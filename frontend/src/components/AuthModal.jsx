import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
          const user = userCredential.user;
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            onAuthSuccess({
              id: user.uid,
              username: userData.username || user.email.split('@')[0],
              email: user.email,
              role: userData.role || 'buyer',
              rating: userData.rating !== undefined ? userData.rating : 5.0
            });
          } else {
            const defaultUserData = {
              username: user.email.split('@')[0],
              email: user.email,
              role: 'buyer',
              rating: 5.0,
              created_at: new Date().toISOString()
            };
            await setDoc(userDocRef, defaultUserData);
            onAuthSuccess({
              id: user.uid,
              ...defaultUserData
            });
          }
          onClose();
          setUsername('');
          setEmail('');
          setPassword('');
        })
        .catch(async (err) => {
          // Dynamic seeding of default mock users if auth details match but they are not registered in the new firebase project yet
          const mockLogins = {
            'admin@autoshow.com': { password: 'admin123', username: 'admin', role: 'admin', rating: 5.0 },
            'john@gmail.com': { password: 'seller123', username: 'john_seller', role: 'seller', rating: 4.8 },
            'sara@autos.com': { password: 'seller123', username: 'sara_dealer', role: 'seller', rating: 4.9 },
            'bob@yahoo.com': { password: 'buyer123', username: 'buyer_bob', role: 'buyer', rating: 5.0 }
          };
          const mock = mockLogins[email];
          if (mock && password === mock.password) {
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              const user = userCredential.user;
              const userData = {
                username: mock.username,
                email: email,
                role: mock.role,
                rating: mock.rating,
                created_at: new Date().toISOString()
              };
              await setDoc(doc(db, 'users', user.uid), userData);
              onAuthSuccess({
                id: user.uid,
                ...userData
              });
              onClose();
              setUsername('');
              setEmail('');
              setPassword('');
              return;
            } catch (regErr) {
              setError(regErr.message);
              return;
            }
          }
          setError(err.message);
        });
    } else {
      // Sign up / Registration
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      getDocs(q)
        .then((querySnapshot) => {
          if (!querySnapshot.empty) {
            throw new Error('Username already exists');
          }
          return createUserWithEmailAndPassword(auth, email, password);
        })
        .then(async (userCredential) => {
          const user = userCredential.user;
          const userData = {
            username,
            email,
            role,
            rating: 5.0,
            created_at: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', user.uid), userData);
          onAuthSuccess({
            id: user.uid,
            ...userData
          });
          onClose();
          setUsername('');
          setEmail('');
          setPassword('');
        })
        .catch((err) => {
          setError(err.message);
        });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold tracking-tight text-white mb-6 text-center bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="john_doe"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Account Role</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                    role === 'buyer'
                      ? 'bg-cyan-500 border-cyan-500 text-slate-950 shadow-md'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                    role === 'seller'
                      ? 'bg-cyan-500 border-cyan-500 text-slate-950 shadow-md'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Seller
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition-all hover:scale-[1.01]"
          >
            {isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <button onClick={() => setIsLogin(false)} className="text-cyan-400 font-semibold hover:underline">
                Register here
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button onClick={() => setIsLogin(true)} className="text-cyan-400 font-semibold hover:underline">
                Sign in here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
