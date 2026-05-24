<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PowerStatus extends Model
{
    use HasFactory;

    protected $fillable = [
        'location_id',
        'status',
        'voltage_level',
        'reason',
        'started_at',
        'estimated_restoration_at',
        'restored_at',
        'updated_by',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'estimated_restoration_at' => 'datetime',
        'restored_at' => 'datetime',
    ];

    public function location()
    {
        return $this->belongsTo(Location::class);
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
