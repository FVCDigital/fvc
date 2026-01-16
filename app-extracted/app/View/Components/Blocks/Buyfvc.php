<?php

namespace App\View\Components\Blocks;

use A17\Twill\Services\Forms\Fields\Input;
use A17\Twill\Services\Forms\Fields\Wysiwyg;
use A17\Twill\Services\Forms\Fields\Color;
use A17\Twill\Services\Forms\Form;
use A17\Twill\View\Components\Blocks\TwillBlockComponent;
use Illuminate\Contracts\View\View;

class Buyfvc extends TwillBlockComponent
{
    public function getForm(): Form
    {
        $form = Form::make();

        $form->add(
            Input::make()
                ->name('title')
                ->label('Section Title')
                ->translatable()
        );

        $form->add(
            Wysiwyg::make()
                ->name('text')
                ->label('Text')
                ->translatable()
                ->toolbarOptions([
                    ['header' => [2, 3, 4, false]],
                    'bold', 'italic', 'underline', 'strike',
                    ['list' => 'ordered'], ['list' => 'bullet'],
                    'link'
                ])
        );

        $form->add(
            Input::make()
                ->name('background_colour')
                ->label('Background Colour (hex code)')
                ->placeholder('#ffffff')
        );

        $form->add(
            Input::make()
                ->name('css_class')
                ->label('CSS Class')
                ->placeholder('my-custom-class')
        );

        return $form;
    }

    public function render(): View
    {
        return view('site.blocks.buyfvc');
    }
}
