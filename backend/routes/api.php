<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\PowerStatusController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/locations', [LocationController::class, 'index']);
Route::get('/power-statuses', [PowerStatusController::class, 'index']);

Route::middleware('auth:api')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);

    Route::apiResource('complaints', ComplaintController::class);
    Route::post('/complaints/{complaint}/rate', [ComplaintController::class, 'rate']);

    Route::middleware('admin')->group(function () {
        Route::apiResource('locations', LocationController::class)->except(['index', 'show']);
        Route::apiResource('power-statuses', PowerStatusController::class)->except(['index', 'show']);
        Route::get('/admin/analytics', [AdminController::class, 'analytics']);
        Route::get('/admin/users', [AdminController::class, 'users']);
        Route::post('/admin/users', [AdminController::class, 'storeUser']);
        Route::put('/admin/users/{user}', [AdminController::class, 'updateUser']);
        Route::get('/admin/notifications', [AdminController::class, 'notifications']);
        Route::post('/admin/notifications', [AdminController::class, 'storeNotification']);
        Route::get('/admin/reports', [AdminController::class, 'report']);
    });
});
