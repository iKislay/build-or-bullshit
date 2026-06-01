'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/host', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSession(data);
        sessionStorage.setItem('session', JSON.stringify(data));
        router.push('/admin/dashboard');
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E91E63] p-4">
      <div className="neo-card bg-white max-w-md w-full">
        <h1 className="text-6xl font-black uppercase mb-2 text-center">
          Admin Login
        </h1>
        <p className="text-xl font-bold text-center mb-8">
          Host Access Only
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="password" className="text-lg font-black uppercase mb-2 block">
              Host Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="neo-input w-full"
              placeholder="Enter host password"
            />
          </div>

          {error && (
            <div className="border-4 border-black bg-[#F44336] text-white p-4 font-black text-center">
              {error}
            </div>
          )}

          <Button
            onClick={handleLogin}
            disabled={!password.trim() || loading}
            className="neo-button bg-[#4CAF50] hover:bg-[#4CAF50] w-full disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Enter Admin'}
          </Button>

          <div className="text-center pt-4 border-t-4 border-black">
            <p className="text-sm font-bold mb-2">Are you a panelist?</p>
            <Button
              onClick={() => router.push('/')}
              className="neo-button bg-[#00BCD4] hover:bg-[#00BCD4] w-full text-sm py-2"
            >
              Go to Panelist Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
