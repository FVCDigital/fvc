<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  public function up(): void
{
 Schema::create('site_passwords', function (Blueprint $table) {
    $table->id();
    $table->string('password')->nullable();
    $table->boolean('enabled')->default(false);
    $table->timestamps();
    $table->softDeletes(); // <-- adds deleted_at
});
}


    public function down()
    {
        
        Schema::dropIfExists('site_passwords');
    }
};
