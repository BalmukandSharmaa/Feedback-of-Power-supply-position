<?php

namespace Database\Seeders;

use App\Models\Complaint;
use App\Models\Location;
use App\Models\Notification;
use App\Models\PowerStatus;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $locations = collect([
            ['name' => 'Civil Lines', 'zone' => 'North', 'feeder_code' => 'N-FDR-101', 'substation' => 'North Grid', 'consumer_count' => 12400],
            ['name' => 'Model Town', 'zone' => 'North', 'feeder_code' => 'N-FDR-204', 'substation' => 'Ring Substation', 'consumer_count' => 9800],
            ['name' => 'Industrial Area', 'zone' => 'East', 'feeder_code' => 'E-FDR-317', 'substation' => 'Plant Yard', 'consumer_count' => 14250],
            ['name' => 'Green Park', 'zone' => 'South', 'feeder_code' => 'S-FDR-088', 'substation' => 'Lake Substation', 'consumer_count' => 7600],
            ['name' => 'Railway Colony', 'zone' => 'West', 'feeder_code' => 'W-FDR-512', 'substation' => 'Central Yard', 'consumer_count' => 6350],
        ])->map(fn ($data) => Location::create($data));

        $admin = User::create([
            'name' => 'Admin Officer',
            'email' => 'admin@power.test',
            'phone' => '9000000001',
            'role' => 'admin',
            'location_id' => $locations->first()->id,
            'password' => Hash::make('password123'),
        ]);

        $user = User::create([
            'name' => 'Demo Consumer',
            'email' => 'user@power.test',
            'phone' => '9000000002',
            'role' => 'user',
            'location_id' => $locations->get(1)->id,
            'password' => Hash::make('password123'),
        ]);

        $statuses = ['normal', 'outage', 'low_voltage', 'maintenance', 'restoring'];
        foreach ($locations as $index => $location) {
            PowerStatus::create([
                'location_id' => $location->id,
                'status' => $statuses[$index],
                'voltage_level' => [100, 0, 72, 0, 88][$index],
                'reason' => [
                    'Supply is stable across the feeder.',
                    '11KV feeder tripped, field team dispatched.',
                    'Voltage fluctuation due to peak load.',
                    'Scheduled transformer maintenance.',
                    'Restoration work is in final testing.',
                ][$index],
                'started_at' => $index === 0 ? null : now()->subHours($index + 1),
                'estimated_restoration_at' => $index === 0 ? null : now()->addHours($index + 1),
                'updated_by' => $admin->id,
            ]);
        }

        $complaints = [
            ['category' => 'power_cut', 'priority' => 'critical', 'status' => 'in_progress', 'title' => 'Complete outage in lane 4', 'description' => 'No electricity since early morning.', 'location_id' => $locations->get(1)->id],
            ['category' => 'low_voltage', 'priority' => 'high', 'status' => 'approved', 'title' => 'Low voltage at evening peak', 'description' => 'Fans and appliances are running very slow.', 'location_id' => $locations->get(2)->id],
            ['category' => 'transformer_fault', 'priority' => 'critical', 'status' => 'resolved', 'title' => 'Transformer sparking', 'description' => 'Transformer near gate produced sparks.', 'location_id' => $locations->get(3)->id],
        ];

        foreach ($complaints as $index => $data) {
            $complaint = Complaint::create($data + [
                'ticket_no' => 'PWR-' . now()->format('ymd') . '-D' . ($index + 101),
                'user_id' => $user->id,
                'assigned_to' => $admin->id,
                'address' => 'House ' . (20 + $index) . ', Main Road',
                'resolved_at' => $data['status'] === 'resolved' ? now()->subHour() : null,
            ]);

            $complaint->updates()->create([
                'user_id' => $admin->id,
                'status' => $complaint->status,
                'note' => 'Initial workflow update recorded.',
            ]);
        }

        Notification::create([
            'location_id' => $locations->get(1)->id,
            'title' => 'Restoration expected soon',
            'message' => 'Repair work is underway. Estimated restoration is within 2 hours.',
            'type' => 'restoration',
            'scheduled_at' => now(),
        ]);
    }
}
