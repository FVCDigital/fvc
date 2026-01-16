<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class PasswordProtected
{
    public function handle(Request $request, Closure $next)
    {
        // Check if user has already authenticated
        if (session('site_password_authenticated')) {
            return $next($request);
        }

        // Allow access to login route
        if ($request->is('site-login') || $request->is('site-login-verify')) {
            return $next($request);
        }

        // Redirect to password page
        return redirect()->route('site.password');
    }
}
