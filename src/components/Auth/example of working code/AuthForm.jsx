import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { login, register, updateUserInfo } from '../../store/slices/authSlice';
import { createParty, createEmail, createAddress, createPhone, createPreference, fetchUserData } from '../../store/slices/userSlice';
import { showError } from '../../store/slices/errorSlice';
import Spinner from '../common/LoadingSpinner';

const inputStyles = "appearance-none rounded-md relative block w-full px-3 py-2 border border-primary-200 placeholder-neutral-500 text-primary-900 focus:outline-none focus:ring-accent-500 focus:border-accent-500 sm:text-sm mt-1";

const AuthForm = ({ isSignUp = false, initialData = null, onEmailChange, onFormSwitch }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);
  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState(
    initialData ? {
      ...initialData,
      password: '',
      confirmPassword: ''
    } : {
      email: '',
      password: '',
      confirmPassword: '',
      ...(isSignUp && {
        firstName: '',
        lastName: '',
        streetAddress: '',
        city: '',
        state: '',
        postalCode: '',
        phone: '',
        preferredContact: 'email'
      })
    }
  );

  const formatPhoneNumber = (phone) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 10) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    }
    return phone;
  };

  const validatePhone = (phone) => {
    const numbers = phone.replace(/\D/g, '');
    return numbers.length === 10;
  };

  const validateForm = () => {
    const errors = {};

    if (isSignUp || initialData) {
      if (isSignUp && formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }

      if (formData.phone && !validatePhone(formData.phone)) {
        errors.phone = 'Invalid phone format. Use 10 digits';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    if (name === 'email') {
      onEmailChange?.(value);
    }
  };

  const handlePhoneBlur = (e) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setFormData(prev => ({
      ...prev,
      phone: formattedPhone
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (initialData) {
        await dispatch(updateUserInfo(formData)).unwrap();
        setValidationErrors({});
      } else if (isSignUp) {
        const partyResponse = await dispatch(createParty({
          firstName: formData.firstName,
          lastName: formData.lastName
        })).unwrap();

        const partyId = partyResponse.fieldData.__ID;

        await dispatch(createEmail({
          email: formData.email,
          partyId,
        })).unwrap();

        await dispatch(createAddress({
          streetAddress: formData.streetAddress,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          partyId
        })).unwrap();

        if (formData.phone) {
          await dispatch(createPhone({
            phone: formData.phone,
            partyId
          })).unwrap();

          await dispatch(createPreference({
            preferredContact: formData.preferredContact,
            partyId
          })).unwrap();
        }

        await dispatch(register({
          email: formData.email,
          password: formData.password,
          partyId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          streetAddress: formData.streetAddress,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          phone: formData.phone,
          preferredContact: formData.preferredContact
        })).unwrap();
      } else {
        const loginResult = await dispatch(login({
          email: formData.email,
          password: formData.password
        })).unwrap();
        console.log('Login successful:', loginResult);
        
        // Fetch user data after successful login
        await dispatch(fetchUserData({
          partyId: loginResult.user.id,
          email: formData.email
        })).unwrap();
        
        console.log('User data fetched, navigating to dashboard...');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Auth error:', error);
      if (error === 'Email already exists') {
        dispatch(showError('Email already exists. Please login instead.'));
        onFormSwitch?.();
      } else {
        setValidationErrors(prev => ({
          ...prev,
          submit: error.message
        }));
      }
    }
  };

  const getAddressFields = () => (
    <>
      <input
        type="text"
        name="streetAddress"
        value={formData.streetAddress}
        onChange={handleChange}
        placeholder="Street Address"
        className={inputStyles}
        required
      />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          type="text"
          name="city"
          value={formData.city}
          onChange={handleChange}
          placeholder="City"
          className={inputStyles}
          required
        />
        <input
          type="text"
          name="state"
          value={formData.state}
          onChange={handleChange}
          placeholder="State/Province"
          className={inputStyles}
          required
        />
      </div>
      <input
        type="text"
        name="postalCode"
        value={formData.postalCode}
        onChange={handleChange}
        placeholder="ZIP/Postal Code"
        className={inputStyles}
        required
      />
    </>
  );

  const showProfileFields = isSignUp || initialData;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showProfileFields && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-neutral-600 mb-2">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className={inputStyles}
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-neutral-600 mb-2">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className={inputStyles}
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-neutral-600 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handlePhoneBlur}
              placeholder="(555) 123-4567"
              required
              className={inputStyles}
            />
            {validationErrors.phone && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-neutral-600 mb-2">
              Preferred Contact Method
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="preferredContact"
                  value="email"
                  checked={formData.preferredContact === 'email'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Email
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="preferredContact"
                  value="text"
                  checked={formData.preferredContact === 'text'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Text
              </label>
            </div>
          </div>

          <div>
            <label className="block text-neutral-600 mb-2">Address</label>
            {getAddressFields()}
          </div>
        </>
      )}

      <div>
        <label htmlFor="email" className="block text-neutral-600 mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className={inputStyles}
        />
      </div>

      {(!initialData || isSignUp) && (
        <>
          <div>
            <label htmlFor="password" className="block text-neutral-600 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!initialData}
              className={inputStyles}
            />
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="block text-neutral-600 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className={inputStyles}
              />
              {validationErrors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>
          )}
        </>
      )}

      <button 
        type="submit" 
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
        disabled={loading}
      >
        {loading && <Spinner size="sm" color="white" />}
        <span>{initialData ? 'Save Changes' : isSignUp ? 'Sign Up' : 'Sign In'}</span>
      </button>
    </form>
  );
};

AuthForm.propTypes = {
  isSignUp: PropTypes.bool,
  initialData: PropTypes.object,
  onEmailChange: PropTypes.func,
  onFormSwitch: PropTypes.func
};

export default AuthForm;
