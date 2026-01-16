<?php

use App\Http\Controllers\PageDisplayController;
use Illuminate\Support\Facades\Route;

// Apply password middleware to ALL frontend routes
Route::middleware(['password.protected'])->group(function () {
    // Home page
    Route::match(['get','post'], '/', [PageDisplayController::class, 'home'])->name('frontend.home');
    
    // Buy FVC dedicated page
    Route::get('/buy-fvc', function() {
        return view('site.buy-fvc');
    })->name('frontend.buy-fvc');
    
    // All other pages
    Route::match(['get','post'], '/{slug}', [PageDisplayController::class, 'show'])
        ->where('slug', '.*')
        ->name('frontend.page');
});
