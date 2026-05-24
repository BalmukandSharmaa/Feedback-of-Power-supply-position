<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\ComplaintUpdate;
use App\Models\FeedbackRating;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ComplaintController extends Controller
{
    public function index(Request $request)
    {
        $query = Complaint::with(['user', 'location', 'assignee', 'rating'])->latest();

        if ($request->user()->role !== 'admin') {
            $query->where('user_id', $request->user()->id);
        }

        foreach (['status', 'category', 'priority', 'location_id'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->{$filter});
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ticket_no', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $sort = in_array($request->sort, ['created_at', 'priority', 'status', 'category']) ? $request->sort : 'created_at';
        $direction = $request->direction === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($sort, $direction)->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'location_id' => ['required', 'exists:locations,id'],
            'category' => ['required', Rule::in(['power_cut', 'low_voltage', 'transformer_fault', 'maintenance', 'restoration_update', 'billing', 'other'])],
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'critical'])],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['required', 'string', 'max:2000'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $complaint = Complaint::create($data + [
            'ticket_no' => 'PWR-' . now()->format('ymd') . '-' . strtoupper(Str::random(5)),
            'user_id' => $request->user()->id,
            'status' => 'submitted',
        ]);

        $complaint->updates()->create([
            'user_id' => $request->user()->id,
            'status' => 'submitted',
            'note' => 'Complaint submitted by consumer.',
        ]);

        return response()->json($complaint->load(['user', 'location', 'updates']), 201);
    }

    public function show(Request $request, Complaint $complaint)
    {
        $this->authorizeAccess($request, $complaint);

        return $complaint->load(['user', 'location', 'assignee', 'updates.user', 'rating']);
    }

    public function update(Request $request, Complaint $complaint)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Admin access required.'], 403);
        }

        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['submitted', 'approved', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'])],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'critical'])],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        if (($data['status'] ?? null) === 'resolved') {
            $data['resolved_at'] = now();
        }

        $complaint->update(collect($data)->except('note')->toArray());

        if (isset($data['status']) || isset($data['note'])) {
            ComplaintUpdate::create([
                'complaint_id' => $complaint->id,
                'user_id' => $request->user()->id,
                'status' => $data['status'] ?? $complaint->status,
                'note' => $data['note'] ?? 'Complaint workflow updated.',
            ]);
        }

        return $complaint->fresh(['user', 'location', 'assignee', 'updates.user']);
    }

    public function destroy(Request $request, Complaint $complaint)
    {
        $this->authorizeAccess($request, $complaint);
        $complaint->delete();

        return response()->json(['message' => 'Complaint deleted.']);
    }

    public function rate(Request $request, Complaint $complaint)
    {
        $this->authorizeAccess($request, $complaint);

        if (!in_array($complaint->status, ['resolved', 'closed'])) {
            return response()->json(['message' => 'Only resolved complaints can be rated.'], 422);
        }

        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comments' => ['nullable', 'string', 'max:1000'],
        ]);

        $rating = FeedbackRating::updateOrCreate(
            ['complaint_id' => $complaint->id, 'user_id' => $request->user()->id],
            $data
        );

        return response()->json($rating, 201);
    }

    private function authorizeAccess(Request $request, Complaint $complaint)
    {
        abort_if($request->user()->role !== 'admin' && $complaint->user_id !== $request->user()->id, 403);
    }
}
