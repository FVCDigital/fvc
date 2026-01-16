<?php

namespace App\Http\Requests\Twill;

use A17\Twill\Http\Requests\Admin\Request;

class SitePasswordRequest extends Request
{
    public function rules(): array
    {
        return [
            'password' => 'nullable|string|max:255',
            'enabled' => 'boolean',
        ];
    }
}
