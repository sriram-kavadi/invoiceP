import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Full name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address (e.g. name@company.com)';
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^[6-9]\d{9}$/.test(trimmedPhone)) {
      errors.phone = 'Phone must be a valid 10-digit Indian mobile number (e.g. 9876543210)';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the highlighted errors below');
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, phone.trim() || undefined);
      toast.success('Registration successful! Let’s set up your business.');
      navigate('/onboarding');
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        const mappedErrors = {};
        for (const [key, val] of Object.entries(serverErrors)) {
          mappedErrors[key] = Array.isArray(val) ? val[0] : String(val);
        }
        setFieldErrors(mappedErrors);
      }
      toast.error(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col justify-center py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-primary-500/30">
            IH
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black text-gray-900 tracking-tight">
          Create your account
        </h2>
        <p className="mt-1 text-center text-sm text-gray-500">
          Already registered?{' '}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:text-primary-500 underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md px-1 sm:px-0">
        <div className="bg-white py-6 sm:py-8 px-5 sm:px-10 shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Input
              label="Full Name"
              required
              value={name}
              error={fieldErrors.name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError('name');
              }}
              placeholder="e.g. Rithik Kumar"
            />

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              error={fieldErrors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
              }}
              placeholder="you@example.com"
            />

            <Input
              label="Phone Number"
              type="tel"
              value={phone}
              error={fieldErrors.phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearFieldError('phone');
              }}
              placeholder="e.g. 9876543210"
              helperText="10-digit mobile number"
            />

            <Input
              label="Password (min 8 characters)"
              type="password"
              required
              value={password}
              error={fieldErrors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError('password');
              }}
              placeholder="••••••••"
            />

            <Input
              label="Confirm Password"
              type="password"
              required
              value={confirmPassword}
              error={fieldErrors.confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFieldError('confirmPassword');
              }}
              placeholder="••••••••"
            />

            <div className="pt-2">
              <Button type="submit" loading={loading} className="w-full">
                Register & Setup Business
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

