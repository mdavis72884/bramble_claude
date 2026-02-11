import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="text-4xl font-serif font-bold text-slate-900">Bramble</div>
          <CardTitle className="text-xl">Bramble Console</CardTitle>
          <CardDescription>Sign in to manage your platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="operator@bramble.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-email"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="button-login"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm space-y-3">
              <div className="font-medium text-slate-900">Test Credentials:</div>
              <div className="text-slate-600 space-y-2 text-xs">
                <div>
                  <span className="font-medium text-slate-700">Operators:</span>
                  <div className="ml-2">operator@bramble.co / operator123</div>
                  <div className="ml-2">admin@bramble.co / operator123</div>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Co-op Admins:</span>
                  <div className="ml-2">admin@oakhollow.edu / admin123</div>
                  <div className="ml-2">director@oakhollow.edu / admin123</div>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Instructors:</span>
                  <div className="ml-2">jane.smith@oakhollow.edu / instructor123</div>
                  <div className="ml-2">robert.wilson@oakhollow.edu / instructor123</div>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Families:</span>
                  <div className="ml-2">parent@example.com / family123</div>
                  <div className="ml-2">martinez@example.com / family123</div>
                </div>
              </div>
            </div>
          </form>
          <div className="mt-4 text-center">
            <Link href="/routes" className="text-xs text-slate-400 hover:text-slate-600 underline" data-testid="link-routes">
              View All Routes
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
