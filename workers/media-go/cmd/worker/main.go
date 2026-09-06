package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type workerConfig struct {
	apiBaseURL       string
	secret           string
	pollSeconds      int
	enableProcessing bool
}

type workerClient struct {
	baseURL    string
	secret     string
	httpClient *http.Client
}

type claimResponse struct {
	Data struct {
		Claimed bool       `json:"claimed"`
		Job     *workerJob `json:"job"`
	} `json:"data"`
}

type workerJob struct {
	ID         string            `json:"id"`
	Status     string            `json:"status"`
	Task       workerTask        `json:"task"`
	InputFiles []workerInputFile `json:"inputFiles"`
}

type workerTask struct {
	Tool         string         `json:"tool"`
	Engine       string         `json:"engine"`
	OutputFormat string         `json:"output_format"`
	Options      map[string]any `json:"options"`
}

type workerInputFile struct {
	ID          string `json:"id"`
	FileName    string `json:"fileName"`
	MimeType    string `json:"mimeType"`
	Size        int64  `json:"size"`
	DownloadURL string `json:"downloadUrl"`
}

type apiErrorResponse struct {
	Error string `json:"error"`
}

type downloadedInput struct {
	fileName string
	mimeType string
	content  []byte
}

type convertedOutput struct {
	fileName string
	mimeType string
	content  []byte
}

func main() {
	config := loadConfig()
	logger := log.New(os.Stdout, "media-worker ", log.LstdFlags|log.Lmsgprefix)

	if config.secret == "" {
		logger.Println("CONVERSION_WORKER_SECRET is empty; worker endpoint calls will fail in production.")
	}

	logger.Printf("starting media worker api=%s poll=%ds enabled=%t", config.apiBaseURL, config.pollSeconds, config.enableProcessing)
	run(context.Background(), config, logger)
}

func loadConfig() workerConfig {
	return workerConfig{
		apiBaseURL:       strings.TrimRight(envOrDefault("CONVERSION_API_BASE_URL", "http://localhost:3000"), "/"),
		secret:           os.Getenv("CONVERSION_WORKER_SECRET"),
		pollSeconds:      readPositiveIntEnv("MEDIA_WORKER_POLL_SECONDS", 5),
		enableProcessing: readBoolEnv("MEDIA_WORKER_ENABLE_PROCESSING", false),
	}
}

func run(ctx context.Context, config workerConfig, logger *log.Logger) {
	ticker := time.NewTicker(time.Duration(config.pollSeconds) * time.Second)
	defer ticker.Stop()

	for {
		if err := processNextJob(ctx, config, logger); err != nil {
			logger.Printf("job processing check failed: %v", err)
		}

		select {
		case <-ctx.Done():
			logger.Println("stopping media worker")
			return
		case <-ticker.C:
		}
	}
}

func processNextJob(ctx context.Context, config workerConfig, logger *log.Logger) error {
	if !config.enableProcessing {
		return nil
	}

	client := newWorkerClient(config)
	job, err := client.claimNextJob(ctx)
	if err != nil {
		return err
	}

	if job == nil {
		return nil
	}

	logger.Printf("claimed job id=%s tool=%s engine=%s output=%s", job.ID, job.Task.Tool, job.Task.Engine, job.Task.OutputFormat)

	if err := processMediaJob(ctx, client, job); err != nil {
		if failErr := client.failJob(ctx, job.ID, err.Error()); failErr != nil {
			return fmt.Errorf("%w; failed to mark job failed: %v", err, failErr)
		}

		return err
	}

	return nil
}

func processMediaJob(ctx context.Context, client workerClient, job *workerJob) error {
	if job.Task.Engine != "ffmpeg" {
		return fmt.Errorf("unsupported media engine %q", job.Task.Engine)
	}

	if job.Task.Tool != "audio" && job.Task.Tool != "video" {
		return fmt.Errorf("unsupported media tool %q", job.Task.Tool)
	}

	if len(job.InputFiles) != 1 {
		return fmt.Errorf("media worker expects exactly one input file")
	}

	input, err := client.downloadInput(ctx, job.InputFiles[0])
	if err != nil {
		return err
	}

	output, err := convertWithFFmpeg(ctx, job, input)
	if err != nil {
		return err
	}

	return client.completeJob(ctx, job.ID, output)
}

