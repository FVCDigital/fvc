<?php

use Illuminate\Support\Facades\Route;
use App\Livewire\Counter;

// Home page
Route::get('/', function () {
    return view('maintenance');
})->name('home');

// About Us page
Route::get('about-us', function () {
    return view('content/about');
})->name('about');

// Contact Us page
Route::get('contact-us', function () {
    return view('content/contact');
})->name('contact');

// Product page
Route::get('product', function () {
    return view('content/product');
})->name('product');

Route::get('opt', function () {
    return view('content/opt');
})->name('opt');
