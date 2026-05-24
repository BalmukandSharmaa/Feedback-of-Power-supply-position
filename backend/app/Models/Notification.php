<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'location_id',
        'title',
        'message',
        'type',
        'scheduled_at',
        'expires_at',
        'is_published',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_published' => 'boolean',
    ];

    public function location()
    {
        return $this->belongsTo(Location::class);
    }
}