func newWorkerClient(config workerConfig) workerClient {
	return workerClient{
		baseURL: config.apiBaseURL,
		secret:  config.secret,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (client workerClient) claimNextJob(ctx context.Context) (*workerJob, error) {
	payload, err := json.Marshal(map[string][]string{
		"tools": []string{"audio", "video"},
	})
	if err != nil {
		return nil, err
	}

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		client.baseURL+"/api/v1/workers/claim",
		bytes.NewReader(payload),
	)
	if err != nil {
		return nil, err
	}

	request.Header.Set("Content-Type", "application/json")
	client.authorize(request)

	var response claimResponse
	if err := client.doJSON(request, &response); err != nil {
		return nil, err
	}

	if !response.Data.Claimed {
		return nil, nil
	}

	return response.Data.Job, nil
}

func (client workerClient) downloadInput(ctx context.Context, file workerInputFile) (downloadedInput, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, client.baseURL+file.DownloadURL, nil)
	if err != nil {
		return downloadedInput{}, err
	}

	client.authorize(request)

	response, err := client.httpClient.Do(request)
	if err != nil {
		return downloadedInput{}, err
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return downloadedInput{}, err
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var apiError apiErrorResponse
		if err := json.Unmarshal(body, &apiError); err == nil && apiError.Error != "" {
			return downloadedInput{}, fmt.Errorf("input download returned %d: %s", response.StatusCode, apiError.Error)
		}

		return downloadedInput{}, fmt.Errorf("input download returned %d", response.StatusCode)
	}

	return downloadedInput{
		fileName: safeFileName(file.FileName),
		mimeType: file.MimeType,
		content:  body,
	}, nil
}

func (client workerClient) completeJob(ctx context.Context, jobID string, output convertedOutput) error {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("files", output.fileName)
	if err != nil {
		return err
	}

	if _, err := part.Write(output.content); err != nil {
		return err
	}

	if err := writer.Close(); err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		client.baseURL+"/api/v1/workers/jobs/"+jobID+"/outputs",
		&body,
	)
	if err != nil {
		return err
	}

	request.Header.Set("Content-Type", writer.FormDataContentType())
	client.authorize(request)

	var response map[string]any
	return client.doJSON(request, &response)
}

func (client workerClient) failJob(ctx context.Context, jobID string, message string) error {
	payload, err := json.Marshal(map[string]string{
		"error": message,
	})
	if err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		client.baseURL+"/api/v1/workers/jobs/"+jobID+"/fail",
		bytes.NewReader(payload),
	)
	if err != nil {
		return err
	}

	request.Header.Set("Content-Type", "application/json")
	client.authorize(request)

	var response map[string]any
	return client.doJSON(request, &response)
}

func (client workerClient) authorize(request *http.Request) {
	if client.secret != "" {
		request.Header.Set("Authorization", "Bearer "+client.secret)
	}
}

func (client workerClient) doJSON(request *http.Request, target any) error {
	response, err := client.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return err
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var apiError apiErrorResponse
		if err := json.Unmarshal(body, &apiError); err == nil && apiError.Error != "" {
			return fmt.Errorf("api returned %d: %s", response.StatusCode, apiError.Error)
		}

		return fmt.Errorf("api returned %d", response.StatusCode)
	}

	if target == nil {
		return nil
	}

	return json.Unmarshal(body, target)
}

func convertWithFFmpeg(ctx context.Context, job *workerJob, input downloadedInput) (convertedOutput, error) {
	tempDir, err := os.MkdirTemp("", "convertiva-media-*")
	if err != nil {
		return convertedOutput{}, err
	}
	defer os.RemoveAll(tempDir)

	inputPath := filepath.Join(tempDir, input.fileName)
	outputFormat := strings.ToLower(strings.TrimSpace(job.Task.OutputFormat))
	outputName := outputFileName(input.fileName, outputFormat)
	outputPath := filepath.Join(tempDir, outputName)

	if err := os.WriteFile(inputPath, input.content, 0600); err != nil {
		return convertedOutput{}, err
	}

	args, err := buildFFmpegArgs(job, inputPath, outputPath)
	if err != nil {
		return convertedOutput{}, err
	}

	command := exec.CommandContext(ctx, "ffmpeg", args...)
	output, err := command.CombinedOutput()
	if err != nil {
		return convertedOutput{}, fmt.Errorf("ffmpeg failed: %s", trimCommandOutput(output))
	}

	content, err := os.ReadFile(outputPath)
	if err != nil {
		return convertedOutput{}, err
	}

	if len(content) == 0 {
		return convertedOutput{}, fmt.Errorf("ffmpeg produced an empty output")
	}

	return convertedOutput{
		fileName: outputName,
		mimeType: outputMimeType(job.Task.Tool, outputFormat),
		content:  content,
	}, nil
}

func buildFFmpegArgs(job *workerJob, inputPath string, outputPath string) ([]string, error) {
	args := []string{"-hide_banner", "-y"}
	args = appendTrimArgs(args, job.Task.Options)
	args = append(args, "-i", inputPath)

	switch job.Task.Tool {
	case "audio":
		args = appendAudioArgs(args, job.Task)
	case "video":
		args = appendVideoArgs(args, job.Task)
	default:
		return nil, fmt.Errorf("unsupported media tool %q", job.Task.Tool)
	}

	args = append(args, outputPath)
	return args, nil
}

func appendTrimArgs(args []string, options map[string]any) []string {
	if value := stringOption(options, "trimStart"); value != "" {
		args = append(args, "-ss", value)
	}

	if value := stringOption(options, "trimEnd"); value != "" {
		args = append(args, "-to", value)
	}

	return args
}

