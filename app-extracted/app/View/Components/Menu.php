<?php

namespace App\View\Components;

use App\Models\MenuLink;
use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

class Menu extends Component
{
    public function render(): View
    {
        /** @var MenuLink[] $links */
        $links = MenuLink::published()
            ->orderBy('position', 'asc')
            ->get()
            ->toTree();
            
        return view('components.menu', ['links' => $links]);
    }
}