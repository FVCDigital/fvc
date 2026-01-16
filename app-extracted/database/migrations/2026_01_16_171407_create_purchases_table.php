<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->string('wallet_address', 42)->index();
            $table->string('tx_hash', 66)->unique()->nullable();
            $table->enum('payment_method', ['card', 'crypto'])->default('crypto');
            $table->string('stable_token')->nullable(); // USDC, USDT
            $table->string('token_address', 42)->nullable(); // Contract address
            $table->decimal('amount', 20, 6); // Amount in stable (USDC/USDT)
            $table->decimal('fvc_amount', 30, 18)->nullable(); // FVC tokens purchased
            $table->enum('status', ['pending', 'confirmed', 'failed'])->default('pending');
            $table->string('moonpay_transaction_id')->nullable()->unique();
            $table->text('metadata')->nullable(); // JSON for additional data
            $table->timestamps();
            
            // Indexes for common queries
            $table->index(['wallet_address', 'created_at']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchases');
    }
};
