<?php

use Illuminate\Support\Facades\Route;
use App\Livewire\Counter;
Livewire::setScriptRoute(function ($handle) {
    return Route::get('fvcdigital-site/public/vendor/livewire/livewire.js', $handle);
});


 Livewire::setUpdateRoute(function ($handle) {
    return Route::post('fvcdigital-site/public/vendor/livewire/update', $handle);
});
Route::get('/counter', Counter::class);
Route::get('/', function () {
    return view('maintenance');
});
