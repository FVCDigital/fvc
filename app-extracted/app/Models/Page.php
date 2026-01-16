<?php

namespace App\Models;

use A17\Twill\Models\Behaviors\HasBlocks;
use A17\Twill\Models\Behaviors\HasTranslation;
use A17\Twill\Models\Behaviors\HasSlug;
use A17\Twill\Models\Behaviors\HasMedias;
use A17\Twill\Models\Behaviors\HasRevisions;
use A17\Twill\Models\Model;

class Page extends Model
{
    use HasBlocks, HasTranslation, HasSlug, HasMedias, HasRevisions;

    protected $fillable = [
        'published',
    ];
    
    public $translatedAttributes = [
        'title',
        'description',
        'seotitle',
    ];
    
    public $slugAttributes = [
        'title',
    ];
    
    public function getFormFields(): array
    {
        return [
            [
                'type' => 'input',
                'name' => 'title',
                'label' => 'Title',
            ],
            [
                'type' => 'input',
                'name' => 'slug',
                'label' => 'Slug',
            ],
            [
                'type' => 'checkbox',
                'name' => 'published',
                'label' => 'Published',
            ],
        ];
    }
}
