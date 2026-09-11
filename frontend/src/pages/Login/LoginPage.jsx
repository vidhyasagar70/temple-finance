import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Phone, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      phone: '9999999999',
      password: 'ChangeMe123!',
    },
  });

  const onSubmit = async (data) => {
    setApiError('');
    setSubmitting(true);
    try {
      await login(data.phone, data.password);
      navigate('/dashboard');
    } catch (err) {
      setApiError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-forest-700 text-amber-300 flex items-center justify-center text-3xl shadow-lg border border-forest-600">
            🛕
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-bold font-serif tracking-tight text-stone-900">
          Village Temple Finance
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          Secure Accounting & Ledger Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-stone-200 sm:rounded-2xl sm:px-10">
          {apiError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-700 font-medium">{apiError}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Phone Number
              </label>
              <div className="mt-1.5 relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  maxLength={10}
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: 'Phone number must be exactly 10 digits',
                    },
                  })}
                  className="block w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-temple-500 focus:border-temple-500"
                  placeholder="9999999999"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-rose-600">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  {...register('password', {
                    required: 'Password is required',
                  })}
                  className="block w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-temple-500 focus:border-temple-500"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-temple-600 hover:bg-temple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-temple-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign in to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-stone-100 pt-4 text-center">
            <p className="text-xs text-stone-400">
              Default Admin: <span className="font-mono text-stone-600">9999999999</span> /{' '}
              <span className="font-mono text-stone-600">ChangeMe123!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
