#include <iostream>
#include <fstream>
#include <chrono>
#include <thread>
#include <atomic>
#include <mutex>
#include <cstring>
#include <ctime>
#include <algorithm>
#include <vector>
#include <sys/stat.h>

// HTTP server (single header)
#include "deps/httplib.h"

// JSON library (single header)
#include "deps/json.hpp"

// Presage SDK headers
#ifdef PRESAGE_SDK_AVAILABLE
#include <smartspectra/container/foreground_container.hpp>
#include <smartspectra/container/settings.hpp>
#include <smartspectra/gui/opencv_hud.hpp>
#include <physiology/modules/messages/metrics.h>
#include <physiology/modules/messages/status.h>
#include <glog/logging.h>
#endif

#include <opencv2/opencv.hpp>

using json = nlohmann::json;

// Global state
std::atomic<bool> sdk_initialized{false};
std::atomic<bool> camera_running{false};
std::mutex vitals_mutex;
json latest_vitals;
std::string video_file_path = "";  // Path to uploaded video file

// Store all vitals readings for comprehensive analysis
std::vector<json> all_vitals_readings;
std::mutex vitals_readings_mutex;

// Check if camera device exists
bool check_camera_device(const std::string& device_path = "/dev/video0") {
    struct stat buffer;
    if (stat(device_path.c_str(), &buffer) != 0) {
        std::cerr << "Error: Camera device " << device_path << " not found!" << std::endl;
        return false;
    }
    return true;
}

// Calculate vitals summary statistics
json calculate_vitals_summary() {
    std::lock_guard<std::mutex> lock(vitals_readings_mutex);
    
    if (all_vitals_readings.empty()) {
        return json::object();
    }
    
    std::vector<float> heart_rates;
    std::vector<float> breathing_rates;
    
    // Extract all readings
    for (const auto& reading : all_vitals_readings) {
        if (reading.contains("heart_rate_bpm") && reading["heart_rate_bpm"].is_number()) {
            heart_rates.push_back(reading["heart_rate_bpm"]);
        }
        if (reading.contains("breathing_rate_bpm") && reading["breathing_rate_bpm"].is_number()) {
            breathing_rates.push_back(reading["breathing_rate_bpm"]);
        }
    }
    
    // Calculate statistics helper
    auto calc_stats = [](const std::vector<float>& values) -> json {
        if (values.empty()) {
            return json::object();
        }
        
        float sum = 0.0f;
        float min_val = values[0];
        float max_val = values[0];
        
        for (float v : values) {
            sum += v;
            min_val = std::min(min_val, v);
            max_val = std::max(max_val, v);
        }
        
        return {
            {"avg", sum / values.size()},
            {"min", min_val},
            {"max", max_val},
            {"count", values.size()}
        };
    };
    
    json summary = {
        {"heart_rate", calc_stats(heart_rates)},
        {"breathing_rate", calc_stats(breathing_rates)},
        {"readings_count", all_vitals_readings.size()},
        {"all_readings", all_vitals_readings}
    };
    
    return summary;
}

#ifdef PRESAGE_SDK_AVAILABLE
using namespace presage::smartspectra;

// Initialize Presage SDK
bool initialize_sdk(const std::string& api_key) {
    try {
        google::InitGoogleLogging("presage_engine");
        FLAGS_alsologtostderr = true;
        sdk_initialized = true;
        std::cout << "========================================" << std::endl;
        std::cout << "✓ Presage SmartSpectra SDK INITIALIZED" << std::endl;
        std::cout << "✓ Using SDK for vital sign extraction" << std::endl;
        std::cout << "========================================" << std::endl;
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Failed to initialize SDK: " << e.what() << std::endl;
        return false;
    }
}

