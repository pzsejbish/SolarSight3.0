/*!
 * --------------------------------------------------------------------------------
 * File: [login.js]
 * Project: [Ballast Engineering Tool]
 * Created Date: [D12/29/2023]
 * Author: [James Bish, Arsen Tamamyan ]
 * Organization: PZSE Structural Engineers
 * --------------------------------------------------------------------------------
 * 
 * Copyright (c) [2024] PZSE Structural Engineers
 * 
 * This source code is the proprietary property of PZSE Structural Engineers and is
 * protected by international copyright and trade secret laws and treaties. No part
 * of this source code may be reproduced, copied, distributed, transmitted, broadcast,
 * displayed, sold, licensed, or otherwise exploited for any commercial purpose
 * whatsoever without the express prior written consent of PZSE Structural Engineers.
 * 
 * Use of this source code is governed by the terms of the agreement under which it
 * has been provided, which typically includes restrictions on use, disclosure,
 * modification, and conditions of license. If you have not received this source code
 * under such an agreement, then you have no rights to use it in any manner that
 * infringes the intellectual property rights of PZSE Structural Engineers.
 * 
 * --------------------------------------------------------------------------------
 */


import React, { useState } from 'react';
import { useFormData } from './FormDataContext';
import { BackgroundBoxesDemo }  from './Components/BackgroundBoxesDemo';
// import './App.css';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { setFormData } = useFormData();


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Reset error message

        const loginFormData = new FormData();
        loginFormData.append('email', username);
        loginFormData.append('password', password);

        try {
            const loginResponse = await fetch('https://api-training.pzse.com/api/internal/auth/login', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: loginFormData,
            });

            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                localStorage.setItem('authToken', loginData.result.access_token);
                console.log('Logged in Successfully') // Save the token in localStorage
                const profileResponse = await fetch('https://api-training.pzse.com/api/internal/users/me', {
                    headers: {
                      'Accept': 'application/json',
                      'Authorization': `Bearer ${loginData.result.access_token}`
                    },
                  });
                  if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    // Now you have the user's profile data. You can decide what you need and store it
                    const userProfile = profileData.result;
                    const userData = {
                      userStatus: userProfile.user_status?.description || '',  // Using optional chaining in case the field is undefined
                      phoneNumber: userProfile.phone_number || '',
                      userId: userProfile.id || '',
                      deltekId: userProfile.account.deltek_client_id || '',  // Assuming deltek_client_id is under account
                      fullName: userProfile.full_name || '',
                      email: userProfile.email || '',
                      address: `${userProfile.address?.address_1 || ''} ${userProfile.address?.address_2 || ''}`
                    };
              
                    // Update formData with the extracted user data
                    setFormData(prevFormData => ({
                        ...prevFormData,
                        ...userData
                    }));
                    onLogin(); // If login is successful
            } else {
                console.error('Failed to fetch user profile:', profileResponse.status);
                setError('Failed to fetch user profile. Please try again.');
              }
            } else {
                setError('Invalid username or password');
            }
        } catch (err) {
            console.error('Login failed:', err);
            setError('Login failed. Please try again later.');
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-gray-100">
            <div className="absolute inset-0 z-0 h-full w-full">
                <BackgroundBoxesDemo />
            </div>
            <div className="relative z-10 flex flex-col justify-center bg-white shadow-lg rounded-lg px-8 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
                <img
                    src="https://raw.githubusercontent.com/PZSE/HTMLImageHosting/main/PortalLogoWhiteBackground.PNG"
                    alt="PZSE Logo"
                    className="w-50 h-20 mx-auto mb-8"
                />
                <h1 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 mb-6">
                    Ballast Engineering Tool - Login
                </h1>
                <form className="space-y-6" action="#" method="POST" onSubmit={handleSubmit}>
                    <div>
                        <label className="block font-semibold text-xl" htmlFor="username">Username</label>
                        <input
                            className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
                            type="text"
                            id="username"
                            value={username}
                            autoComplete="username"
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block font-semibold text-xl" htmlFor="password">Password</label>
                        <input
                            className="block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6"
                            type="password"
                            id="password"
                            value={password}
                            autoComplete="current-password"
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    <button
                        type="submit"
                        className="w-full mt-4 mb-8 justify-center rounded bg-blue-900 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        Login
                    </button>
                </form>
                <div className="text-center mt-8">
                    <label className="block">Powered by PZSE Structural Engineers © 2024</label>
                </div>
            </div>
        </div>
    );

}

export default Login;