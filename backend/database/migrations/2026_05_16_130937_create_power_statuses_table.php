<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('power_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('location_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['normal', 'outage', 'low_voltage', 'maintenance', 'restoring'])->default('normal');
            $table->unsignedTinyInteger('voltage_level')->default(100);
            $table->string('reason')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('estimated_restoration_at')->nullable();
            $table->timestamp('restored_at')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('power_statuses');
    }
};
