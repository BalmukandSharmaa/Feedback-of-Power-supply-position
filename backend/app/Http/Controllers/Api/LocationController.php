<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function index()
    {
        return Location::with('currentStatus')
            ->withCount('complaints')
            ->orderBy('zone')
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120', 'unique:locations,name'],
            'zone' => ['required', 'string', 'max:80'],
            'feeder_code' => ['required', 'string', 'max:80', 'unique:locations,feeder_code'],
            'substation' => ['nullable', 'string', 'max:120'],
            'consumer_count' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        return response()->json(Location::create($data), 201);
    }

    public function show(Location $location)
    {
        return $location->load(['currentStatus', 'complaints.user']);
    }

    public function update(Request $request, Location $location)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120', 'unique:locations,name,' . $location->id],
            'zone' => ['sometimes', 'string', 'max:80'],
            'feeder_code' => ['sometimes', 'string', 'max:80', 'unique:locations,feeder_code,' . $location->id],
            'substation' => ['nullable', 'string', 'max:120'],
            'consumer_count' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $location->update($data);

        return $location->fresh('currentStatus');
    }

    public function destroy(Location $location)
    {
        $location->update(['is_active' => false]);

        return response()->json(['message' => 'Location deactivated.']);
    }
}
