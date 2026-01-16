<?php

namespace App\Http\Controllers\Front;

use App\Http\Controllers\Controller;
use App\Models\Page;
use Illuminate\Http\Request;

class PageController extends Controller
{
    public function show(Request $request, $slug)
    {
        $page = Page::where('slug', $slug)->firstOrFail();

        if ($page->page_password) {
            if (session("page_unlocked_{$slug}") !== true) {

                if ($request->isMethod('post')) {
                    if ($request->password === $page->page_password) {
                        session(["page_unlocked_{$slug}" => true]);
                        return redirect()->route('page.show', $slug);
                    }
                    return back()->with('page_error', 'Incorrect password.');
                }

                return view('password-protect.page', compact('page', 'slug'));
            }
        }

        return view('pages.show', compact('page'));
    }
}
