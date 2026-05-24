<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\PowerStatus;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PowerStatusController extends Controller
{
    public function index(Request $request)
    {
        $query = PowerStatus::with(['location', 'updater'])->latest();

        if ($request->filled('location_id')) {
            $query->where('location_id', $request->location_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return $query->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['updated_by'] = $request->user()->id;

        $status = PowerStatus::create($data);

        if (in_array($status->status, ['outage', 'maintenance', 'restoring'])) {
            Notification::create([
                'location_id' => $status->location_id,
                'title' => ucfirst(str_replace('_', ' ', $status->status)) . ' update',
                'message' => $status->reason ?: 'Power supply status has been updated for your area.',
                'type' => $status->status === 'maintenance' ? 'maintenance' : ($status->status === 'restoring' ? 'restoration' : 'outage'),
                'scheduled_at' => now(),
            ]);
        }

        return response()->json($status->load(['location', 'updater']), 201);
    }

    public function show(PowerStatus $powerStatus)
    {
        return $powerStatus->load(['location', 'updater']);
    }

    public function update(Request $request, PowerStatus $powerStatus)
    {
        $data = $this->validated($request, true);
        $data['updated_by'] = $request->user()->id;
        $powerStatus->update($data);

        return $powerStatus->fresh(['location', 'updater']);
    }

    public function destroy(PowerStatus $powerStatus)
    {
        $powerStatus->delete();

        return response()->json(['message' => 'Power status deleted.']);
    }

    private function validated(Request $request, $partial = false)
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'location_id' => [$required, 'exists:locations,id'],
            'status' => [$required, Rule::in(['normal', 'outage', 'low_voltage', 'maintenance', 'restoring'])],
            'voltage_level' => ['sometimes', 'integer', 'between:0,120'],
            'reason' => ['nullable', 'string', 'max:500'],
            'started_at' => ['nullable', 'date'],
            'estimated_restoration_at' => ['nullable', 'date'],
            'restored_at' => ['nullable', 'date'],
        ]);
    }
}
