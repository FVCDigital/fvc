<?php

namespace App\Models;

use A17\Twill\Models\Model;

class SitePassword extends Model
{
    protected $fillable = ['password', 'enabled'];

    // Keep soft deletes enabled
    public $softDeletes = true;

    /**
     * Returns the singleton record (creates it if it doesn't exist)
     */
    public static function singleton()
    {
        return static::first() ?? static::create([
            'password' => null,
            'enabled' => false,
        ]);
    }
}

