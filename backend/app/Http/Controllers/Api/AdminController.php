<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\FeedbackRating;
use App\Models\Location;
use App\Models\Notification;
use App\Models\PowerStatus;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function analytics()
    {
        $complaintsByStatus = Complaint::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $complaintsByCategory = Complaint::select('category', DB::raw('count(*) as total'))
            ->groupBy('category')
            ->pluck('total', 'category');

        $outagesByArea = PowerStatus::select('location_id', DB::raw('count(*) as total'))
            ->whereIn('status', ['outage', 'low_voltage', 'maintenance'])
            ->with('location:id,name')
            ->groupBy('location_id')
            ->orderByDesc('total')
            ->limit(8)
            ->get();

        $monthly = Complaint::select(DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month"), DB::raw('count(*) as total'))
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return response()->json([
            'totals' => [
                'users' => User::where('role', 'user')->count(),
                'locations' => Location::count(),
                'open_complaints' => Complaint::whereNotIn('status', ['resolved', 'closed', 'rejected'])->count(),
                'resolved_complaints' => Complaint::whereIn('status', ['resolved', 'closed'])->count(),
                'average_rating' => round((float) FeedbackRating::avg('rating'), 1),
            ],
            'complaints_by_status' => $complaintsByStatus,
            'complaints_by_category' => $complaintsByCategory,
            'outages_by_area' => $outagesByArea,
            'monthly_complaints' => $monthly,
        ]);
    }

    public function users(Request $request)
    {
        $query = User::with('location')->latest();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%")
                    ->orWhere('phone', 'like', "%{$request->search}%");
            });
        }

        return $query->paginate($request->integer('per_page', 15));
    }

    public function storeUser(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'location_id' => ['nullable', 'exists:locations,id'],
            'role' => ['required', Rule::in(['user', 'admin'])],
            'password' => ['required', 'string', 'min:8'],
            'is_active' => ['boolean'],
        ]);

        $data['password'] = Hash::make($data['password']);

        return response()->json(User::create($data)->load('location'), 201);
    }

    public function updateUser(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:150', 'unique:users,email,' . $user->id],
            'phone' => ['nullable', 'string', 'max:30'],
            'location_id' => ['nullable', 'exists:locations,id'],
            'role' => ['sometimes', Rule::in(['user', 'admin'])],
            'password' => ['nullable', 'string', 'min:8'],
            'is_active' => ['boolean'],
        ]);

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        return $user->fresh('location');
    }

    public function notifications(Request $request)
    {
        return Notification::with('location')
            ->when($request->filled('location_id'), fn ($q) => $q->where('location_id', $request->location_id))
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    public function storeNotification(Request $request)
    {
        $data = $request->validate([
            'location_id' => ['nullable', 'exists:locations,id'],
            'title' => ['required', 'string', 'max:160'],
            'message' => ['required', 'string', 'max:1000'],
            'type' => ['required', Rule::in(['outage', 'maintenance', 'restoration', 'complaint'])],
            'scheduled_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'is_published' => ['boolean'],
        ]);

        return response()->json(Notification::create($data)->load('location'), 201);
    }

    public function report(Request $request)
    {
        $from = $request->date('from', now()->startOfMonth());
        $to = $request->date('to', now());

        return response()->json([
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'complaints' => Complaint::whereBetween('created_at', [$from, $to])->with('location')->get(),
            'power_events' => PowerStatus::whereBetween('created_at', [$from, $to])->with('location')->get(),
        ]);
    }
}
