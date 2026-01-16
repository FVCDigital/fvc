<?php

namespace App\Repositories;


use A17\Twill\Repositories\ModuleRepository;
use App\Models\SitePassword;

class SitePasswordRepository extends ModuleRepository
{
    

    public function __construct(SitePassword $model)
    {
        $this->model = $model;
    }
}