func appendAudioArgs(args []string, task workerTask) []string {
	if codec, ok := audioCodecArg(task.OutputFormat); ok {
		args = append(args, "-c:a", codec)
	}

	if bitrate := stringOption(task.Options, "bitrate"); bitrate != "" && bitrate != "auto" {
		args = append(args, "-b:a", bitrate+"k")
	}

	if sampleRate := stringOption(task.Options, "sampleRate"); sampleRate != "" && sampleRate != "auto" {
		args = append(args, "-ar", sampleRate)
	}

	if channels := stringOption(task.Options, "channels"); channels == "mono" {
		args = append(args, "-ac", "1")
	} else if channels == "stereo" {
		args = append(args, "-ac", "2")
	}

	if boolOption(task.Options, "normalizeVolume") {
		args = append(args, "-af", "loudnorm")
	}

	return args
}

func appendVideoArgs(args []string, task workerTask) []string {
	if boolOption(task.Options, "removeAudio") {
		args = append(args, "-an")
	} else if codec, ok := videoAudioCodecArg(stringOption(task.Options, "audioCodec")); ok {
		args = append(args, "-c:a", codec)
	}

	if codec, ok := videoCodecArg(task.OutputFormat, stringOption(task.Options, "videoCodec")); ok {
		args = append(args, "-c:v", codec)
	}

	if scale, ok := resolutionScaleArg(stringOption(task.Options, "resolution")); ok {
		args = append(args, "-vf", scale)
	}

	if crf, ok := videoQualityCRF(stringOption(task.Options, "quality")); ok {
		args = append(args, "-crf", crf)
	}

	return args
}

func audioCodecArg(format string) (string, bool) {
	switch strings.ToLower(format) {
	case "aac", "m4a", "m4b":
		return "aac", true
	case "mp3":
		return "libmp3lame", true
	case "flac":
		return "flac", true
	case "oga", "opus":
		return "libopus", true
	case "wav":
		return "pcm_s16le", true
	case "wma":
		return "wmav2", true
	default:
		return "", false
	}
}

func videoCodecArg(format string, requested string) (string, bool) {
	switch requested {
	case "h264":
		return "libx264", true
	case "h265":
		return "libx265", true
	case "vp9":
		return "libvpx-vp9", true
	case "av1":
		return "libaom-av1", true
	}

	switch strings.ToLower(format) {
	case "webm":
		return "libvpx-vp9", true
	default:
		return "libx264", true
	}
}

func videoAudioCodecArg(requested string) (string, bool) {
	switch requested {
	case "aac":
		return "aac", true
	case "mp3":
		return "libmp3lame", true
	case "opus":
		return "libopus", true
	case "vorbis":
		return "libvorbis", true
	default:
		return "", false
	}
}

func resolutionScaleArg(resolution string) (string, bool) {
	switch resolution {
	case "480p":
		return "scale=-2:480", true
	case "720p":
		return "scale=-2:720", true
	case "1080p":
		return "scale=-2:1080", true
	case "1440p":
		return "scale=-2:1440", true
	case "4k":
		return "scale=-2:2160", true
	default:
		return "", false
	}
}

func videoQualityCRF(quality string) (string, bool) {
	switch quality {
	case "low":
		return "32", true
	case "medium":
		return "26", true
	case "high":
		return "20", true
	default:
		return "", false
	}
}

func stringOption(options map[string]any, name string) string {
	value, ok := options[name].(string)
	if !ok {
		return ""
	}

	return strings.TrimSpace(value)
}

func boolOption(options map[string]any, name string) bool {
	value, ok := options[name].(bool)
	return ok && value
}

func safeFileName(fileName string) string {
	base := filepath.Base(fileName)
	base = strings.TrimSpace(base)
	if base == "." || base == string(filepath.Separator) || base == "" {
		return "input"
	}

	return base
}

func outputFileName(inputName string, format string) string {
	base := strings.TrimSuffix(safeFileName(inputName), filepath.Ext(inputName))
	if base == "" {
		base = "converted"
	}

	return base + "." + format
}

func outputMimeType(tool string, format string) string {
	if tool == "audio" {
		switch format {
		case "mp3":
			return "audio/mpeg"
		case "wav":
			return "audio/wav"
		case "flac":
			return "audio/flac"
		case "m4a", "aac":
			return "audio/aac"
		case "opus":
			return "audio/opus"
		default:
			return "audio/" + format
		}
	}

	switch format {
	case "mp4", "m4v":
		return "video/mp4"
	case "mov":
		return "video/quicktime"
	case "webm":
		return "video/webm"
	default:
		return "video/" + format
	}
}

func trimCommandOutput(output []byte) string {
	value := strings.TrimSpace(string(output))
	if len(value) > 500 {
		return value[:500]
	}

	if value == "" {
		return "no ffmpeg output"
	}

	return value
}

func envOrDefault(name string, fallback string) string {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}

	return value
}

func readPositiveIntEnv(name string, fallback int) int {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return fallback
	}

	return parsed
}

func readBoolEnv(name string, fallback bool) bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(name)))
	if value == "" {
		return fallback
	}

	return value == "1" || value == "true" || value == "yes"
}