// Run camera test for 10 seconds
void run_camera_test(const std::string& api_key) {
    // Clear previous readings at start
    {
        std::lock_guard<std::mutex> lock(vitals_readings_mutex);
        all_vitals_readings.clear();
    }
    
    // Check if we have a video file, otherwise check camera
    bool use_video_file = !video_file_path.empty();
    
    if (!use_video_file && !check_camera_device()) {
        std::cerr << "No video file uploaded and camera check failed. Cannot proceed." << std::endl;
        std::cerr << "Upload a video file first using POST /upload" << std::endl;
        return;
    }

    std::cout << "Starting video processing..." << std::endl;
    if (use_video_file) {
        std::cout << "Using video file: " << video_file_path << std::endl;
    } else {
        std::cout << "Using camera device" << std::endl;
    }
    camera_running = true;

    try {
        // Create settings
        container::settings::Settings<
            container::settings::OperationMode::Continuous,
            container::settings::IntegrationMode::Rest
        > settings;

        // Configure video source
        if (use_video_file) {
            // Use video file input
            settings.video_source.input_video_path = video_file_path;
            settings.video_source.device_index = -1;  // Disable camera
        } else {
            // Use camera
            settings.video_source.device_index = 0;
            settings.video_source.input_video_path = "";
        }
        
        settings.video_source.capture_width_px = 1280;
        settings.video_source.capture_height_px = 720;
        settings.video_source.codec = presage::camera::CaptureCodec::MJPG;
        settings.video_source.auto_lock = true;
        
        settings.headless = true;  // No GUI in server mode
        settings.enable_edge_metrics = true;
        settings.verbosity_level = 1;
        settings.continuous.preprocessed_data_buffer_duration_s = 0.5;
        settings.integration.api_key = api_key;

        // Create container
        auto container = std::make_unique<container::CpuContinuousRestForegroundContainer>(settings);

        // Metrics callback - store all readings from REAL Presage SDK
        auto status = container->SetOnCoreMetricsOutput(
            [](const presage::physiology::MetricsBuffer& metrics, int64_t timestamp) {
                std::lock_guard<std::mutex> lock(vitals_readings_mutex);
                
                json reading;
                reading["timestamp_ms"] = timestamp;
                reading["source"] = "presage_sdk";  
                
                // Extract heart rate from Presage SDK
                if (!metrics.pulse().rate().empty()) {
                    float pulse = metrics.pulse().rate().rbegin()->value();
                    reading["heart_rate_bpm"] = pulse;
                    std::cout << "[Presage SDK] Heart Rate: " << pulse << " BPM" << std::endl;
                }
                
                // Extract breathing rate from Presage SDK
                if (!metrics.breathing().rate().empty()) {
                    float breathing = metrics.breathing().rate().rbegin()->value();
                    reading["breathing_rate_bpm"] = breathing;
                    std::cout << "[Presage SDK] Breathing Rate: " << breathing << " breaths/min" << std::endl;
                }
                
                // Store this reading
                all_vitals_readings.push_back(reading);
                
                // Also update latest for /live endpoint
                {
                    std::lock_guard<std::mutex> lock2(vitals_mutex);
                    latest_vitals = reading;
                }
                
                return absl::OkStatus();
            }
        );

        if (!status.ok()) {
            std::cerr << "Failed to set metrics callback: " << status.message() << std::endl;
            camera_running = false;
            return;
        }

        // Status callback
        container->SetOnStatusChange(
            [](presage::physiology::StatusValue imaging_status) {
                std::cout << "Status: " << presage::physiology::GetStatusDescription(imaging_status.value()) << std::endl;
                return absl::OkStatus();
            }
        );

        // Initialize
        if (auto init_status = container->Initialize(); !init_status.ok()) {
            std::cerr << "Failed to initialize container: " << init_status.message() << std::endl;
            camera_running = false;
            return;
        }

        std::cout << "Video source initialized. Processing..." << std::endl;

        // Run processing in a separate thread
        std::thread run_thread([&container, use_video_file]() {
            container->Run();
        });

        if (use_video_file) {
            // For video files, let it process the entire video
            // Wait for thread to complete (video ends)
            run_thread.join();
        } else {
            // For camera, run for 10 seconds
            std::this_thread::sleep_for(std::chrono::seconds(10));
            // Note: Container will continue until video ends or is stopped
            run_thread.join();
        }

        std::cout << "Processing completed." << std::endl;
        camera_running = false;

    } catch (const std::exception& e) {
        std::cerr << "Error during camera test: " << e.what() << std::endl;
        camera_running = false;
    }
}

#else
// ERROR: SDK not available - fail explicitly
bool initialize_sdk(const std::string& api_key) {
    std::cerr << "========================================" << std::endl;
    std::cerr << "❌ ERROR: Presage SmartSpectra SDK NOT AVAILABLE" << std::endl;
    std::cerr << "❌ Application compiled without SDK support" << std::endl;
    std::cerr << "========================================" << std::endl;
    std::cerr << "To use the real Presage SDK:" << std::endl;
    std::cerr << "1. Install libsmartspectra-dev package" << std::endl;
    std::cerr << "2. Ensure SDK libraries are in /usr/lib or /usr/local/lib" << std::endl;
    std::cerr << "3. Rebuild the application" << std::endl;
    std::cerr << "========================================" << std::endl;
    sdk_initialized = false;
    return false;  // Fail initialization
}

void run_camera_test(const std::string& api_key) {
    std::cerr << "❌ ERROR: Cannot process video - Presage SDK not available" << std::endl;
    std::cerr << "Install the Presage SmartSpectra SDK to extract real vital signs" << std::endl;
    // Clear any stale data
    {
        std::lock_guard<std::mutex> lock(vitals_readings_mutex);
        all_vitals_readings.clear();
    }
    {
        std::lock_guard<std::mutex> lock2(vitals_mutex);
        latest_vitals = json::object();
    }
}
#endif

