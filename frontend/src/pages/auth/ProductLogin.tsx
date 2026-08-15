import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, ArrowRight, Loader2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export const ProductLogin: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loginProduct } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await loginProduct(apiKey.trim());
      toast.success('Workspace Authenticated', 'Signed into your Product Workspace');
      navigate('/connections');
    } catch (err: any) {
      setError(err?.message || 'Invalid or revoked API Key. Please verify your product key.');
      toast.error('Authentication Failed', 'Invalid Product API Key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 shadow-xl shadow-indigo-600/25 mb-4">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Product User Sign In
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Authenticate using your 64-character Product API Key to access tenant connections & notification history.
          </p>
        </div>

        {/* Card Form */}
        <Card className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              label="Product API Key"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
              error={error || undefined}
              helperText="Issued by your PingLayer administrator for your SaaS product."
            />

            <Button
              type="submit"
              disabled={loading || !apiKey.trim()}
              size="lg"
              className="w-full mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              <span>Sign In with API Key</span>
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors font-medium"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Are you a Platform Admin? Sign in with Admin Secret</span>
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
