<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SitePasswordController extends Controller
{
    public function show()
    {
        // If already authenticated, redirect to home
        if (session('site_password_authenticated')) {
            return redirect('/');
        }

        return view('auth.site-password');
    }

    public function verify(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        // Get the site password from config
        $sitePassword = config('app.site_password');

        if ($request->password === $sitePassword) {
            session(['site_password_authenticated' => true]);
            return redirect()->intended('/');
        }

        return back()->withErrors([
            'password' => 'The password is incorrect.',
        ]);
    }

    public function logout(Request $request)
    {
        $request->session()->forget('site_password_authenticated');
        return redirect()->route('site.password');
    }
}