int main(int argc, char** argv) {
    // Get API key from environment or argument
    std::string api_key;
    if (argc > 1) {
        api_key = argv[1];
    } else if (const char* env_key = std::getenv("SMARTSPECTRA_API_KEY")) {
        api_key = env_key;
    } else if (const char* env_key = std::getenv("PRESAGE_API_KEY")) {
        api_key = env_key;
    } else {
        std::cerr << "Warning: No API key provided. Set SMARTSPECTRA_API_KEY or pass as argument." << std::endl;
        api_key = "";  // Continue anyway for testing
    }

    // Initialize SDK
    if (!initialize_sdk(api_key)) {
        std::cerr << "Failed to initialize SDK. Exiting." << std::endl;
        return 1;
    }

    // Check camera
    bool camera_available = check_camera_device();
    std::cout << "Camera device status: " << (camera_available ? "Available" : "Not Available") << std::endl;

    // Create HTTP server
    httplib::Server svr;

    // GET /status
    svr.Get("/status", [](const httplib::Request&, httplib::Response& res) {
#ifdef PRESAGE_SDK_AVAILABLE
        bool sdk_available = true;
        std::string sdk_status = "Presage SmartSpectra SDK is AVAILABLE and ACTIVE";
#else
        bool sdk_available = false;
        std::string sdk_status = "Presage SmartSpectra SDK is NOT AVAILABLE (compiled without SDK)";
#endif
        json response = {
            {"status", sdk_initialized.load() ? "SDK Ready" : "SDK Not Initialized"},
            {"sdk_available", sdk_available},
            {"sdk_status", sdk_status},
            {"sdk_initialized", sdk_initialized.load()},
            {"camera_running", camera_running.load()},
            {"camera_available", check_camera_device()},
            {"video_file_uploaded", !video_file_path.empty()},
            {"video_file_path", video_file_path.empty() ? "" : video_file_path},
            {"readings_count", all_vitals_readings.size()}
        };
        res.set_content(response.dump(), "application/json");
    });

    // POST /process-video - Upload video, process, and return vitals JSON
    svr.Post("/process-video", [api_key](const httplib::Request& req, httplib::Response& res) {
        if (camera_running.load()) {
            res.status = 409;
            json response = {{"error", "Processing already in progress. Wait for current processing to complete."}};
            res.set_content(response.dump(), "application/json");
            return;
        }
        
        // Check if we have file data in the request
        // Try multipart first, then fall back to raw body
        std::string file_content;
        bool has_file = false;
        
        // Try to get file from multipart (if available in this httplib version)
        // For now, accept raw binary data in request body
        if (!req.body.empty()) {
            file_content = req.body;
            has_file = true;
        }
        
        if (!has_file) {
            res.status = 400;
            json response = {
                {"error", "No video file provided"},
                {"hint", "Send video file as raw binary data in POST body, or use multipart/form-data"}
            };
            res.set_content(response.dump(), "application/json");
            return;
        }
        
        // Save uploaded video
        std::string upload_dir = "/app/uploads";
        std::string filename = "video_" + std::to_string(std::time(nullptr)) + ".mp4";
        std::string filepath = upload_dir + "/" + filename;
        
        // Create uploads directory if it doesn't exist
        system(("mkdir -p " + upload_dir).c_str());
        
        std::ofstream outfile(filepath, std::ios::binary);
        if (!outfile) {
            res.status = 500;
            json response = {{"error", "Failed to save uploaded file"}};
            res.set_content(response.dump(), "application/json");
            return;
        }
        
        outfile.write(file_content.data(), file_content.length());
        outfile.close();
        
        std::cout << "Video file saved: " << filepath << " (" << file_content.length() << " bytes)" << std::endl;
        
        // Clear previous readings
        {
            std::lock_guard<std::mutex> lock(vitals_readings_mutex);
            all_vitals_readings.clear();
        }
        
        // Update global video file path
        {
            std::lock_guard<std::mutex> lock(vitals_mutex);
            video_file_path = filepath;
        }
        
        // Process video synchronously using Presage SDK
        std::cout << "Processing video with Presage SmartSpectra SDK to extract REAL vitals..." << std::endl;
        run_camera_test(api_key);
        
        // Calculate and return vitals summary from SDK data
        json vitals_summary = calculate_vitals_summary();
        
        // Check if we got any data
        if (vitals_summary.empty() || vitals_summary["readings_count"] == 0) {
            res.status = 500;
            json error_response = {
                {"success", false},
                {"error", "No vitals data extracted from video"},
                {"message", "Presage SDK did not return any vital sign readings. Check video quality and ensure face is visible."},
                {"video_file", filename}
            };
            res.set_content(error_response.dump(), "application/json");
            return;
        }
        
        json response = {
            {"success", true},
            {"video_file", filename},
            {"vitals", vitals_summary},
            {"processing_complete", true},
            {"data_source", "presage_sdk"},
            {"note", "Vitals extracted using Presage SmartSpectra SDK"}
        };
        
        res.set_content(response.dump(), "application/json");
    });

    // POST /upload - Upload MP4 video file (legacy endpoint)
    svr.Post("/upload", [](const httplib::Request& req, httplib::Response& res) {
        if (camera_running.load()) {
            res.status = 409;  // Conflict
            json response = {{"error", "Processing already running. Wait for it to complete."}};
            res.set_content(response.dump(), "application/json");
            return;
        }

        // Accept file as raw binary data in request body
        if (!req.body.empty()) {
            // Save to /app/uploads directory
            std::string upload_dir = "/app/uploads";
            std::string filename = "video_" + std::to_string(std::time(nullptr)) + ".mp4";
            std::string filepath = upload_dir + "/" + filename;
            
            // Create uploads directory if it doesn't exist
            system(("mkdir -p " + upload_dir).c_str());
            
            // Write file
            std::ofstream outfile(filepath, std::ios::binary);
            if (!outfile) {
                res.status = 500;
                json response = {{"error", "Failed to save uploaded file"}};
                res.set_content(response.dump(), "application/json");
                return;
            }
            
            outfile.write(req.body.data(), req.body.length());
            outfile.close();
            
            // Update global video file path
            {
                std::lock_guard<std::mutex> lock(vitals_mutex);
                video_file_path = filepath;
            }
            
            json response = {
                {"message", "Video file uploaded successfully"},
                {"filename", filename},
                {"path", filepath},
                {"size_bytes", static_cast<int64_t>(req.body.length())}
            };
            res.set_content(response.dump(), "application/json");
            
        } else {
            res.status = 400;
            json response = {
                {"error", "No video file provided"},
                {"hint", "Send video file as raw binary data in POST body"}
            };
            res.set_content(response.dump(), "application/json");
        }
    });

    // GET /test - Run video processing (camera or uploaded video)
    svr.Get("/test", [api_key](const httplib::Request&, httplib::Response& res) {
        if (camera_running.load()) {
            res.status = 409;  // Conflict
            json response = {{"error", "Processing already running"}};
            res.set_content(response.dump(), "application/json");
            return;
        }

        // Check if video file is available
        std::string current_video_path;
        {
            std::lock_guard<std::mutex> lock(vitals_mutex);
            current_video_path = video_file_path;
        }

        std::string message;
        if (!current_video_path.empty()) {
            message = "Video file processing started. Processing entire video.";
        } else {
            message = "Camera test started. Will run for 10 seconds.";
        }

        // Run test in background thread
        std::thread test_thread([api_key]() {
            run_camera_test(api_key);
        });
        test_thread.detach();

        json response = {
            {"message", message},
            {"check_console", "Vital signs will be printed to console/stdout"},
            {"using_video_file", !current_video_path.empty()}
        };
        res.set_content(response.dump(), "application/json");
    });

    // GET /live - Get latest vitals
    svr.Get("/live", [](const httplib::Request&, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(vitals_mutex);
        if (latest_vitals.empty()) {
            json response = {
                {"message", "No vitals data available yet"},
                {"suggestion", "Call /test first to collect data"}
            };
            res.set_content(response.dump(), "application/json");
        } else {
            res.set_content(latest_vitals.dump(), "application/json");
        }
    });

    // Health check
    svr.Get("/health", [](const httplib::Request&, httplib::Response& res) {
        res.set_content("OK", "text/plain");
    });

    std::cout << "========================================" << std::endl;
    std::cout << "Presage Engine starting on port 8080..." << std::endl;
#ifdef PRESAGE_SDK_AVAILABLE
    std::cout << "✓ Using Presage SmartSpectra SDK" << std::endl;
#else
    std::cout << "❌ WARNING: Presage SDK not available" << std::endl;
#endif
    std::cout << "========================================" << std::endl;
    std::cout << "Endpoints:" << std::endl;
    std::cout << "  GET /status - Check SDK status" << std::endl;
    std::cout << "  POST /process-video - Upload video, process with SDK, return vitals JSON" << std::endl;
    std::cout << "  POST /upload - Upload MP4 video file" << std::endl;
    std::cout << "  GET /test - Run video processing (uses uploaded video or camera)" << std::endl;
    std::cout << "  GET /live - Get latest vitals data from SDK" << std::endl;
    std::cout << "  GET /health - Health check" << std::endl;
    std::cout << "========================================" << std::endl;

    // Start server
    if (!svr.listen("0.0.0.0", 8080)) {
        std::cerr << "Failed to start server on port 8080" << std::endl;
        return 1;
    }

    return 0;
}
