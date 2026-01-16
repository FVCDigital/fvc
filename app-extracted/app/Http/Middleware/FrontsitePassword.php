<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Config;

class FrontsitePassword
{
    public function handle($request, Closure $next)
    {
        // Skip admin routes
        if ($request->is('admin') || $request->is('admin/*')) {
            return $next($request);
        }

        // Use a password from config or .env
        $sitePassword = env('FRONTSITE_PASSWORD', 'secret'); // default 'secret'

        // Check if session already unlocked
        if ($request->session()->get('frontsite_unlocked')) {
            return $next($request);
        }

        // Check form submission
        if ($request->isMethod('post')) {
            if ($request->input('password') === $sitePassword) {
                $request->session()->put('frontsite_unlocked', true);
                return redirect()->to($request->url());
            } else {
                return back()->withErrors(['password' => 'Incorrect password']);
            }
        }

        // Show password form
        return response()->view('frontsite-password');
    }
}
