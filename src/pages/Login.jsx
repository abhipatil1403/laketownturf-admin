import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { Shield } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        setError('Access Denied. You do not have admin privileges.');
        auth.signOut();
      } else {
        navigate('/users');
      }
    } catch (err) {
      console.error(err);
      setError('Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-darkNavy p-4">
      <div className="w-full max-w-md bg-darkNavySurface rounded-2xl p-8 border border-cardBorder shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primaryGreen/20 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primaryGreen" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-textPrimary mb-2">Admin Portal</h2>
        <p className="text-center text-textSecondary mb-8">Sign in with your admin credentials</p>
        
        {error && (
          <div className="mb-4 p-3 bg-dangerRed/10 border border-dangerRed/50 rounded-lg text-dangerRed text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-darkNavy border border-cardBorder rounded-lg px-4 py-2.5 text-textPrimary focus:outline-none focus:border-primaryGreen transition-colors"
              placeholder="admin@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-darkNavy border border-cardBorder rounded-lg px-4 py-2.5 text-textPrimary focus:outline-none focus:border-primaryGreen transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-4 flex items-center justify-center space-x-2 bg-primaryGreen text-darkNavy font-semibold rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-darkNavy border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
