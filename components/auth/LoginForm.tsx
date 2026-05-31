'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const handleLogin = async () => {
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSession(data);
        sessionStorage.setItem('session', JSON.stringify(data));
        router.push(data.role === 'host' ? '/host' : '/panel');
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFEB3B] p-4">
      <div className="neo-card bg-white max-w-md w-full">
        <h1 className="text-6xl font-black uppercase mb-2 text-center">
          Build or Bullsh*t
        </h1>
        <p className="text-xl font-bold text-center mb-8">
          Enter Password to Join
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="password" className="text-lg font-black uppercase mb-2 block">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="neo-input w-full"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="border-4 border-black bg-[#F44336] text-white p-4 font-black text-center">
              {error}
            </div>
          )}

          <Button
            onClick={handleLogin}
            className="neo-button bg-[#00BCD4] hover:bg-[#00BCD4] w-full"
          >
            Enter Show
          </Button>
        </div>
      </div>
    </div>
  );
}
