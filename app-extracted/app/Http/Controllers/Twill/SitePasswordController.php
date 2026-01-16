<?php

namespace App\Http\Controllers\Twill;

use A17\Twill\Http\Controllers\Admin\ModuleController;
use App\Models\SitePassword;
use App\Http\Requests\Twill\SitePasswordRequest;
use A17\Twill\Models\Contracts\TwillModelContract;

class SitePasswordController extends ModuleController
{
    protected $moduleName = 'sitePasswords';
    protected $requestClass = SitePasswordRequest::class;
    protected $singleton = true; // important

    /**
     * Redirect index to the singleton edit page
     */
    public function index(?int $parentModuleId = null): mixed
    {
        $record = SitePassword::singleton();
        return redirect()->route("twill.{$this->moduleName}.edit", $record->id);
    }

    /**
     * Edit method always loads the singleton record
     */
    public function edit(TwillModelContract|int $id): mixed
    {
        $record = SitePassword::singleton();
        return parent::edit($record->id);
    }
}
