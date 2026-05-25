<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\FeedbackRating;
use App\Models\Location;
use App\Models\PowerStatus;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $range = $request->input('range') === 'daily' ? 'daily' : 'monthly';
        $from = $range === 'daily'
            ? now()->subDays(6)->startOfDay()
            : now()->subMonths(4)->startOfMonth();
        $to = now()->endOfDay();

        $complaintsQuery = Complaint::with(['location', 'rating'])
            ->whereBetween('created_at', [$from, $to]);

        if ($user->role !== 'admin') {
            $complaintsQuery->where('user_id', $user->id);
        }

        $complaints = $complaintsQuery->get();

        $locationIds = $user->role === 'admin'
            ? Location::pluck('id')
            : collect([$user->location_id])->filter();

        $powerEvents = PowerStatus::with('location')
            ->whereBetween('created_at', [$from, $to])
            ->when($locationIds->isNotEmpty(), fn ($query) => $query->whereIn('location_id', $locationIds))
            ->when($user->role !== 'admin' && $locationIds->isEmpty(), fn ($query) => $query->whereRaw('1 = 0'))
            ->get();

        $locations = Location::with('currentStatus')
            ->when($user->role !== 'admin' && $user->location_id, fn ($query) => $query->where('id', $user->location_id))
            ->get();

        $resolvedStatuses = ['resolved', 'closed'];
        $closedStatuses = ['resolved', 'closed', 'rejected'];

        return response()->json([
            'scope' => $user->role === 'admin' ? 'admin' : 'user',
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'range' => $range,
            ],
            'totals' => [
                'consumers' => (int) $locations->sum('consumer_count'),
                'locations' => $locations->count(),
                'active_events' => $locations->filter(fn ($location) => (optional($location->currentStatus)->status ?? 'normal') !== 'normal')->count(),
                'avg_voltage' => (int) round($locations->avg(fn ($location) => optional($location->currentStatus)->voltage_level ?? 100) ?? 0),
                'open_complaints' => $complaints->whereNotIn('status', $closedStatuses)->count(),
                'resolved_complaints' => $complaints->whereIn('status', $resolvedStatuses)->count(),
                'average_rating' => round((float) FeedbackRating::whereIn('complaint_id', $complaints->pluck('id'))->avg('rating'), 1),
            ],
            'complaints_by_status' => $this->countBy($complaints, 'status'),
            'complaints_by_category' => $this->countBy($complaints, 'category'),
            'complaints_by_priority' => $this->countBy($complaints, 'priority'),
            'power_events_by_status' => $this->countBy($powerEvents, 'status'),
            'timeline' => $this->timeline($complaints, $range, $from, $to),
            'recent_complaints' => $complaints
                ->sortByDesc('created_at')
                ->take(8)
                ->values(),
            'recent_power_events' => $powerEvents
                ->sortByDesc('created_at')
                ->take(8)
                ->values(),
        ]);
    }

    private function countBy($items, string $key)
    {
        return $items
            ->groupBy($key)
            ->map(fn ($group) => $group->count())
            ->toArray();
    }

    private function timeline($complaints, string $range, Carbon $from, Carbon $to)
    {
        $format = $range === 'daily' ? 'Y-m-d' : 'Y-m';
        $labelFormat = $range === 'daily' ? 'd M' : 'M';
        $cursor = $from->copy();
        $rows = [];

        while ($cursor <= $to) {
            $key = $cursor->format($format);
            $rows[] = [
                'month' => $cursor->format($labelFormat),
                'period' => $key,
                'total' => $complaints->filter(fn ($complaint) => $complaint->created_at->format($format) === $key)->count(),
            ];
            $range === 'daily' ? $cursor->addDay() : $cursor->addMonth();
        }

        return $rows;
    }
}
