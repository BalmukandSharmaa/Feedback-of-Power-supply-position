<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'zone',
        'feeder_code',
        'substation',
        'consumer_count',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function currentStatus()
    {
        return $this->hasOne(PowerStatus::class)->latestOfMany();
    }

    public function statuses()
    {
        return $this->hasMany(PowerStatus::class);
    }

    public function complaints()
    {
        return $this->hasMany(Complaint::class);
    }
}
